import type { GutMatrixItem } from '../types/diagnosis';

/** Limita um valor GUT ao intervalo 1..5. */
function clampGut(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

/** Calcula a pontuação GUT = Gravidade x Urgência x Tendência. */
export function calculateGutScore(gravity: number, urgency: number, trend: number): number {
  return clampGut(gravity) * clampGut(urgency) * clampGut(trend);
}

/**
 * Ordena a matriz GUT por pontuação (desc) e reatribui a ordem de prioridade.
 * Recalcula o score a partir de G/U/T para garantir consistência.
 */
export function sortGutMatrix(items: GutMatrixItem[]): GutMatrixItem[] {
  return [...items]
    .map((item) => ({
      ...item,
      gravity: clampGut(item.gravity),
      urgency: clampGut(item.urgency),
      trend: clampGut(item.trend),
      score: calculateGutScore(item.gravity, item.urgency, item.trend),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, priority_order: index + 1 }));
}
