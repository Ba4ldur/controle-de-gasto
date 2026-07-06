"""Rotas de dados, sempre no escopo /api/empresas/{empresa_id}.

``require_empresa`` valida o vínculo usuário↔empresa em toda rota; recurso
de outra empresa responde 404. A descrição original das transações nunca é
serializada — apenas a normalizada (mascarada na ingestão).
"""

import json
from datetime import date

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_empresa
from app.db import get_db
from app.masking import mascarar
from app.models import (
    ArquivoImportado,
    Categoria,
    ContaBancaria,
    CorrecaoUsuario,
    Empresa,
    RegraCategorizacao,
    Transacao,
    Usuario,
)
from app.services import audit, reports
from app.services.importer import ErroImportacao, processar_extrato

router = APIRouter(prefix="/api/empresas/{empresa_id}", tags=["dados"])


# ---------- contas bancárias ----------


class ContaIn(BaseModel):
    banco: str
    apelido: str
    conta_mascarada: str | None = None


@router.get("/contas")
def listar_contas(
    empresa: Empresa = Depends(require_empresa), db: Session = Depends(get_db)
):
    contas = db.query(ContaBancaria).filter_by(empresa_id=empresa.id, ativa=True).all()
    return [
        {
            "id": c.id,
            "banco": c.banco,
            "apelido": c.apelido,
            "conta_mascarada": c.conta_mascarada,
        }
        for c in contas
    ]


@router.post("/contas", status_code=201)
def criar_conta(
    dados: ContaIn,
    empresa: Empresa = Depends(require_empresa),
    db: Session = Depends(get_db),
):
    conta = ContaBancaria(
        empresa_id=empresa.id,
        banco=dados.banco.strip(),
        apelido=dados.apelido.strip(),
        # Defensivo: se vier número completo de conta, mascara antes de gravar.
        conta_mascarada=mascarar(dados.conta_mascarada or "") or None,
    )
    db.add(conta)
    db.commit()
    return {"id": conta.id}


# ---------- categorias ----------


@router.get("/categorias")
def listar_categorias(
    empresa: Empresa = Depends(require_empresa), db: Session = Depends(get_db)
):
    categorias = (
        db.query(Categoria)
        .filter(
            (Categoria.empresa_id == empresa.id) | (Categoria.empresa_id.is_(None))
        )
        .order_by(Categoria.tipo, Categoria.nome)
        .all()
    )
    return [
        {
            "id": c.id,
            "nome": c.nome,
            "tipo": c.tipo,
            "fora_do_resultado": c.fora_do_resultado,
            "global": c.empresa_id is None,
        }
        for c in categorias
    ]


# ---------- importações ----------


def _conta_da_empresa(db: Session, empresa: Empresa, conta_id: str) -> ContaBancaria:
    conta = db.query(ContaBancaria).filter_by(id=conta_id, empresa_id=empresa.id).one_or_none()
    if conta is None:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return conta


def _mapeamento(raw: str | None) -> dict | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Mapeamento de colunas inválido")


async def _importar(
    db, empresa, usuario, arquivo: UploadFile, conta_id: str,
    mapeamento: str | None, persistir: bool,
):
    conta = _conta_da_empresa(db, empresa, conta_id)
    conteudo = await arquivo.read()
    try:
        resumo = processar_extrato(
            db,
            empresa,
            conta,
            usuario,
            arquivo.filename or "extrato",
            conteudo,
            persistir=persistir,
            mapeamento=_mapeamento(mapeamento),
        )
    except ErroImportacao as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return resumo


@router.post("/importacoes/preview")
async def preview_importacao(
    arquivo: UploadFile,
    conta_id: str = Form(...),
    mapeamento: str | None = Form(None),
    empresa: Empresa = Depends(require_empresa),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await _importar(db, empresa, usuario, arquivo, conta_id, mapeamento, False)


@router.post("/importacoes", status_code=201)
async def importar_extrato(
    arquivo: UploadFile,
    conta_id: str = Form(...),
    mapeamento: str | None = Form(None),
    empresa: Empresa = Depends(require_empresa),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await _importar(db, empresa, usuario, arquivo, conta_id, mapeamento, True)


@router.get("/importacoes")
def listar_importacoes(
    empresa: Empresa = Depends(require_empresa), db: Session = Depends(get_db)
):
    arquivos = (
        db.query(ArquivoImportado)
        .filter_by(empresa_id=empresa.id)
        .order_by(ArquivoImportado.criado_em.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "nome_original": a.nome_original,
            "formato": a.formato,
            "status": a.status,
            "conta_id": a.conta_id,
            "periodo_inicio": a.periodo_inicio.isoformat() if a.periodo_inicio else None,
            "periodo_fim": a.periodo_fim.isoformat() if a.periodo_fim else None,
            "total_linhas": a.total_linhas,
            "linhas_importadas": a.linhas_importadas,
            "linhas_duplicadas": a.linhas_duplicadas,
            "linhas_rejeitadas": a.linhas_rejeitadas,
            "rejeicoes": a.rejeicoes,
            "criado_em": a.criado_em.isoformat(),
        }
        for a in arquivos
    ]


# ---------- transações ----------


def _transacao_para_dict(t: Transacao) -> dict:
    return {
        "id": t.id,
        "data": t.data_transacao.isoformat(),
        "descricao": t.descricao_normalizada,
        "valor_centavos": t.valor_centavos,
        "tipo": t.tipo,
        "categoria_id": t.categoria_id,
        "categoria": t.categoria.nome if t.categoria else None,
        "confianca": t.confianca,
        "metodo_categorizacao": t.metodo_categorizacao,
        "status_revisao": t.status_revisao,
        "contraparte_interna": t.contraparte_interna,
        "possivel_duplicidade": t.possivel_duplicidade,
        "saldo_apos_centavos": t.saldo_apos_centavos,
        "conta_id": t.conta_id,
        "arquivo_id": t.arquivo_id,
        "linha_origem": t.linha_origem,
    }


def _filtrar_transacoes(
    db: Session,
    empresa: Empresa,
    inicio: date | None,
    fim: date | None,
    conta_id: str | None,
    categoria_id: str | None,
    status: str | None,
    possivel_duplicidade: bool | None,
):
    q = (
        db.query(Transacao)
        .options(joinedload(Transacao.categoria))
        .filter(Transacao.empresa_id == empresa.id)
    )
    if inicio:
        q = q.filter(Transacao.data_transacao >= inicio)
    if fim:
        q = q.filter(Transacao.data_transacao <= fim)
    if conta_id:
        q = q.filter(Transacao.conta_id == conta_id)
    if categoria_id:
        q = q.filter(Transacao.categoria_id == categoria_id)
    if status:
        q = q.filter(Transacao.status_revisao == status)
    if possivel_duplicidade is not None:
        q = q.filter(Transacao.possivel_duplicidade.is_(possivel_duplicidade))
    return q.order_by(Transacao.data_transacao.desc(), Transacao.linha_origem.desc())


@router.get("/transacoes")
def listar_transacoes(
    inicio: date | None = None,
    fim: date | None = None,
    conta_id: str | None = None,
    categoria_id: str | None = None,
    status: str | None = None,
    possivel_duplicidade: bool | None = None,
    limite: int = Query(100, le=500),
    offset: int = 0,
    empresa: Empresa = Depends(require_empresa),
    db: Session = Depends(get_db),
):
    q = _filtrar_transacoes(
        db, empresa, inicio, fim, conta_id, categoria_id, status, possivel_duplicidade
    )
    total = q.count()
    itens = q.limit(limite).offset(offset).all()
    return {"total": total, "itens": [_transacao_para_dict(t) for t in itens]}


class CorrecaoIn(BaseModel):
    categoria_id: str
    criar_regra: bool = False
    aplicar_semelhantes: bool = False


@router.patch("/transacoes/{transacao_id}")
def corrigir_categoria(
    transacao_id: str,
    dados: CorrecaoIn,
    empresa: Empresa = Depends(require_empresa),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transacao = (
        db.query(Transacao)
        .filter_by(id=transacao_id, empresa_id=empresa.id)
        .one_or_none()
    )
    if transacao is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    categoria = (
        db.query(Categoria)
        .filter(
            Categoria.id == dados.categoria_id,
            (Categoria.empresa_id == empresa.id) | (Categoria.empresa_id.is_(None)),
        )
        .one_or_none()
    )
    if categoria is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    correcao = CorrecaoUsuario(
        transacao_id=transacao.id,
        usuario_id=usuario.id,
        categoria_anterior_id=transacao.categoria_id,
        categoria_nova_id=categoria.id,
    )

    transacao.categoria_id = categoria.id
    transacao.confianca = 1.0
    transacao.metodo_categorizacao = "manual"
    transacao.status_revisao = "revisada"

    regra_criada = None
    if dados.criar_regra and transacao.descricao_normalizada:
        regra_criada = RegraCategorizacao(
            empresa_id=empresa.id,
            padrao=transacao.descricao_normalizada,
            tipo_padrao="keyword",
            categoria_id=categoria.id,
            prioridade=100,
            confianca=0.95,
            criada_por=usuario.id,
        )
        db.add(regra_criada)
        db.flush()
        correcao.gerou_regra_id = regra_criada.id

    aplicadas = 0
    if dados.aplicar_semelhantes:
        semelhantes = (
            db.query(Transacao)
            .filter(
                Transacao.empresa_id == empresa.id,
                Transacao.id != transacao.id,
                Transacao.descricao_normalizada == transacao.descricao_normalizada,
                Transacao.status_revisao != "revisada",
            )
            .all()
        )
        for s in semelhantes:
            s.categoria_id = categoria.id
            s.confianca = 0.9
            s.metodo_categorizacao = "regra_usuario"
            s.status_revisao = "automatica"
        aplicadas = len(semelhantes)

    db.add(correcao)
    db.commit()
    audit.registrar(
        db, "correcao_categoria", usuario.id, empresa.id, "transacao", transacao.id
    )
    return {
        "ok": True,
        "regra_criada": regra_criada.id if regra_criada else None,
        "aplicadas_semelhantes": aplicadas,
    }


# ---------- dashboard e exportação ----------


@router.get("/dashboard")
def obter_dashboard(
    inicio: date | None = None,
    fim: date | None = None,
    conta_id: str | None = None,
    empresa: Empresa = Depends(require_empresa),
    db: Session = Depends(get_db),
):
    return reports.dashboard(db, empresa.id, inicio, fim, conta_id)


@router.get("/transacoes/export.csv")
def exportar_transacoes(
    inicio: date | None = None,
    fim: date | None = None,
    conta_id: str | None = None,
    categoria_id: str | None = None,
    status: str | None = None,
    empresa: Empresa = Depends(require_empresa),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transacoes = _filtrar_transacoes(
        db, empresa, inicio, fim, conta_id, categoria_id, status, None
    ).all()
    audit.registrar(db, "exportacao_csv", usuario.id, empresa.id)
    return PlainTextResponse(
        reports.exportar_csv(transacoes, db),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=transacoes.csv"},
    )
