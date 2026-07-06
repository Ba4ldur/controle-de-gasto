"""Mascaramento de dados sensíveis (LGPD).

Aplicado na ingestão (descrição normalizada) e em toda mensagem de log.
CPF, CNPJ, e-mails (chaves Pix) e sequências longas de dígitos (contas,
agências, protocolos, telefones) nunca chegam a logs nem à interface.

Valores monetários não são afetados: nos extratos eles vêm em campo próprio
e, em descrições, aparecem em grupos de até 4 dígitos ("1.234,56").
"""

import re

_RE_CPF = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
_RE_CNPJ = re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b")
_RE_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
# Sequências de 5+ dígitos: contas, agências, protocolos, telefones.
_RE_DIGITOS_LONGOS = re.compile(r"\d{5,}")

MASCARA_CPF = "***.***.***-**"
MASCARA_CNPJ = "**.***.***/****-**"
MASCARA_EMAIL = "***@***"
MASCARA_DIGITOS = "####"


def mascarar(texto: str) -> str:
    """Remove identificadores sensíveis de um texto livre."""
    if not texto:
        return texto
    # Ordem importa: CNPJ (14 dígitos) antes de CPF (11) antes do genérico.
    texto = _RE_CNPJ.sub(MASCARA_CNPJ, texto)
    texto = _RE_CPF.sub(MASCARA_CPF, texto)
    texto = _RE_EMAIL.sub(MASCARA_EMAIL, texto)
    texto = _RE_DIGITOS_LONGOS.sub(MASCARA_DIGITOS, texto)
    return texto


def contem_dado_sensivel(texto: str) -> bool:
    """Usado em testes e verificações defensivas."""
    if not texto:
        return False
    return bool(
        _RE_CNPJ.search(texto)
        or _RE_CPF.search(texto)
        or _RE_EMAIL.search(texto)
        or _RE_DIGITOS_LONGOS.search(texto)
    )
