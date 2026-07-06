"""Deduplicação por hash determinístico (seção 5, passo 7 da especificação).

hash = sha256(conta | data | valor | descrição normalizada | nº da ocorrência)

O índice de ocorrência é calculado DENTRO do lote importado: duas transações
legítimas idênticas no mesmo dia recebem índices 0 e 1 (ambas entram), e a
reimportação do mesmo arquivo — ou de outro arquivo com período sobreposto —
reproduz os mesmos hashes e colide com o que já existe (não duplica).
"""

import hashlib
from collections import defaultdict

from app.services.normalization import TransacaoNormalizada


def hash_transacao(conta_id: str, transacao: TransacaoNormalizada, ocorrencia: int) -> str:
    base = "|".join(
        (
            conta_id,
            transacao.data.isoformat(),
            f"{transacao.valor:.2f}",
            transacao.descricao_normalizada,
            str(ocorrencia),
        )
    )
    return hashlib.sha256(base.encode()).hexdigest()


def atribuir_hashes(conta_id: str, transacoes: list[TransacaoNormalizada]) -> list[str]:
    """Retorna o hash de cada transação, na mesma ordem do lote."""
    contadores: dict[tuple, int] = defaultdict(int)
    hashes = []
    for t in transacoes:
        chave = (t.data, t.valor_centavos, t.descricao_normalizada)
        hashes.append(hash_transacao(conta_id, t, contadores[chave]))
        contadores[chave] += 1
    return hashes
