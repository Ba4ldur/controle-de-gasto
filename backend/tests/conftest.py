import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient

from app.auth import criar_usuario, vincular_usuario_empresa
from app.db import SessionLocal
from app.main import create_app
from app.models import ContaBancaria, Empresa


@pytest.fixture()
def app(tmp_path):
    return create_app(database_url=f"sqlite:///{tmp_path / 'teste.db'}")


@pytest.fixture()
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db(app):
    sessao = SessionLocal()
    yield sessao
    sessao.close()


def criar_ambiente(db, sufixo=""):
    """Empresa + usuário vinculado + conta bancária, prontos para uso."""
    empresa = Empresa(nome=f"Empresa Teste{sufixo}")
    db.add(empresa)
    db.commit()
    usuario = criar_usuario(
        db, f"usuario{sufixo}@teste.com", f"Usuário{sufixo}", "senha-teste", "contador"
    )
    vincular_usuario_empresa(db, usuario, empresa)
    conta = ContaBancaria(
        empresa_id=empresa.id, banco="Banco Teste", apelido=f"Conta{sufixo or ' 1'}"
    )
    db.add(conta)
    db.commit()
    return empresa, usuario, conta


@pytest.fixture()
def ambiente(db):
    return criar_ambiente(db)


def login(client, email="usuario@teste.com", senha="senha-teste"):
    resp = client.post("/api/auth/login", json={"email": email, "senha": senha})
    assert resp.status_code == 200, resp.text
    return resp.json()
