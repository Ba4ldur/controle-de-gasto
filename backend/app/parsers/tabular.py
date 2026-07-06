"""Detecção de cabeçalho e extração de linhas para formatos tabulares
(CSV e XLSX compartilham esta lógica).

Bancos brasileiros variam os nomes das colunas; o mapeamento abaixo cobre os
padrões mais comuns. Linhas de resumo de saldo ("SALDO ANTERIOR", "SALDO DO
DIA"…) não são transações e são puladas silenciosamente.
"""

import unicodedata

from app.parsers.base import ErroParser, LinhaRejeitada, ResultadoExtracao, TransacaoBruta

# nome canônico -> apelidos aceitos (normalizados: minúsculo, sem acento)
_APELIDOS = {
    "data": {"data", "data lancamento", "data do lancamento", "data mov",
             "data movimento", "dt", "dt. movimento", "date"},
    "descricao": {"descricao", "historico", "lancamento", "memo", "detalhes",
                  "descricao/historico", "historico completo", "movimentacao",
                  "titulo", "identificacao"},
    "valor": {"valor", "valor (r$)", "valor r$", "montante", "quantia", "amount"},
    "debito": {"debito", "debitos", "saida", "saidas", "valor debito"},
    "credito": {"credito", "creditos", "entrada", "entradas", "valor credito"},
    "saldo": {"saldo", "saldos", "saldo (r$)", "balance"},
    "dc": {"d/c", "dc", "tipo", "natureza", "deb/cred", "sinal"},
    "documento": {"documento", "num. documento", "numero", "docto", "cod.", "codigo"},
}

_PREFIXOS_SALDO = ("SALDO", "SDO ", "S A L D O")


def _normalizar_nome(nome) -> str:
    if nome is None:
        return ""
    texto = str(nome).strip().lower()
    texto = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in texto if not unicodedata.combining(c))


def detectar_cabecalho(linhas: list[list]) -> tuple[int, dict[str, int]]:
    """Procura, nas primeiras linhas, uma que mapeie as colunas mínimas.

    Retorna (índice da linha de cabeçalho, {campo canônico: índice da coluna}).
    Exige 'data' + 'descricao' + ('valor' ou 'debito'/'credito').
    """
    for idx, linha in enumerate(linhas[:25]):
        mapa: dict[str, int] = {}
        for col, celula in enumerate(linha):
            nome = _normalizar_nome(celula)
            if not nome:
                continue
            for canonico, apelidos in _APELIDOS.items():
                if nome in apelidos and canonico not in mapa:
                    mapa[canonico] = col
        if "data" in mapa and "descricao" in mapa and (
            "valor" in mapa or ("debito" in mapa and "credito" in mapa)
        ):
            return idx, mapa
    raise ErroParser(
        "Não foi possível identificar as colunas do extrato (esperado ao menos: "
        "data, descrição e valor — ou débito/crédito). Informe o mapeamento de "
        "colunas manualmente."
    )


def _vazio(celula) -> bool:
    return celula is None or str(celula).strip() == ""


def _linha_de_saldo(descricao: str) -> bool:
    return str(descricao).strip().upper().startswith(_PREFIXOS_SALDO)


def extrair_linhas(
    linhas: list[list],
    mapeamento: dict[str, int] | None = None,
) -> ResultadoExtracao:
    """Extrai transações brutas de linhas tabulares.

    ``mapeamento`` permite pular a detecção automática (mapeamento manual
    vindo da interface): {campo: índice de coluna, "linha_cabecalho": n}.
    """
    if mapeamento:
        mapa = {k: v for k, v in mapeamento.items() if k != "linha_cabecalho"}
        inicio = int(mapeamento.get("linha_cabecalho", -1)) + 1
    else:
        idx_cab, mapa = detectar_cabecalho(linhas)
        inicio = idx_cab + 1

    resultado = ResultadoExtracao()
    for i in range(inicio, len(linhas)):
        linha = linhas[i]
        numero = i + 1  # 1-indexado, como o usuário vê no arquivo

        def celula(campo):
            col = mapa.get(campo)
            if col is None or col >= len(linha):
                return None
            return linha[col]

        data, descricao = celula("data"), celula("descricao")
        valor, debito, credito = celula("valor"), celula("debito"), celula("credito")

        if all(_vazio(c) for c in linha):
            continue
        if _vazio(descricao) and _vazio(valor) and _vazio(debito) and _vazio(credito):
            continue  # linha decorativa/rodapé
        if not _vazio(descricao) and _linha_de_saldo(str(descricao)):
            continue  # resumo de saldo, não é transação
        if _vazio(data):
            resultado.rejeitadas.append(LinhaRejeitada(numero, "data ausente"))
            continue
        if _vazio(valor) and _vazio(debito) and _vazio(credito):
            resultado.rejeitadas.append(LinhaRejeitada(numero, "valor ausente"))
            continue

        dc = celula("dc")
        resultado.transacoes.append(
            TransacaoBruta(
                linha_origem=numero,
                data=data,
                descricao="" if _vazio(descricao) else str(descricao).strip(),
                valor=None if _vazio(valor) else valor,
                debito=None if _vazio(debito) else debito,
                credito=None if _vazio(credito) else credito,
                saldo=None if _vazio(celula("saldo")) else celula("saldo"),
                tipo_hint=None if _vazio(dc) else str(dc).strip(),
            )
        )
    return resultado
