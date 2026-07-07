import type { ReactNode } from 'react';
import type { BadgeVariant } from '../../utils/impact';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  positive: 'bg-positive-soft text-positive border-positive/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  critical: 'bg-danger text-white border-danger',
  info: 'bg-info-soft text-info border-info/20',
  neutral: 'bg-canvas text-ink-muted border-line',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function Badge({ variant = 'neutral', children, className = '', icon }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
