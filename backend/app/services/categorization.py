"""Categorização por regras com nível de confiança (seção 8 da especificação).

Ordem de precedência: regras da empresa > regras globais; dentro do mesmo
escopo, maior prioridade vence. Sem correspondência: "A classificar" com
confiança 0. Toda transação com confiança abaixo do limiar entra na fila de
revisão — nada ambíguo é apresentado como certo.
"""

import re
from dataclasses import dataclass

from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models import Categoria, RegraCategorizacao
from app.services.normalization import TransacaoNormalizada

CATEGORIA_A_CLASSIFICAR = "A classificar"


@dataclass
class ResultadoCategorizacao:
    categoria_id: str | None
    confianca: float
    metodo: str | None  # regra_usuario | regra_global | manual
    tipo: str
    status_revisao: str


def carregar_regras(db: Session, empresa_id: str) -> list[RegraCategorizacao]:
    """Regras ativas na ordem de aplicação (empresa primeiro, prioridade desc)."""
    regras = (
        db.query(RegraCategorizacao)
        .options(joinedload(RegraCategorizacao.categoria))
        .filter(
            RegraCategorizacao.ativa.is_(True),
            (RegraCategorizacao.empresa_id == empresa_id)
            | (RegraCategorizacao.empresa_id.is_(None)),
        )
        .all()
    )
    return sorted(
        regras,
        key=lambda r: (r.empresa_id is not None, r.prioridade),
        reverse=True,
    )


def _regra_casa(regra: RegraCategorizacao, descricao_normalizada: str) -> bool:
    if regra.tipo_padrao == "regex":
        try:
            return bool(re.search(regra.padrao, descricao_normalizada, re.I))
        except re.error:
            return False
    return regra.padrao.upper() in descricao_normalizada


def _tipo_por_sinal(transacao: TransacaoNormalizada) -> str:
    if transacao.tipo_hint in ("transferencia", "tarifa"):
        return transacao.tipo_hint
    return "debito" if transacao.valor < 0 else "credito"


def categorizar(
    transacao: TransacaoNormalizada,
    regras: list[RegraCategorizacao],
    categoria_fallback_id: str | None,
) -> ResultadoCategorizacao:
    for regra in regras:
        if _regra_casa(regra, transacao.descricao_normalizada):
            confianca = float(regra.confianca)
            return ResultadoCategorizacao(
                categoria_id=regra.categoria_id,
                confianca=confianca,
                metodo="regra_usuario" if regra.empresa_id else "regra_global",
                tipo=regra.tipo_transacao or _tipo_por_sinal(transacao),
                status_revisao=(
                    "automatica"
                    if confianca >= settings.limiar_revisao
                    else "pendente_revisao"
                ),
            )
    return ResultadoCategorizacao(
        categoria_id=categoria_fallback_id,
        confianca=0.0,
        metodo=None,
        tipo=_tipo_por_sinal(transacao),
        status_revisao="pendente_revisao",
    )


def obter_categoria_a_classificar(db: Session) -> Categoria:
    return (
        db.query(Categoria)
        .filter(
            Categoria.nome == CATEGORIA_A_CLASSIFICAR,
            Categoria.empresa_id.is_(None),
        )
        .one()
    )
