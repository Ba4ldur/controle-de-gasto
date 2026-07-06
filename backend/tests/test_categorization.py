from datetime import date
from decimal import Decimal

from app.models import Categoria, RegraCategorizacao
from app.services.categorization import (
    carregar_regras,
    categorizar,
    obter_categoria_a_classificar,
)
from app.services.normalization import TransacaoNormalizada
from tests.conftest import criar_ambiente


def _t(descricao, valor="-100.00", hint=None):
    return TransacaoNormalizada(
        linha_origem=1,
        data=date(2026, 6, 2),
        descricao_original=descricao,
        descricao_normalizada=descricao,
        valor=Decimal(valor),
        saldo=None,
        tipo_hint=hint,
    )


def _classificar(db, empresa, transacao):
    regras = carregar_regras(db, empresa.id)
    fallback = obter_categoria_a_classificar(db)
    return categorizar(transacao, regras, fallback.id), fallback


def test_regra_global_tarifa(db, ambiente):
    empresa, _, _ = ambiente
    resultado, _ = _classificar(db, empresa, _t("TARIFA PACOTE SERVICOS"))
    categoria = db.get(Categoria, resultado.categoria_id)
    assert categoria.nome == "Tarifas bancárias"
    assert resultado.tipo == "tarifa"
    assert resultado.confianca >= 0.8
    assert resultado.status_revisao == "automatica"
    assert resultado.metodo == "regra_global"


def test_imposto_com_fronteira_de_palavra(db, ambiente):
    empresa, _, _ = ambiente
    resultado, _ = _classificar(db, empresa, _t("PAGAMENTO DAS SIMPLES NACIONAL"))
    assert db.get(Categoria, resultado.categoria_id).nome == "Impostos e tributos"
    # "LOJA DAS FLORES" não é imposto: 'DAS' entre palavras comuns não pode casar
    resultado2, fallback = _classificar(db, empresa, _t("COMPRA LOJA DASFLORES"))
    assert resultado2.categoria_id == fallback.id


def test_estorno_vence_tarifa(db, ambiente):
    empresa, _, _ = ambiente
    resultado, _ = _classificar(db, empresa, _t("ESTORNO TARIFA COBRADA", valor="89.90"))
    assert db.get(Categoria, resultado.categoria_id).nome == "Estornos"
    assert resultado.tipo == "estorno"


def test_ted_generico_fica_pendente_e_no_resultado(db, ambiente):
    empresa, _, _ = ambiente
    resultado, fallback = _classificar(db, empresa, _t("TED FORNECEDOR MOINHO"))
    assert resultado.categoria_id == fallback.id  # A classificar
    assert resultado.tipo == "transferencia"
    assert resultado.status_revisao == "pendente_revisao"
    assert not db.get(Categoria, fallback.id).fora_do_resultado


def test_sem_correspondencia_vai_para_revisao(db, ambiente):
    empresa, _, _ = ambiente
    resultado, fallback = _classificar(db, empresa, _t("XYZQWERTY SEM SENTIDO"))
    assert resultado.categoria_id == fallback.id
    assert resultado.confianca == 0.0
    assert resultado.status_revisao == "pendente_revisao"
    assert resultado.tipo == "debito"  # inferido pelo sinal


def test_regra_da_empresa_tem_precedencia(db, ambiente):
    empresa, _, _ = ambiente
    fornecedores = (
        db.query(Categoria)
        .filter_by(nome="Fornecedores")
        .filter(Categoria.empresa_id.is_(None))
        .one()
    )
    db.add(
        RegraCategorizacao(
            empresa_id=empresa.id,
            padrao="TARIFA PACOTE",
            categoria_id=fornecedores.id,
            prioridade=1,
            confianca=0.95,
        )
    )
    db.commit()
    resultado, _ = _classificar(db, empresa, _t("TARIFA PACOTE SERVICOS"))
    assert resultado.categoria_id == fornecedores.id
    assert resultado.metodo == "regra_usuario"


def test_regra_de_outra_empresa_nao_se_aplica(db, ambiente):
    empresa, _, _ = ambiente
    outra = criar_ambiente(db, sufixo="-b")[0]
    marketing = (
        db.query(Categoria)
        .filter_by(nome="Marketing")
        .filter(Categoria.empresa_id.is_(None))
        .one()
    )
    db.add(
        RegraCategorizacao(
            empresa_id=outra.id,
            padrao="TARIFA PACOTE",
            categoria_id=marketing.id,
            prioridade=999,
            confianca=0.99,
        )
    )
    db.commit()
    resultado, _ = _classificar(db, empresa, _t("TARIFA PACOTE SERVICOS"))
    assert db.get(Categoria, resultado.categoria_id).nome == "Tarifas bancárias"
