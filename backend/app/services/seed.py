"""Seed idempotente das categorias e regras globais (seção 8 da especificação).

Palavras curtas que colidem com substrings comuns (DAS, TED, GPS…) usam
regex com fronteira de palavra; o restante usa keyword (substring).
"""

from sqlalchemy.orm import Session

from app.models import Categoria, RegraCategorizacao

# (nome, tipo, fora_do_resultado)
CATEGORIAS_GLOBAIS = [
    # Receitas
    ("Vendas e serviços", "receita", False),
    ("Reembolsos recebidos", "receita", False),
    ("Rendimentos de aplicação", "receita", False),
    ("Aportes de sócios", "receita", False),
    ("Outras receitas", "receita", False),
    # Despesas
    ("Fornecedores", "despesa", False),
    ("Pessoal e pró-labore", "despesa", False),
    ("Impostos e tributos", "despesa", False),
    ("Tarifas bancárias", "despesa", False),
    ("Ocupação (aluguel, condomínio)", "despesa", False),
    ("Utilidades e telecom", "despesa", False),
    ("Software e assinaturas", "despesa", False),
    ("Transporte e logística", "despesa", False),
    ("Alimentação", "despesa", False),
    ("Marketing", "despesa", False),
    ("Serviços profissionais", "despesa", False),
    ("Equipamentos e materiais", "despesa", False),
    ("Cartão de crédito (fatura)", "despesa", False),
    ("Outras despesas", "despesa", False),
    # Neutras: transferências/investimentos/estornos ficam fora do resultado.
    # "A classificar" permanece NO resultado (dinheiro real não some dos
    # totais por falta de classificação; o dashboard destaca o pendente).
    ("Transferências entre contas próprias", "neutra", True),
    ("Investimentos", "neutra", True),
    ("Estornos", "neutra", True),
    ("A classificar", "neutra", False),
]

# (padrao, tipo_padrao, categoria, tipo_transacao, prioridade, confianca)
REGRAS_GLOBAIS = [
    (r"\b(DAS|DARF|GPS|FGTS|GRF|ISS|ICMS|INSS)\b|SIMPLES NACIONAL", "regex",
     "Impostos e tributos", "imposto", 100, 0.90),
    ("TARIFA", "keyword", "Tarifas bancárias", "tarifa", 90, 0.90),
    ("PACOTE SERVICOS", "keyword", "Tarifas bancárias", "tarifa", 90, 0.90),
    ("MANUT CTA", "keyword", "Tarifas bancárias", "tarifa", 90, 0.90),
    (r"(PGTO|PAGAMENTO|PAG|FATURA).{0,15}CARTAO", "regex",
     "Cartão de crédito (fatura)", None, 85, 0.90),
    # Estorno acima de tarifa: "ESTORNO TARIFA" é estorno, não tarifa.
    ("ESTORNO", "keyword", "Estornos", "estorno", 95, 0.85),
    ("DEVOLUCAO", "keyword", "Estornos", "estorno", 94, 0.80),
    # Rendimento acima de investimentos: "RENDIMENTO APLIC" é receita.
    ("RENDIMENTO", "keyword", "Rendimentos de aplicação", None, 85, 0.85),
    (r"\bRESGATE\b|\bAPLICACAO\b|\bAPLIC\b|\bCDB\b|\bTESOURO\b|POUPANCA", "regex",
     "Investimentos", "investimento", 80, 0.85),
    (r"\bFOLHA\b|\bSALARIO\b|PRO.?LABORE", "regex",
     "Pessoal e pró-labore", None, 70, 0.85),
    ("ALUGUEL", "keyword", "Ocupação (aluguel, condomínio)", None, 60, 0.85),
    ("CONDOMINIO", "keyword", "Ocupação (aluguel, condomínio)", None, 60, 0.85),
    ("IPTU", "keyword", "Ocupação (aluguel, condomínio)", None, 60, 0.85),
    (r"\bENERGIA\b|\bCPFL\b|\bENEL\b|\bLIGHT\b|\bSABESP\b|\bCOPASA\b|"
     r"\bVIVO\b|\bCLARO\b|\bTIM\b|TELEFONICA", "regex",
     "Utilidades e telecom", None, 55, 0.85),
    (r"\bUBER\b|\b99APP\b|\bPOSTO\b|ESTACIONAMENTO|PEDAGIO|\bIPVA\b", "regex",
     "Transporte e logística", None, 55, 0.85),
    (r"\bIFOOD\b|RESTAURANTE|PADARIA|SUPERMERC|\bMERCADO\b", "regex",
     "Alimentação", None, 50, 0.80),
    (r"\bGOOGLE\b|\bMICROSOFT\b|\bADOBE\b|\bAWS\b|\bGITHUB\b|ASSINATURA", "regex",
     "Software e assinaturas", None, 50, 0.85),
    # Recebimentos genéricos: confiança abaixo do limiar de propósito —
    # receita exige conferência humana no MVP.
    (r"\bRECEBIMENTO\b|\bRECEB\b|CREDITO VENDA|VENDA CARTAO", "regex",
     "Vendas e serviços", None, 40, 0.75),
    # Transferência explícita entre contas próprias.
    (r"TRANSF.{0,30}(PROPRIA|MESMA TITULARIDADE|ENTRE CONTAS)", "regex",
     "Transferências entre contas próprias", "transferencia", 35, 0.85),
    # TED/DOC/TRANSF genéricos são ambíguos (podem ser pagamento a
    # fornecedor): ficam em "A classificar" com tipo transferência para a
    # detecção de espelho, e a confiança baixa força revisão humana.
    (r"\bTRANSFERENCIA\b|\bTRANSF\b|\bTED\b|\bDOC\b", "regex",
     "A classificar", "transferencia", 30, 0.50),
]


def seed_globais(db: Session) -> None:
    categorias: dict[str, Categoria] = {}
    for nome, tipo, fora in CATEGORIAS_GLOBAIS:
        cat = (
            db.query(Categoria)
            .filter(Categoria.nome == nome, Categoria.empresa_id.is_(None))
            .one_or_none()
        )
        if cat is None:
            cat = Categoria(nome=nome, tipo=tipo, fora_do_resultado=fora)
            db.add(cat)
            db.flush()
        categorias[nome] = cat

    for padrao, tipo_padrao, nome_cat, tipo_trans, prioridade, confianca in REGRAS_GLOBAIS:
        existe = (
            db.query(RegraCategorizacao)
            .filter(
                RegraCategorizacao.padrao == padrao,
                RegraCategorizacao.empresa_id.is_(None),
            )
            .one_or_none()
        )
        if existe is None:
            db.add(
                RegraCategorizacao(
                    padrao=padrao,
                    tipo_padrao=tipo_padrao,
                    categoria_id=categorias[nome_cat].id,
                    tipo_transacao=tipo_trans,
                    prioridade=prioridade,
                    confianca=confianca,
                )
            )
    db.commit()
