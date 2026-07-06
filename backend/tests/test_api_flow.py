"""Fluxo completo pela API: login → upload/preview → importação →
revisão/correção → dashboard → exportação."""

import logging

from app.models import ContaBancaria, CorrecaoUsuario, LogAuditoria, Transacao
from tests.conftest import login
from tests.util import (
    CSV_COM_DADO_SENSIVEL,
    CSV_PADRAO,
    DESPESAS_ESPERADAS_CENTAVOS,
    OFX_PADRAO,
    PENDENTES_ESPERADAS,
    RECEITAS_ESPERADAS_CENTAVOS,
    TRANSACOES_ESPERADAS,
    upload,
)


def test_login_invalido(client, ambiente):
    resp = client.post(
        "/api/auth/login", json={"email": "usuario@teste.com", "senha": "errada"}
    )
    assert resp.status_code == 401


def test_preview_nao_persiste(client, ambiente):
    empresa, _, conta = ambiente
    login(client)
    resp = upload(client, empresa.id, conta.id, "extrato.csv", CSV_PADRAO.encode(), preview=True)
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert corpo["novas"] == TRANSACOES_ESPERADAS
    assert corpo["duplicadas"] == 0
    assert corpo["periodo_inicio"] == "2026-06-02"
    assert corpo["periodo_fim"] == "2026-06-30"
    assert len(corpo["preview"]) == TRANSACOES_ESPERADAS
    # nada gravado
    resp = client.get(f"/api/empresas/{empresa.id}/transacoes")
    assert resp.json()["total"] == 0


def test_importacao_completa_e_reimportacao_idempotente(client, ambiente):
    empresa, _, conta = ambiente
    login(client)

    resp = upload(client, empresa.id, conta.id, "extrato.csv", CSV_PADRAO.encode())
    assert resp.status_code == 201, resp.text
    corpo = resp.json()
    assert corpo["novas"] == TRANSACOES_ESPERADAS
    assert corpo["pendentes_revisao"] == PENDENTES_ESPERADAS
    assert corpo["arquivo_id"]

    # mesmo arquivo de novo: bloqueado pelo hash do arquivo
    resp = upload(client, empresa.id, conta.id, "extrato.csv", CSV_PADRAO.encode())
    assert resp.status_code == 422
    assert "já foi importado" in resp.json()["detail"]

    # arquivo diferente com período sobreposto: só a linha nova entra
    csv_maior = CSV_PADRAO + "01/07/2026;NOVA COMPRA MATERIAL;-10,00;813,65\n"
    resp = upload(client, empresa.id, conta.id, "extrato2.csv", csv_maior.encode())
    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["novas"] == 1
    assert corpo["duplicadas"] == TRANSACOES_ESPERADAS

    resp = client.get(f"/api/empresas/{empresa.id}/transacoes?limite=500")
    assert resp.json()["total"] == TRANSACOES_ESPERADAS + 1


def test_dashboard_exclui_neutras_e_calcula_totais(client, ambiente):
    empresa, _, conta = ambiente
    login(client)
    upload(client, empresa.id, conta.id, "extrato.csv", CSV_PADRAO.encode())

    resp = client.get(
        f"/api/empresas/{empresa.id}/dashboard?inicio=2026-06-01&fim=2026-06-30"
    )
    d = resp.json()
    assert d["receitas_centavos"] == RECEITAS_ESPERADAS_CENTAVOS
    assert d["despesas_centavos"] == DESPESAS_ESPERADAS_CENTAVOS
    assert (
        d["saldo_liquido_centavos"]
        == RECEITAS_ESPERADAS_CENTAVOS + DESPESAS_ESPERADAS_CENTAVOS
    )
    assert d["tarifas_centavos"] == -8990
    assert d["pendentes_revisao"] == PENDENTES_ESPERADAS
    categorias = {c["categoria"] for c in d["despesas_por_categoria"]}
    # transferência entre contas próprias e estorno não aparecem no resultado
    assert "Transferências entre contas próprias" not in categorias
    assert "Estornos" not in categorias
    assert "Pessoal e pró-labore" in categorias


def test_correcao_manual_cria_regra_e_aplica_semelhantes(client, db, ambiente):
    empresa, _, conta = ambiente
    login(client)
    upload(client, empresa.id, conta.id, "extrato.csv", CSV_PADRAO.encode())

    resp = client.get(
        f"/api/empresas/{empresa.id}/transacoes?status=pendente_revisao&limite=500"
    )
    pendentes = resp.json()["itens"]
    alvo = next(t for t in pendentes if "VENDA BALCAO" in t["descricao"])
    semelhantes_antes = [
        t for t in pendentes if t["descricao"] == alvo["descricao"] and t["id"] != alvo["id"]
    ]
    assert semelhantes_antes  # o extrato tem duas VENDA BALCAO

    categorias = client.get(f"/api/empresas/{empresa.id}/categorias").json()
    vendas = next(c for c in categorias if c["nome"] == "Vendas e serviços")

    resp = client.patch(
        f"/api/empresas/{empresa.id}/transacoes/{alvo['id']}",
        json={
            "categoria_id": vendas["id"],
            "criar_regra": True,
            "aplicar_semelhantes": True,
        },
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert corpo["regra_criada"]
    assert corpo["aplicadas_semelhantes"] == len(semelhantes_antes)

    transacao = db.get(Transacao, alvo["id"])
    assert transacao.status_revisao == "revisada"
    assert transacao.metodo_categorizacao == "manual"
    assert transacao.confianca == 1.0
    assert db.query(CorrecaoUsuario).count() == 1

    # a regra criada vale para importações futuras da empresa
    csv_futuro = "Data;Historico;Valor\n05/07/2026;PIX RECEBIMENTO VENDA BALCAO;500,00\n"
    resp = upload(client, empresa.id, conta.id, "julho.csv", csv_futuro.encode())
    nova = resp.json()["preview"][0]
    assert nova["categoria"] == "Vendas e serviços"
    assert nova["status_revisao"] == "automatica"


def test_transferencia_interna_espelhada(client, db, ambiente):
    empresa, _, conta = ambiente
    login(client)
    conta2 = ContaBancaria(empresa_id=empresa.id, banco="Banco Teste", apelido="Conta 2")
    db.add(conta2)
    db.commit()

    upload(client, empresa.id, conta.id, "extrato.csv", CSV_PADRAO.encode())
    # entrada espelhada (+2.000,00 um dia depois) na outra conta
    csv_conta2 = "Data;Historico;Valor\n17/06/2026;TRANSF ENTRE CONTAS PROPRIA;2.000,00\n"
    upload(client, empresa.id, conta2.id, "extrato-c2.csv", csv_conta2.encode())

    internas = (
        db.query(Transacao)
        .filter_by(empresa_id=empresa.id, contraparte_interna=True)
        .all()
    )
    assert len(internas) == 2
    assert {t.valor_centavos for t in internas} == {-200000, 200000}


def test_possivel_duplicidade_sinalizada_nao_descartada(client, db, ambiente):
    empresa, _, conta = ambiente
    login(client)
    upload(client, empresa.id, conta.id, "extrato.csv", CSV_PADRAO.encode())
    # outro arquivo, mesma tarifa um dia depois: entra, mas sinalizada
    csv2 = "Data;Historico;Valor\n04/06/2026;TARIFA PACOTE SERVICOS;-89,90\n"
    resp = upload(client, empresa.id, conta.id, "extrato-b.csv", csv2.encode())
    assert resp.json()["novas"] == 1

    marcadas = (
        db.query(Transacao).filter_by(empresa_id=empresa.id, possivel_duplicidade=True).all()
    )
    assert len(marcadas) == 1
    assert marcadas[0].data_transacao.isoformat() == "2026-06-04"


def test_importacao_ofx(client, ambiente):
    empresa, _, conta = ambiente
    login(client)
    resp = upload(client, empresa.id, conta.id, "extrato.ofx", OFX_PADRAO.encode())
    assert resp.status_code == 201, resp.text
    corpo = resp.json()
    assert corpo["formato"] == "ofx"
    assert corpo["novas"] == 3


def test_exportacao_csv(client, ambiente):
    empresa, _, conta = ambiente
    login(client)
    upload(client, empresa.id, conta.id, "extrato.csv", CSV_PADRAO.encode())
    resp = client.get(f"/api/empresas/{empresa.id}/transacoes/export.csv")
    assert resp.status_code == 200
    linhas = resp.text.strip().splitlines()
    assert linhas[0].startswith("data;descricao;valor")
    assert len(linhas) == 1 + TRANSACOES_ESPERADAS
    assert any("TARIFA PACOTE SERVICOS" in linha for linha in linhas)


def test_linhas_rejeitadas_nao_derrubam_importacao(client, ambiente):
    empresa, _, conta = ambiente
    login(client)
    conteudo = (
        "Data;Historico;Valor\n"
        "02/06/2026;COMPRA OK;-10,00\n"
        "data invalida;COMPRA RUIM;-20,00\n"
    )
    resp = upload(client, empresa.id, conta.id, "extrato.csv", conteudo.encode())
    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["novas"] == 1
    assert len(corpo["rejeitadas"]) == 1


def test_dados_sensiveis_mascarados_em_api_e_logs(client, ambiente, caplog):
    empresa, _, conta = ambiente
    login(client)
    with caplog.at_level(logging.DEBUG):
        resp = upload(
            client, empresa.id, conta.id, "extrato.csv", CSV_COM_DADO_SENSIVEL.encode()
        )
    assert resp.status_code == 201

    # logs limpos
    assert "123.456.789-01" not in caplog.text
    assert "12.345.678/0001-90" not in caplog.text
    assert "joao@email.com" not in caplog.text

    # API nunca devolve CPF/CNPJ/conta/chave Pix
    corpo = client.get(f"/api/empresas/{empresa.id}/transacoes").text
    assert "123.456.789-01" not in corpo
    assert "12345678" not in corpo
    assert "joao@email.com" not in corpo

    exportado = client.get(f"/api/empresas/{empresa.id}/transacoes/export.csv").text
    assert "123.456.789-01" not in exportado


def test_auditoria_registrada(client, db, ambiente):
    empresa, _, conta = ambiente
    login(client)
    upload(client, empresa.id, conta.id, "extrato.csv", CSV_PADRAO.encode())
    client.get(f"/api/empresas/{empresa.id}/transacoes/export.csv")
    acoes = {log.acao for log in db.query(LogAuditoria).all()}
    assert {"login", "importacao", "exportacao_csv"} <= acoes
