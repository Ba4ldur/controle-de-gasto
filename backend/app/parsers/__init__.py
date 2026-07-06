"""Registro de parsers e detecção de formato por conteúdo + extensão."""

from app.parsers import csv_parser, ofx_parser, xlsx_parser
from app.parsers.base import ErroParser

_PARSERS = {"csv": csv_parser.parse, "xlsx": xlsx_parser.parse, "ofx": ofx_parser.parse}
FORMATOS_SUPORTADOS = tuple(_PARSERS)


def detectar_formato(nome_arquivo: str, conteudo: bytes) -> str:
    """Extensão orienta, mas o conteúdo decide (magic bytes / marcadores)."""
    if conteudo[:4] == b"PK\x03\x04":
        return "xlsx"
    cabecalho = conteudo[:2048].decode("latin-1", errors="ignore").upper()
    if "<OFX" in cabecalho or "OFXHEADER" in cabecalho:
        return "ofx"
    extensao = nome_arquivo.rsplit(".", 1)[-1].lower() if "." in nome_arquivo else ""
    if extensao in _PARSERS:
        return extensao
    if extensao in ("txt", ""):
        return "csv"
    raise ErroParser(
        f"Formato não suportado: .{extensao}. Aceitos na Fase 1: CSV, XLSX e OFX."
    )


def get_parser(formato: str):
    return _PARSERS[formato]
