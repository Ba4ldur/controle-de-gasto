import { Badge } from './Badge';
import { getImpactBadgeVariant, IMPACT_LABELS } from '../../utils/impact';
import type { ImpactLevel } from '../../types/diagnosis';

interface RiskBadgeProps {
  level: ImpactLevel | null | undefined;
  className?: string;
}

/** Badge dedicado a nível de impacto/risco, com rótulo em PT-BR. */
export function RiskBadge({ level, className }: RiskBadgeProps) {
  if (!level) {
    return (
      <Badge variant="neutral" className={className}>
        Não avaliado
      </Badge>
    );
  }
  return (
    <Badge variant={getImpactBadgeVariant(level)} className={className}>
      {IMPACT_LABELS[level]}
    </Badge>
  );
}
