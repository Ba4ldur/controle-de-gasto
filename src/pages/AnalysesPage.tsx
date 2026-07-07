import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { RiskBadge } from '../components/ui/RiskBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/states';
import { PlusIcon, ReportIcon } from '../components/ui/icons';
import { useAsync } from '../hooks/useAsync';
import { analysisService } from '../services/analysisService';
import { companyService } from '../services/companyService';
import { getStatusBadgeVariant, STATUS_LABELS } from '../utils/impact';
import type { AnalysisStatus } from '../types/database';
import { formatDateTimeBR, truncate } from '../utils/formatting';
import type { Analysis } from '../types/database';

const STATUS_FILTERS: { value: AnalysisStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'em_revisao', label: 'Em revisão' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'erro', label: 'Erro' },
];

export function AnalysesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<AnalysisStatus | 'todos'>('todos');

  const { data, loading, error, reload } = useAsync(async () => {
    const [analyses, companies] = await Promise.all([
      analysisService.list(),
      companyService.list(),
    ]);
    return { analyses, companies };
  }, []);

  const companyName = useMemo(() => {
    const map = new Map((data?.companies ?? []).map((c) => [c.id, c.razao_social ?? '—']));
    return (id: string) => map.get(id) ?? '—';
  }, [data]);

  const filtered = useMemo(() => {
    const list = data?.analyses ?? [];
    return statusFilter === 'todos' ? list : list.filter((a) => a.status === statusFilter);
  }, [data, statusFilter]);

  const columns: Column<Analysis>[] = [
    {
      key: 'title',
      header: 'Análise',
      render: (a) => (
        <div>
          <p className="font-medium text-ink">{truncate(a.title ?? 'Sem título', 46)}</p>
          <p className="text-xs text-ink-muted">{truncate(companyName(a.company_id), 42)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (a) => <Badge variant={getStatusBadgeVariant(a.status)}>{STATUS_LABELS[a.status]}</Badge> },
    { key: 'impact', header: 'Impacto', render: (a) => <RiskBadge level={a.impact_level} /> },
    { key: 'type', header: 'Tipo', render: (a) => <span className="text-xs text-ink-muted">{a.analysis_type ?? '—'}</span> },
    { key: 'date', header: 'Atualizada', align: 'right', render: (a) => <span className="text-xs text-ink-muted">{formatDateTimeBR(a.updated_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Análises"
        description="Todos os diagnósticos gerados."
        actions={
          <button className="btn-primary" onClick={() => navigate('/analises/nova')}>
            <PlusIcon className="h-4 w-4" /> Nova análise
          </button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.analyses.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhuma análise ainda"
          description="Crie uma análise a partir do cartão CNPJ de uma empresa."
          icon={<ReportIcon className="h-8 w-8" />}
          action={
            <button className="btn-primary" onClick={() => navigate('/analises/nova')}>
              <PlusIcon className="h-4 w-4" /> Nova análise
            </button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-brand-800 text-white'
                    : 'bg-surface text-ink-muted ring-1 ring-inset ring-line hover:bg-canvas'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(a) => a.id}
            onRowClick={(a) => navigate(`/analises/${a.id}`)}
            emptyMessage="Nenhuma análise com este status."
          />
        </>
      )}
    </div>
  );
}
