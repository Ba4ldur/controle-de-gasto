"""Agregados do dashboard e exportação CSV.

Regras financeiras aplicadas (seção 9 da especificação):
- transferências internas ficam fora de receitas/despesas;
- categorias marcadas ``fora_do_resultado`` (transferências, investimentos,
  estornos) não entram nos totais;
- "A classificar" permanece nos totais e é destacada como pendência.
"""

import csv
import io
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Categoria, ContaBancaria, Transacao


def _base_resultado(db: Session, empresa_id: str, inicio, fim, conta_id):
    q = (
        db.query(Transacao)
        .join(Categoria, Transacao.categoria_id == Categoria.id)
        .filter(
            Transacao.empresa_id == empresa_id,
            Transacao.contraparte_interna.is_(False),
            Categoria.fora_do_resultado.is_(False),
        )
    )
    if inicio:
        q = q.filter(Transacao.data_transacao >= inicio)
    if fim:
        q = q.filter(Transacao.data_transacao <= fim)
    if conta_id:
        q = q.filter(Transacao.conta_id == conta_id)
    return q


def dashboard(
    db: Session,
    empresa_id: str,
    inicio: date | None = None,
    fim: date | None = None,
    conta_id: str | None = None,
) -> dict:
    base = _base_resultado(db, empresa_id, inicio, fim, conta_id)

    receitas = base.filter(Transacao.valor_centavos > 0).with_entities(
        func.coalesce(func.sum(Transacao.valor_centavos), 0)
    ).scalar()
    despesas = base.filter(Transacao.valor_centavos < 0).with_entities(
        func.coalesce(func.sum(Transacao.valor_centavos), 0)
    ).scalar()

    def _por_categoria(sinal_positivo: bool):
        filtro = (
            Transacao.valor_centavos > 0
            if sinal_positivo
            else Transacao.valor_centavos < 0
        )
        linhas = (
            base.filter(filtro)
            .with_entities(
                Categoria.nome,
                func.sum(Transacao.valor_centavos),
                func.count(Transacao.id),
            )
            .group_by(Categoria.nome)
            .all()
        )
        total = sum(abs(v) for _, v, _ in linhas) or 1
        return sorted(
            (
                {
                    "categoria": nome,
                    "total_centavos": abs(int(valor)),
                    "quantidade": int(qtd),
                    "percentual": round(abs(valor) * 100 / total, 1),
                }
                for nome, valor, qtd in linhas
            ),
            key=lambda item: -item["total_centavos"],
        )

    # Contagens gerais do período (independem de fora_do_resultado)
    geral = db.query(Transacao).filter(Transacao.empresa_id == empresa_id)
    if inicio:
        geral = geral.filter(Transacao.data_transacao >= inicio)
    if fim:
        geral = geral.filter(Transacao.data_transacao <= fim)
    if conta_id:
        geral = geral.filter(Transacao.conta_id == conta_id)

    tarifas = (
        base.filter(Categoria.nome == "Tarifas bancárias")
        .with_entities(func.coalesce(func.sum(Transacao.valor_centavos), 0))
        .scalar()
    )

    return {
        "periodo": {
            "inicio": inicio.isoformat() if inicio else None,
            "fim": fim.isoformat() if fim else None,
        },
        "receitas_centavos": int(receitas),
        "despesas_centavos": int(despesas),  # negativo
        "saldo_liquido_centavos": int(receitas) + int(despesas),
        "tarifas_centavos": int(tarifas),  # negativo
        "despesas_por_categoria": _por_categoria(False),
        "receitas_por_categoria": _por_categoria(True),
        "total_transacoes": geral.count(),
        "pendentes_revisao": geral.filter(
            Transacao.status_revisao == "pendente_revisao"
        ).count(),
        "possiveis_duplicidades": geral.filter(
            Transacao.possivel_duplicidade.is_(True)
        ).count(),
        "transferencias_internas": geral.filter(
            Transacao.contraparte_interna.is_(True)
        ).count(),
    }


def exportar_csv(transacoes: list[Transacao], db: Session) -> str:
    """CSV pt-BR (';' e vírgula decimal). Usa somente a descrição
    normalizada — a original nunca sai do banco."""
    contas = {
        c.id: c.apelido
        for c in db.query(ContaBancaria).filter(
            ContaBancaria.id.in_({t.conta_id for t in transacoes})
        )
    }
    saida = io.StringIO()
    escritor = csv.writer(saida, delimiter=";", lineterminator="\n")
    escritor.writerow(
        [
            "data", "descricao", "valor", "tipo", "categoria", "status_revisao",
            "conta", "contraparte_interna", "possivel_duplicidade",
        ]
    )
    for t in transacoes:
        valor = f"{t.valor_centavos / 100:.2f}".replace(".", ",")
        escritor.writerow(
            [
                t.data_transacao.isoformat(),
                t.descricao_normalizada,
                valor,
                t.tipo,
                t.categoria.nome if t.categoria else "",
                t.status_revisao,
                contas.get(t.conta_id, ""),
                "sim" if t.contraparte_interna else "nao",
                "sim" if t.possivel_duplicidade else "nao",
            ]
        )
    return saida.getvalue()
