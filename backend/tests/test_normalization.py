from datetime import date, datetime
from decimal import Decimal

import pytest

from app.services.normalization import (
    ErroNormalizacao,
    aplicar_sinal_por_hint,
    normalizar_data,
    normalizar_descricao,
    normalizar_valor,
)


class TestNormalizarData:
    @pytest.mark.parametrize(
        "bruta,esperada",
        [
            ("02/06/2026", date(2026, 6, 2)),
            ("02/06/26", date(2026, 6, 2)),
            ("2026-06-02", date(2026, 6, 2)),
            ("20260602", date(2026, 6, 2)),
            ("02-06-2026", date(2026, 6, 2)),
            (date(2026, 6, 2), date(2026, 6, 2)),
            (datetime(2026, 6, 2, 14, 30), date(2026, 6, 2)),
            (46175, date(2026, 6, 2)),  # serial Excel
        ],
    )
    def test_formatos(self, bruta, esperada):
        assert normalizar_data(bruta) == esperada

    def test_formato_invalido(self):
        with pytest.raises(ErroNormalizacao):
            normalizar_data("junho de 2026")


class TestNormalizarValor:
    @pytest.mark.parametrize(
        "bruto,esperado",
        [
            ("1.234,56", Decimal("1234.56")),
            ("-1234.56", Decimal("-1234.56")),
            ("1.234,56-", Decimal("-1234.56")),
            ("(500,00)", Decimal("-500.00")),
            ("R$ 89,90", Decimal("89.90")),
            ("123,45 D", Decimal("-123.45")),
            ("123,45 C", Decimal("123.45")),
            ("2350.00", Decimal("2350.00")),
            ("1.234", Decimal("1234.00")),  # ponto de milhar sem decimais
            (12.37, Decimal("12.37")),
            (-100, Decimal("-100.00")),
        ],
    )
    def test_formatos(self, bruto, esperado):
        assert normalizar_valor(bruto) == esperado

    def test_coluna_debito_forca_negativo(self):
        assert normalizar_valor("100,50", negativo=True) == Decimal("-100.50")

    def test_valor_invalido(self):
        with pytest.raises(ErroNormalizacao):
            normalizar_valor("abc")

    def test_hint_debito_credito(self):
        assert aplicar_sinal_por_hint(Decimal("100"), "D") == Decimal("-100")
        assert aplicar_sinal_por_hint(Decimal("-100"), "C") == Decimal("100")
        assert aplicar_sinal_por_hint(Decimal("-100"), "D") == Decimal("-100")
        assert aplicar_sinal_por_hint(Decimal("100"), None) == Decimal("100")


class TestNormalizarDescricao:
    def test_maiusculas_sem_acento(self):
        assert normalizar_descricao("Pagamento  de   condomínio") == "PAGAMENTO DE CONDOMINIO"

    def test_mascara_cpf(self):
        resultado = normalizar_descricao("PIX Joao 123.456.789-01")
        assert "123.456.789-01" not in resultado
        assert "JOAO" in resultado

    def test_mascara_conta(self):
        resultado = normalizar_descricao("TED CONTA 12345678 AG 4321")
        assert "12345678" not in resultado
