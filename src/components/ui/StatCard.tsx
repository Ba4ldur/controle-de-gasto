import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: 'default' | 'positive' | 'warning' | 'danger';
}

const ACCENT: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'text-brand-800',
  positive: 'text-positive',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function StatCard({ label, value, hint, icon, accent = 'default' }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="label-base mb-0">{label}</p>
        {icon && <span className="text-ink-soft">{icon}</span>}
      </div>
      <p className={`mt-2 font-mono text-3xl font-semibold tnum ${ACCENT[accent]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
