from datetime import datetime

import pytest

from app.parsers import csv_parser, detectar_formato, ofx_parser, xlsx_parser
from app.parsers.base import ErroParser
from tests.util import CSV_PADRAO, OFX_PADRAO, gerar_xlsx


class TestCsv:
    def test_extrai_transacoes_e_pula_linha_de_saldo(self):
        resultado = csv_parser.parse(CSV_PADRAO.encode())
        assert len(resultado.transacoes) == 15  # SALDO ANTERIOR fora
        assert not resultado.rejeitadas
        primeira = resultado.transacoes[0]
        assert primeira.descricao == "PIX RECEBIMENTO VENDA BALCAO"
        assert primeira.saldo == "14.850,00"

    def test_delimitador_virgula(self):
        csv_virgula = 'Data,Descricao,Valor\n02/06/2026,"UBER VIAGENS",-47.90\n'
        resultado = csv_parser.parse(csv_virgula.encode())
        assert len(resultado.transacoes) == 1
        assert resultado.transacoes[0].valor == "-47.90"

    def test_colunas_debito_credito(self):
        conteudo = (
            "Data;Historico;Debito;Credito\n"
            "02/06/2026;COMPRA MATERIAL;100,50;\n"
            "03/06/2026;RECEBIMENTO CLIENTE;;200,00\n"
        )
        resultado = csv_parser.parse(conteudo.encode())
        assert len(resultado.transacoes) == 2
        assert resultado.transacoes[0].debito == "100,50"
        assert resultado.transacoes[1].credito == "200,00"

    def test_linha_sem_data_rejeitada(self):
        conteudo = "Data;Historico;Valor\n;SEM DATA;-10,00\n02/06/2026;OK;-5,00\n"
        resultado = csv_parser.parse(conteudo.encode())
        assert len(resultado.transacoes) == 1
        assert len(resultado.rejeitadas) == 1
        assert resultado.rejeitadas[0].motivo == "data ausente"

    def test_sem_cabecalho_reconhecivel(self):
        with pytest.raises(ErroParser):
            csv_parser.parse(b"a;b;c\n1;2;3\n")

    def test_latin1(self):
        conteudo = "Data;Histórico;Valor\n02/06/2026;CONDOMÍNIO;-500,00\n".encode("latin-1")
        resultado = csv_parser.parse(conteudo)
        assert len(resultado.transacoes) == 1


class TestXlsx:
    def test_extrai_transacoes(self):
        conteudo = gerar_xlsx(
            [
                ["Extrato da conta", None, None],
                ["Data", "Descrição", "Débito", "Crédito"],
                [datetime(2026, 6, 2), "COMPRA MATERIAL", 100.5, None],
                [datetime(2026, 6, 3), "RECEBIMENTO CLIENTE", None, 200],
                [datetime(2026, 6, 4), "SALDO DO DIA", None, None],
            ]
        )
        resultado = xlsx_parser.parse(conteudo)
        assert len(resultado.transacoes) == 2
        assert resultado.transacoes[0].debito == 100.5

    def test_arquivo_invalido(self):
        with pytest.raises(ErroParser):
            xlsx_parser.parse(b"nao e um xlsx")


class TestOfx:
    def test_extrai_transacoes(self):
        resultado = ofx_parser.parse(OFX_PADRAO.encode())
        assert len(resultado.transacoes) == 3
        credito = resultado.transacoes[0]
        assert credito.data == "20260602"  # DTPOSTED truncado para AAAAMMDD
        assert credito.valor == "2350.00"
        assert credito.tipo_hint == "C"
        tarifa = resultado.transacoes[1]
        assert tarifa.tipo_hint == "tarifa"
        transferencia = resultado.transacoes[2]
        assert transferencia.tipo_hint == "transferencia"

    def test_arquivo_sem_ofx(self):
        with pytest.raises(ErroParser):
            ofx_parser.parse(b"apenas texto")


class TestDetectarFormato:
    def test_por_conteudo(self):
        assert detectar_formato("extrato.txt", OFX_PADRAO.encode()) == "ofx"
        assert detectar_formato("extrato.csv", CSV_PADRAO.encode()) == "csv"
        assert detectar_formato("planilha.qualquer", gerar_xlsx([["Data"]])) == "xlsx"

    def test_extensao_nao_suportada(self):
        with pytest.raises(ErroParser):
            detectar_formato("extrato.pdf", b"%PDF-1.4 ...")
