"""Parser de extratos XLSX via openpyxl (primeira planilha, modo somente leitura)."""

import io

import openpyxl

from app.parsers.base import ErroParser, ResultadoExtracao
from app.parsers.tabular import extrair_linhas


def parse(conteudo: bytes, mapeamento: dict | None = None) -> ResultadoExtracao:
    try:
        wb = openpyxl.load_workbook(
            io.BytesIO(conteudo), read_only=True, data_only=True
        )
    except Exception as exc:
        raise ErroParser(f"Arquivo XLSX inválido: {type(exc).__name__}") from exc
    try:
        planilha = wb.worksheets[0]
        linhas = [list(linha) for linha in planilha.iter_rows(values_only=True)]
    finally:
        wb.close()
    if not linhas:
        raise ErroParser("Planilha vazia.")
    return extrair_linhas(linhas, mapeamento)
