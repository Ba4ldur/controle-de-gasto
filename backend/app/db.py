"""Inicialização do banco e sessões SQLAlchemy.

PostgreSQL é o alvo de produção; SQLite é usado em desenvolvimento local e
testes. Nenhum recurso específico de dialeto é utilizado para manter os dois
caminhos funcionais.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


_engine = None
SessionLocal = sessionmaker(autoflush=False, expire_on_commit=False)


def init_db(database_url: str):
    """Cria o engine, vincula o sessionmaker e garante o schema."""
    global _engine
    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    _engine = create_engine(database_url, connect_args=connect_args)
    SessionLocal.configure(bind=_engine)
    # Importa os modelos antes do create_all.
    from app import models  # noqa: F401

    Base.metadata.create_all(_engine)
    return _engine


def get_engine():
    return _engine


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
