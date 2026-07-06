"""Contratos comuns dos parsers de extrato.

Cada parser converte o arquivo bruto em ``TransacaoBruta`` sem interpretar
formatos de data/valor — isso é papel da normalização, que é única para
todos os formatos.
"""

from dataclasses import dataclass, field


class ErroParser(Exception):
    """Arquivo ilegível ou sem as colunas mínimas identificáveis."""


@dataclass
class TransacaoBruta:
    linha_origem: int
    data: object  # str | date | datetime | número serial Excel
    descricao: str
    valor: object | None = None  # str | número; None quando débito/crédito separados
    debito: object | None = None
    credito: object | None = None
    saldo: object | None = None
    # 'D'/'C' de coluna própria, ou TRNTYPE do OFX (debit, credit, xfer, fee…)
    tipo_hint: str | None = None


@dataclass
class LinhaRejeitada:
    linha: int
    motivo: str  # nunca incluir o conteúdo da linha (pode ter dado sensível)


@dataclass
class ResultadoExtracao:
    transacoes: list[TransacaoBruta] = field(default_factory=list)
    rejeitadas: list[LinhaRejeitada] = field(default_factory=list)
