from datetime import date
from decimal import Decimal

from app.services.dedup import atribuir_hashes
from app.services.normalization import TransacaoNormalizada


def _t(dia, valor, descricao, linha=1):
    return TransacaoNormalizada(
        linha_origem=linha,
        data=date(2026, 6, dia),
        descricao_original=descricao,
        descricao_normalizada=descricao,
        valor=Decimal(valor),
        saldo=None,
        tipo_hint=None,
    )


def test_hash_deterministico_entre_lotes():
    lote = [_t(2, "-100.00", "TARIFA"), _t(3, "50.00", "PIX RECEB")]
    assert atribuir_hashes("conta-1", lote) == atribuir_hashes("conta-1", lote)


def test_hash_muda_por_conta():
    lote = [_t(2, "-100.00", "TARIFA")]
    assert atribuir_hashes("conta-1", lote) != atribuir_hashes("conta-2", lote)


def test_transacoes_identicas_no_mesmo_dia_recebem_hashes_distintos():
    lote = [_t(2, "-100.00", "TARIFA", 1), _t(2, "-100.00", "TARIFA", 2)]
    hashes = atribuir_hashes("conta-1", lote)
    assert hashes[0] != hashes[1]


def test_ocorrencia_reinicia_por_lote():
    # Reimportar o mesmo conteúdo reproduz os mesmos hashes (colisão = dedup).
    lote_a = [_t(2, "-100.00", "TARIFA", 1), _t(2, "-100.00", "TARIFA", 2)]
    lote_b = [_t(2, "-100.00", "TARIFA", 7), _t(2, "-100.00", "TARIFA", 9)]
    assert atribuir_hashes("c", lote_a) == atribuir_hashes("c", lote_b)
