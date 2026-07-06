import logging

from app.logging_conf import get_logger
from app.masking import contem_dado_sensivel, mascarar


def test_mascara_cpf_com_e_sem_pontuacao():
    assert "123.456.789-01" not in mascarar("CPF 123.456.789-01")
    assert "12345678901" not in mascarar("CPF 12345678901")


def test_mascara_cnpj():
    assert "12.345.678/0001-90" not in mascarar("CNPJ 12.345.678/0001-90")


def test_mascara_email_chave_pix():
    assert "joao@email.com" not in mascarar("pix joao@email.com")


def test_mascara_sequencias_longas_de_digitos():
    resultado = mascarar("conta 12345678 agencia 43210 protocolo 998877665544")
    assert "12345678" not in resultado
    assert "43210" not in resultado


def test_preserva_valores_monetarios_e_datas():
    texto = "PGTO 1.234,56 EM 02/06/2026"
    assert mascarar(texto) == texto


def test_contem_dado_sensivel():
    assert contem_dado_sensivel("CPF 123.456.789-01")
    assert not contem_dado_sensivel("ALUGUEL LOJA CENTRO 1.234,56")


def test_logger_mascara_mensagens_e_argumentos(caplog):
    logger = get_logger("attivare.teste")
    with caplog.at_level(logging.INFO, logger="attivare.teste"):
        logger.info("processando transacao CPF 123.456.789-01 conta %s", "12345678")
    assert "123.456.789-01" not in caplog.text
    assert "12345678" not in caplog.text
