"""Orquestração do pipeline de importação (seção 5 da especificação):

recebimento → identificação do formato → extração → limpeza/normalização →
deduplicação → categorização → persistência → pós-processos (possíveis
duplicidades e transferências internas espelhadas).

O mesmo caminho atende a pré-visualização (``persistir=False``): o usuário
confirma o que será gravado antes de gravar.
"""

import hashlib
from dataclasses import dataclass, field
from datetime import timedelta

from sqlalchemy.orm import Session

from app.config import settings
from app.logging_conf import get_logger
from app.models import ArquivoImportado, ContaBancaria, Empresa, Transacao, Usuario
from app.parsers import detectar_formato, get_parser
from app.parsers.base import ErroParser, LinhaRejeitada
from app.services import audit
from app.services.categorization import (
    carregar_regras,
    categorizar,
    obter_categoria_a_classificar,
)
from app.services.dedup import atribuir_hashes
from app.services.normalization import ErroNormalizacao, normalizar_transacao

logger = get_logger(__name__)

PREVIEW_MAX_LINHAS = 100


class ErroImportacao(Exception):
    pass


@dataclass
class ResumoImportacao:
    formato: str
    total_linhas: int
    novas: int
    duplicadas: int
    rejeitadas: list[dict] = field(default_factory=list)
    periodo_inicio: str | None = None
    periodo_fim: str | None = None
    pendentes_revisao: int = 0
    arquivo_id: str | None = None
    preview: list[dict] = field(default_factory=list)


def processar_extrato(
    db: Session,
    empresa: Empresa,
    conta: ContaBancaria,
    usuario: Usuario,
    nome_arquivo: str,
    conteudo: bytes,
    persistir: bool = True,
    mapeamento: dict | None = None,
) -> ResumoImportacao:
    if not conteudo:
        raise ErroImportacao("Arquivo vazio.")
    if len(conteudo) > settings.upload_max_bytes:
        raise ErroImportacao(
            f"Arquivo excede o limite de {settings.upload_max_bytes // (1024 * 1024)} MB."
        )

    hash_arquivo = hashlib.sha256(conteudo).hexdigest()
    if persistir:
        ja_importado = (
            db.query(ArquivoImportado)
            .filter_by(conta_id=conta.id, hash_sha256=hash_arquivo, status="concluido")
            .first()
        )
        if ja_importado:
            raise ErroImportacao(
                "Este arquivo já foi importado nesta conta "
                f"em {ja_importado.criado_em:%d/%m/%Y}."
            )

    try:
        formato = detectar_formato(nome_arquivo, conteudo)
        extracao = get_parser(formato)(conteudo, mapeamento)
    except ErroParser as exc:
        raise ErroImportacao(str(exc)) from exc

    normalizadas, rejeitadas = [], list(extracao.rejeitadas)
    for bruta in extracao.transacoes:
        try:
            normalizadas.append(normalizar_transacao(bruta))
        except ErroNormalizacao as exc:
            rejeitadas.append(LinhaRejeitada(bruta.linha_origem, str(exc)))

    if not normalizadas:
        raise ErroImportacao(
            "Nenhuma transação válida encontrada no arquivo. "
            f"Linhas rejeitadas: {len(rejeitadas)}."
        )

    hashes = atribuir_hashes(conta.id, normalizadas)
    existentes: set[str] = set()
    for i in range(0, len(hashes), 500):  # respeita o limite de parâmetros do SQLite
        existentes.update(
            h
            for (h,) in db.query(Transacao.hash_dedup).filter(
                Transacao.conta_id == conta.id,
                Transacao.hash_dedup.in_(hashes[i : i + 500]),
            )
        )

    regras = carregar_regras(db, empresa.id)
    fallback = obter_categoria_a_classificar(db)
    categorias_por_id = {}

    novas, duplicadas = [], 0
    for transacao, h in zip(normalizadas, hashes):
        if h in existentes:
            duplicadas += 1
            continue
        resultado = categorizar(transacao, regras, fallback.id)
        novas.append((transacao, h, resultado))

    datas = [t.data for t in normalizadas]
    resumo = ResumoImportacao(
        formato=formato,
        total_linhas=len(normalizadas) + len(rejeitadas),
        novas=len(novas),
        duplicadas=duplicadas,
        rejeitadas=[{"linha": r.linha, "motivo": r.motivo} for r in rejeitadas],
        periodo_inicio=min(datas).isoformat(),
        periodo_fim=max(datas).isoformat(),
        pendentes_revisao=sum(
            1 for _, _, r in novas if r.status_revisao == "pendente_revisao"
        ),
    )

    for regra in regras:
        categorias_por_id[regra.categoria_id] = regra.categoria.nome
    categorias_por_id[fallback.id] = fallback.nome

    resumo.preview = [
        {
            "linha_origem": t.linha_origem,
            "data": t.data.isoformat(),
            "descricao": t.descricao_normalizada,
            "valor_centavos": t.valor_centavos,
            "tipo": r.tipo,
            "categoria": categorias_por_id.get(r.categoria_id, ""),
            "confianca": r.confianca,
            "status_revisao": r.status_revisao,
        }
        for t, _, r in novas[:PREVIEW_MAX_LINHAS]
    ]

    if not persistir:
        return resumo

    arquivo = ArquivoImportado(
        empresa_id=empresa.id,
        conta_id=conta.id,
        usuario_id=usuario.id,
        nome_original=nome_arquivo,
        formato=formato,
        hash_sha256=hash_arquivo,
        status="concluido",
        periodo_inicio=min(datas),
        periodo_fim=max(datas),
        total_linhas=resumo.total_linhas,
        linhas_importadas=len(novas),
        linhas_duplicadas=duplicadas,
        linhas_rejeitadas=len(rejeitadas),
        rejeicoes="; ".join(f"linha {r.linha}: {r.motivo}" for r in rejeitadas) or None,
    )
    db.add(arquivo)
    db.flush()

    registros = [
        Transacao(
            empresa_id=empresa.id,
            conta_id=conta.id,
            arquivo_id=arquivo.id,
            linha_origem=t.linha_origem,
            data_transacao=t.data,
            descricao_original=t.descricao_original,
            descricao_normalizada=t.descricao_normalizada,
            valor_centavos=t.valor_centavos,
            tipo=r.tipo,
            categoria_id=r.categoria_id,
            confianca=r.confianca,
            metodo_categorizacao=r.metodo,
            status_revisao=r.status_revisao,
            saldo_apos_centavos=t.saldo_centavos,
            hash_dedup=h,
        )
        for t, h, r in novas
    ]
    db.add_all(registros)
    db.flush()

    _marcar_possiveis_duplicidades(db, arquivo, registros)
    _marcar_transferencias_internas(db, empresa, registros)

    db.commit()
    resumo.arquivo_id = arquivo.id
    audit.registrar(
        db, "importacao", usuario.id, empresa.id, "arquivo_importado", arquivo.id
    )
    logger.info(
        "Importação concluída: arquivo=%s formato=%s novas=%d duplicadas=%d rejeitadas=%d",
        arquivo.id, formato, len(novas), duplicadas, len(rejeitadas),
    )
    return resumo


def _marcar_possiveis_duplicidades(
    db: Session, arquivo: ArquivoImportado, registros: list[Transacao]
) -> None:
    """Mesmo valor + mesma descrição em datas próximas, vindo de outro
    arquivo: sinaliza — nunca descarta — para decisão humana."""
    janela = timedelta(days=settings.janela_duplicidade_dias)
    for t in registros:
        parecida = (
            db.query(Transacao.id)
            .filter(
                Transacao.conta_id == t.conta_id,
                Transacao.arquivo_id != arquivo.id,
                Transacao.valor_centavos == t.valor_centavos,
                Transacao.descricao_normalizada == t.descricao_normalizada,
                Transacao.data_transacao >= t.data_transacao - janela,
                Transacao.data_transacao <= t.data_transacao + janela,
            )
            .first()
        )
        if parecida:
            t.possivel_duplicidade = True


def _marcar_transferencias_internas(
    db: Session, empresa: Empresa, registros: list[Transacao]
) -> None:
    """Valores espelhados (−X / +X) entre contas da mesma empresa em janela
    curta: marca ambos como transferência interna (fora do resultado)."""
    janela = timedelta(days=settings.janela_duplicidade_dias)
    for t in registros:
        if t.tipo != "transferencia":
            continue
        espelho = (
            db.query(Transacao)
            .filter(
                Transacao.empresa_id == empresa.id,
                Transacao.conta_id != t.conta_id,
                Transacao.valor_centavos == -t.valor_centavos,
                Transacao.tipo == "transferencia",
                Transacao.data_transacao >= t.data_transacao - janela,
                Transacao.data_transacao <= t.data_transacao + janela,
                Transacao.contraparte_interna.is_(False),
            )
            .first()
        )
        if espelho:
            t.contraparte_interna = True
            espelho.contraparte_interna = True
