"""Isolamento multiempresa: um usuário jamais acessa dados de empresa à qual
não está vinculado. Recursos alheios respondem 404 (existência não revelada)."""

from tests.conftest import criar_ambiente, login
from tests.util import CSV_PADRAO, upload


def test_sem_autenticacao_401(client, ambiente):
    empresa, _, _ = ambiente
    assert client.get(f"/api/empresas/{empresa.id}/transacoes").status_code == 401
    assert client.get(f"/api/empresas/{empresa.id}/dashboard").status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_usuario_nao_acessa_outra_empresa(client, db, ambiente):
    empresa_a, _, conta_a = ambiente
    criar_ambiente(db, sufixo="-b")

    # usuário A importa dados
    login(client)
    upload(client, empresa_a.id, conta_a.id, "extrato.csv", CSV_PADRAO.encode())
    transacao_a = client.get(f"/api/empresas/{empresa_a.id}/transacoes").json()["itens"][0]
    client.post("/api/auth/logout")

    # usuário B tenta acessar os recursos de A
    login(client, email="usuario-b@teste.com")
    assert client.get(f"/api/empresas/{empresa_a.id}/transacoes").status_code == 404
    assert client.get(f"/api/empresas/{empresa_a.id}/contas").status_code == 404
    assert client.get(f"/api/empresas/{empresa_a.id}/dashboard").status_code == 404
    assert client.get(f"/api/empresas/{empresa_a.id}/importacoes").status_code == 404
    assert (
        client.get(f"/api/empresas/{empresa_a.id}/transacoes/export.csv").status_code
        == 404
    )
    resp = upload(client, empresa_a.id, conta_a.id, "x.csv", CSV_PADRAO.encode())
    assert resp.status_code == 404


def test_transacao_de_outra_empresa_nao_e_corrigivel(client, db, ambiente):
    empresa_a, _, conta_a = ambiente
    empresa_b = criar_ambiente(db, sufixo="-b")[0]

    login(client)
    upload(client, empresa_a.id, conta_a.id, "extrato.csv", CSV_PADRAO.encode())
    transacao_a = client.get(f"/api/empresas/{empresa_a.id}/transacoes").json()["itens"][0]
    categoria = client.get(f"/api/empresas/{empresa_a.id}/categorias").json()[0]
    client.post("/api/auth/logout")

    # B tenta corrigir a transação de A através da PRÓPRIA empresa
    login(client, email="usuario-b@teste.com")
    resp = client.patch(
        f"/api/empresas/{empresa_b.id}/transacoes/{transacao_a['id']}",
        json={"categoria_id": categoria["id"]},
    )
    assert resp.status_code == 404


def test_conta_de_outra_empresa_nao_recebe_importacao(client, db, ambiente):
    empresa_a, _, conta_a = ambiente
    empresa_b = criar_ambiente(db, sufixo="-b")[0]

    login(client, email="usuario-b@teste.com")
    # B usa a própria empresa mas aponta a conta de A
    resp = upload(client, empresa_b.id, conta_a.id, "x.csv", CSV_PADRAO.encode())
    assert resp.status_code == 404
