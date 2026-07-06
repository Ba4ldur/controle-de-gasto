"""Normalização de datas, valores e descrições para o formato único interno.

Cobertura deliberada dos formatos usuais de bancos brasileiros:
datas dd/mm/aaaa (e variações), serial do Excel; valores "1.234,56",
"-1234.56", "1.234,56-", "(1.234,56)", "R$ …", sufixo/prefixo D/C;
colunas separadas de débito e crédito.
"""

import re
import unicodedata
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from app.masking import mascarar
from app.parsers.base import TransacaoBruta


class ErroNormalizacao(Exception):
    pass


_FORMATOS_DATA = (
    "%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y", "%d-%m-%y",
    "%Y-%m-%d", "%Y%m%d", "%d.%m.%Y",
)
_EXCEL_EPOCH = date(1899, 12, 30)
_RE_MILHARES_PONTO = re.compile(r"^\d{1,3}(\.\d{3})+$")


def normalizar_data(bruta) -> date:
    if isinstance(bruta, datetime):
        return bruta.date()
    if isinstance(bruta, date):
        return bruta
    if isinstance(bruta, (int, float)) and 20000 <= bruta <= 80000:
        return _EXCEL_EPOCH + timedelta(days=int(bruta))
    texto = str(bruta).strip()
    for formato in _FORMATOS_DATA:
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue
    raise ErroNormalizacao(f"data em formato não reconhecido")


def normalizar_valor(bruto, negativo: bool = False) -> Decimal:
    """Converte para Decimal com 2 casas. ``negativo`` força saída (< 0)."""
    if isinstance(bruto, Decimal):
        valor = bruto
    elif isinstance(bruto, (int, float)):
        valor = Decimal(str(bruto))
    else:
        texto = str(bruto).strip().upper().replace("R$", "").strip()
        sinal = 1
        if texto.startswith("(") and texto.endswith(")"):
            sinal, texto = -1, texto[1:-1].strip()
        if texto.endswith("-"):
            sinal, texto = -1, texto[:-1].strip()
        if texto.endswith("D"):
            sinal, texto = -1, texto[:-1].strip()
        elif texto.endswith("C"):
            texto = texto[:-1].strip()
        if texto.startswith("-"):
            sinal, texto = -1, texto[1:].strip()
        texto = texto.replace(" ", "")
        if "," in texto:
            texto = texto.replace(".", "").replace(",", ".")
        elif "." in texto and _RE_MILHARES_PONTO.match(texto):
            texto = texto.replace(".", "")
        try:
            valor = Decimal(texto) * sinal
        except InvalidOperation as exc:
            raise ErroNormalizacao("valor em formato não reconhecido") from exc
    if negativo and valor > 0:
        valor = -valor
    return valor.quantize(Decimal("0.01"))


def normalizar_descricao(bruta: str) -> str:
    """Maiúsculas, sem acentos, espaços colapsados e dados sensíveis mascarados."""
    texto = unicodedata.normalize("NFKD", str(bruta or ""))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    texto = mascarar(texto.upper())
    return re.sub(r"\s+", " ", texto).strip()


def aplicar_sinal_por_hint(valor: Decimal, tipo_hint: str | None) -> Decimal:
    """Coluna D/C (ou TRNTYPE) corrige o sinal quando o extrato traz valores absolutos."""
    if not tipo_hint:
        return valor
    hint = tipo_hint.strip().upper()
    if hint in ("D", "DEBITO", "DÉBITO", "DEB") and valor > 0:
        return -valor
    if hint in ("C", "CREDITO", "CRÉDITO", "CRED") and valor < 0:
        # crédito nunca é negativo; extratos com coluna D/C usam valor absoluto
        return -valor
    return valor


class TransacaoNormalizada:
    __slots__ = (
        "linha_origem", "data", "descricao_original", "descricao_normalizada",
        "valor", "saldo", "tipo_hint",
    )

    def __init__(self, linha_origem, data, descricao_original,
                 descricao_normalizada, valor, saldo, tipo_hint):
        self.linha_origem = linha_origem
        self.data = data
        self.descricao_original = descricao_original
        self.descricao_normalizada = descricao_normalizada
        self.valor = valor
        self.saldo = saldo
        self.tipo_hint = tipo_hint

    @property
    def valor_centavos(self) -> int:
        return int(self.valor * 100)

    @property
    def saldo_centavos(self) -> int | None:
        return None if self.saldo is None else int(self.saldo * 100)


def normalizar_transacao(bruta: TransacaoBruta) -> TransacaoNormalizada:
    data = normalizar_data(bruta.data)

    if bruta.valor is not None:
        valor = normalizar_valor(bruta.valor)
        valor = aplicar_sinal_por_hint(valor, bruta.tipo_hint)
    elif bruta.debito is not None:
        valor = normalizar_valor(bruta.debito, negativo=True)
    elif bruta.credito is not None:
        valor = normalizar_valor(bruta.credito)
        if valor < 0:
            valor = -valor
    else:
        raise ErroNormalizacao("transação sem valor")

    saldo = None
    if bruta.saldo is not None:
        try:
            saldo = normalizar_valor(bruta.saldo)
        except ErroNormalizacao:
            saldo = None  # saldo é opcional; não rejeita a transação

    return TransacaoNormalizada(
        linha_origem=bruta.linha_origem,
        data=data,
        descricao_original=str(bruta.descricao or "").strip(),
        descricao_normalizada=normalizar_descricao(bruta.descricao),
        valor=valor,
        saldo=saldo,
        tipo_hint=bruta.tipo_hint,
    )
