import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { RiskBadge } from '../components/ui/RiskBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/states';
import { PlusIcon, SearchIcon, BuildingIcon } from '../components/ui/icons';
import { useAsync } from '../hooks/useAsync';
import { companyService } from '../services/companyService';
import { analysisService } from '../services/analysisService';
import { formatCNPJ, formatDateTimeBR, slugCompare, truncate } from '../utils/formatting';
import type { Analysis, Company } from '../types/database';
import type { ImpactLevel } from '../types/diagnosis';

interface CompanyRow extends Company {
  lastAnalysisAt: string | null;
  lastImpact: ImpactLevel | null;
  analysisCount: number;
}

export function CompaniesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data, loading, error, reload } = useAsync(async () => {
    const [companies, analyses] = await Promise.all([
      companyService.list(),
      analysisService.list(),
    ]);
    return { companies, analyses };
  }, []);

  const rows = useMemo<CompanyRow[]>(() => {
    if (!data) return [];
    const byCompany = new Map<string, Analysis[]>();
    data.analyses.forEach((a) => {
      const list = byCompany.get(a.company_id) ?? [];
      list.push(a);
      byCompany.set(a.company_id, list);
    });
    return data.companies.map((c) => {
      const list = (byCompany.get(c.id) ?? []).sort((a, b) =>
        (b.created_at ?? '').localeCompare(a.created_at ?? ''),
      );
      const last = list[0];
      return {
        ...c,
        lastAnalysisAt: last?.updated_at ?? null,
        lastImpact: last?.impact_level ?? null,
        analysisCount: list.length,
      };
    });
  }, [data]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = slugCompare(query);
    return rows.filter((r) =>
      [r.razao_social, r.nome_fantasia, r.cnpj, r.municipio, r.uf]
        .filter(Boolean)
        .some((v) => slugCompare(String(v)).includes(q)),
    );
  }, [rows, query]);

  const columns: Column<CompanyRow>[] = [
    {
      key: 'razao',
      header: 'Razão social',
      render: (c) => (
        <div>
          <p className="font-medium text-ink">{truncate(c.razao_social ?? 'Sem razão social', 44)}</p>
          <p className="font-mono text-xs text-ink-muted">{formatCNPJ(c.cnpj) || '—'}</p>
        </div>
      ),
    },
    {
      key: 'local',
      header: 'Município/UF',
      render: (c) => (
        <span className="text-sm text-ink">
          {c.municipio ?? '—'}
          {c.uf ? `/${c.uf}` : ''}
        </span>
      ),
    },
    {
      key: 'atividade',
      header: 'Atividade principal',
      render: (c) => (
        <span className="text-sm text-ink-muted">{truncate(c.cnae_principal_descricao ?? '—', 40)}</span>
      ),
    },
    {
      key: 'ultima',
      header: 'Última análise',
      render: (c) => (
        <span className="text-xs text-ink-muted">
          {c.lastAnalysisAt ? formatDateTimeBR(c.lastAnalysisAt) : 'Nenhuma'}
        </span>
      ),
    },
    {
      key: 'impacto',
      header: 'Impacto',
      render: (c) => <RiskBadge level={c.lastImpact} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Empresas"
        description="Cadastro das empresas analisadas."
        actions={
          <button className="btn-primary" onClick={() => navigate('/empresas/nova')}>
            <PlusIcon className="h-4 w-4" /> Nova empresa
          </button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nenhuma empresa cadastrada"
          description="Cadastre a primeira empresa para começar a gerar diagnósticos."
          icon={<BuildingIcon className="h-8 w-8" />}
          action={
            <button className="btn-primary" onClick={() => navigate('/empresas/nova')}>
              <PlusIcon className="h-4 w-4" /> Nova empresa
            </button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative w-full max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                className="input-base pl-9"
                placeholder="Buscar por razão social, CNPJ, município…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <span className="text-sm text-ink-muted">{filtered.length} de {rows.length}</span>
          </div>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/empresas/${c.id}`)}
            emptyMessage="Nenhuma empresa corresponde à busca."
          />
        </>
      )}
    </div>
  );
}
