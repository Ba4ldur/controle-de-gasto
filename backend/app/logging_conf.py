"""Logging com mascaramento obrigatório de dados sensíveis.

Todo módulo do app obtém seu logger via ``get_logger(__name__)``. O adapter
mascara a mensagem e os argumentos antes de o registro existir, então nem
handlers nem ferramentas de captura veem dados sensíveis.
"""

import logging

from app.masking import mascarar


class _MaskingAdapter(logging.LoggerAdapter):
    def process(self, msg, kwargs):
        return mascarar(str(msg)), kwargs

    def log(self, level, msg, *args, **kwargs):
        if args:
            # Resolve o template antes de mascarar, para cobrir os argumentos.
            try:
                msg = str(msg) % args
            except (TypeError, ValueError):
                msg = f"{msg} {args}"
            args = ()
        super().log(level, msg, *args, **kwargs)


def get_logger(nome: str) -> logging.LoggerAdapter:
    return _MaskingAdapter(logging.getLogger(nome), {})


def configurar_logging(nivel=logging.INFO):
    logging.basicConfig(
        level=nivel,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
