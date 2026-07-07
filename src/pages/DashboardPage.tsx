import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DataTable, type Column } from '../components/ui/DataTable';
import { RiskBadge } from '../components/ui/RiskBadge';
import { Badge } from '../components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/states';
import { PlusIcon, ReportIcon, BuildingIcon } from '../components/ui/icons';
import { useAsync } from '../hooks/useAsync';
import { companyService } from '../services/companyService';
import { analysisService } from '../services/analysisService';
import { getStatusBadgeVariant, STATUS_LABELS } from '../utils/impact';
import { formatDateTimeBR, truncate } from '../utils/formatting';
import type { Analysis, Company } from '../types/database';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(async () => {
    const [companies, analyses] = await Promise.all([
      companyService.list(),
      analysisService.list(),
    ]);
    return { companies, analyses };
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const companies = data?.companies ?? [];
  const analyses = data?.analyses ?? [];
  const companyById = new Map(companies.map((c) => [c.id, c]));

  const emRevisao = analyses.filter((a) => a.status === 'em_revisao').length;
  const finalizadas = analyses.filter((a) => a.status === 'finalizado').length;
  const altoCritico = analyses.filter(
    (a) => a.impact_level === 'alto' || a.impact_level === 'critico',
  ).length;

  const recentes = analyses.slice(0, 6);

  const columns: Column<Analysis>[] = [
    {
      key: 'title',
      header: 'Análise',
      render: (a) => (
        <div>
          <p className="font-medium text-ink">{truncate(a.title ?? 'Sem título', 48)}</p>
          <p className="text-xs text-ink-muted">
            {truncate(companyById.get(a.company_id)?.razao_social ?? '—', 42)}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => (
        <Badge variant={getStatusBadgeVariant(a.status)}>{STATUS_LABELS[a.status]}</Badge>
      ),
    },
    {
      key: 'impact',
      header: 'Impacto',
      render: (a) => <RiskBadge level={a.impact_level} />,
    },
    {
      key: 'date',
      header: 'Atualizada',
      align: 'right',
      render: (a) => <span className="text-xs text-ink-muted">{formatDateTimeBR(a.updated_at)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral das empresas e análises da Reforma Tributária."
        actions={
          <button className="btn-primary" onClick={() => navigate('/analises/nova')}>
            <PlusIcon className="h-4 w-4" /> Nova análise
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Empresas" value={companies.length} icon={<BuildingIcon className="h-5 w-5" />} />
        <StatCard label="Análises" value={analyses.length} icon={<ReportIcon className="h-5 w-5" />} />
        <StatCard label="Em revisão" value={emRevisao} accent="warning" />
        <StatCard label="Finalizadas" value={finalizadas} accent="positive" />
        <StatCard label="Impacto alto/crítico" value={altoCritico} accent="danger" />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Últimas análises</h2>
          <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => navigate('/analises')}>
            Ver todas
          </button>
        </div>
        {recentes.length === 0 ? (
          <EmptyState
            title="Nenhuma análise ainda"
            description="Cadastre uma empresa e gere seu primeiro diagnóstico preliminar."
            icon={<ReportIcon className="h-8 w-8" />}
            action={
              <button className="btn-primary" onClick={() => navigate('/analises/nova')}>
                <PlusIcon className="h-4 w-4" /> Nova análise
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={recentes}
            rowKey={(a) => a.id}
            onRowClick={(a) => navigate(`/analises/${a.id}`)}
          />
        )}
      </section>

      {companies.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Empresas recentes</h2>
            <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => navigate('/empresas')}>
              Ver todas
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {companies.slice(0, 3).map((c: Company) => (
              <button
                key={c.id}
                onClick={() => navigate(`/empresas/${c.id}`)}
                className="card p-4 text-left transition-shadow hover:shadow-md"
              >
                <p className="font-medium text-ink">{truncate(c.razao_social ?? 'Sem razão social', 40)}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-muted">{c.cnpj ?? '—'}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  {c.municipio ?? '—'}/{c.uf ?? '—'} · {c.regime_tributario}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
