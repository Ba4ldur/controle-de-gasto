"""Trilha de auditoria — apenas IDs e ações, nunca conteúdo sensível."""

from sqlalchemy.orm import Session

from app.models import LogAuditoria


def registrar(
    db: Session,
    acao: str,
    usuario_id: str | None = None,
    empresa_id: str | None = None,
    entidade: str | None = None,
    entidade_id: str | None = None,
) -> None:
    db.add(
        LogAuditoria(
            usuario_id=usuario_id,
            empresa_id=empresa_id,
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
        )
    )
    db.commit()
