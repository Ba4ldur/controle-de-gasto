"""Parser de OFX 1.x/2.x (SGML ou XML), formato amplamente exportado pelos
bancos brasileiros.

Parser próprio e minimalista: extrai os blocos <STMTTRN> com tolerância a
tags SGML não fechadas. TRNTYPE vira dica de tipo para a categorização.
"""

import re

from app.parsers.base import ErroParser, LinhaRejeitada, ResultadoExtracao, TransacaoBruta

_RE_STMTTRN = re.compile(r"<STMTTRN>(.*?)(?:</STMTTRN>|(?=<STMTTRN>)|\Z)", re.S | re.I)

# TRNTYPE do padrão OFX -> dica de tipo interna
_TRNTYPE_HINT = {
    "DEBIT": "D", "CREDIT": "C", "XFER": "transferencia",
    "FEE": "tarifa", "SRVCHG": "tarifa", "INT": "C", "DIV": "C",
    "PAYMENT": "D", "CASH": "D", "ATM": "D", "POS": "D", "CHECK": "D",
    "DIRECTDEBIT": "D", "DIRECTDEP": "C", "REPEATPMT": "D", "OTHER": None,
}


def _decodificar(conteudo: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return conteudo.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ErroParser("Não foi possível decodificar o arquivo OFX.")


def _campo(bloco: str, tag: str) -> str | None:
    m = re.search(rf"<{tag}>([^<\r\n]*)", bloco, re.I)
    if not m:
        return None
    valor = m.group(1).strip()
    return valor or None


def parse(conteudo: bytes, mapeamento: dict | None = None) -> ResultadoExtracao:
    texto = _decodificar(conteudo)
    if "<OFX" not in texto.upper():
        raise ErroParser("Arquivo não parece ser OFX (bloco <OFX> ausente).")

    resultado = ResultadoExtracao()
    blocos = _RE_STMTTRN.findall(texto)
    if not blocos:
        raise ErroParser("OFX sem transações (<STMTTRN> não encontrado).")

    for n, bloco in enumerate(blocos, start=1):
        data = _campo(bloco, "DTPOSTED")
        valor = _campo(bloco, "TRNAMT")
        memo = _campo(bloco, "MEMO")
        nome = _campo(bloco, "NAME")
        trntype = (_campo(bloco, "TRNTYPE") or "").upper()

        if not data or not valor:
            resultado.rejeitadas.append(
                LinhaRejeitada(n, "transação OFX sem data ou valor")
            )
            continue

        descricao = memo or nome or ""
        if memo and nome and nome not in memo:
            descricao = f"{nome} {memo}"

        resultado.transacoes.append(
            TransacaoBruta(
                linha_origem=n,
                data=data[:8],  # DTPOSTED = AAAAMMDD[HHMMSS[.XXX][TZ]]
                descricao=descricao,
                valor=valor,
                tipo_hint=_TRNTYPE_HINT.get(trntype),
            )
        )
    return resultado
