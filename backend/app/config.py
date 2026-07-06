"""Configuração central do módulo de análise de extrato bancário."""

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    database_url: str = field(
        default_factory=lambda: os.environ.get(
            "DATABASE_URL", "sqlite:///./attivare.db"
        )
    )
    # Sessões de login expiram após este período.
    sessao_ttl_horas: int = int(os.environ.get("SESSAO_TTL_HORAS", "12"))
    # Transações com confiança abaixo do limiar entram na fila de revisão.
    limiar_revisao: float = float(os.environ.get("LIMIAR_REVISAO", "0.80"))
    # Tamanho máximo aceito para upload de extrato (bytes).
    upload_max_bytes: int = int(os.environ.get("UPLOAD_MAX_BYTES", str(10 * 1024 * 1024)))
    # Janela (dias) para heurística de possível duplicidade e de
    # transferência interna espelhada.
    janela_duplicidade_dias: int = 3


settings = Settings()
