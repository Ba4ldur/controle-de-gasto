"""Parser de extratos CSV (delimitador ; , ou tab; UTF-8 ou Latin-1)."""

import csv
import io

from app.parsers.base import ErroParser, ResultadoExtracao
from app.parsers.tabular import extrair_linhas


def _decodificar(conteudo: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return conteudo.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ErroParser("Não foi possível decodificar o arquivo CSV.")


def _detectar_delimitador(texto: str) -> str:
    amostra = "\n".join(texto.splitlines()[:20])
    try:
        return csv.Sniffer().sniff(amostra, delimiters=";,\t").delimiter
    except csv.Error:
        # Fallback: o mais frequente na amostra (bancos BR preferem ';').
        contagens = {d: amostra.count(d) for d in (";", ",", "\t")}
        return max(contagens, key=contagens.get)


def parse(conteudo: bytes, mapeamento: dict | None = None) -> ResultadoExtracao:
    texto = _decodificar(conteudo)
    delimitador = _detectar_delimitador(texto)
    linhas = list(csv.reader(io.StringIO(texto), delimiter=delimitador))
    if not linhas:
        raise ErroParser("Arquivo CSV vazio.")
    return extrair_linhas(linhas, mapeamento)
