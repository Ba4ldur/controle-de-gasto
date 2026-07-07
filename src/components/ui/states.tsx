import type { ReactNode } from 'react';
import { AlertIcon, SpinnerIcon } from './icons';

/** Estado de carregamento reutilizável. */
export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-muted">
      <SpinnerIcon className="h-7 w-7 text-brand-700" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Estado vazio reutilizável. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-surface py-16 text-center">
      {icon && <span className="text-ink-soft">{icon}</span>}
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

/** Estado de erro reutilizável. */
export function ErrorState({ title = 'Ocorreu um erro', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/20 bg-danger-soft py-12 text-center">
      <AlertIcon className="h-7 w-7 text-danger" />
      <div>
        <p className="text-sm font-semibold text-danger">{title}</p>
        <p className="mt-1 max-w-md text-sm text-ink-muted">{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

/** Faixa de alerta inline (para avisos e mensagens contextuais). */
export function InlineAlert({
  variant = 'warning',
  children,
}: {
  variant?: 'warning' | 'danger' | 'info' | 'positive';
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    warning: 'border-warning/30 bg-warning-soft text-warning',
    danger: 'border-danger/30 bg-danger-soft text-danger',
    info: 'border-info/30 bg-info-soft text-info',
    positive: 'border-positive/30 bg-positive-soft text-positive',
  };
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${styles[variant]}`}>
      <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div className="text-ink">{children}</div>
    </div>
  );
}
