import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { RiskBadge } from '../components/ui/RiskBadge';
import { Modal } from '../components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/states';
import { useToast } from '../components/ui/Toast';
import { PlusIcon, EditIcon, TrashIcon, ReportIcon } from '../components/ui/icons';
import { useAsync } from '../hooks/useAsync';
import { companyService } from '../services/companyService';
import { analysisService } from '../services/analysisService';
import { getStatusBadgeVariant, STATUS_LABELS } from '../utils/impact';
import { formatCNPJ, formatDateBR, formatDateTimeBR, truncate } from '../utils/formatting';
import type { Analysis } from '../types/database';

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    if (!id) return null;
    const [company, analyses] = await Promise.all([
      companyService.get(id),
      analysisService.list(id),
    ]);
    return { company, analyses };
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.company) return <ErrorState message="Empresa não encontrada." />;

  const { company, analyses } = data;

  async function handleDelete() {
    if (!id) return;
    try {
      await companyService.remove(id);
      notify('Empresa excluída.', 'success');
      navigate('/empresas');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  const info: { label: string; value: string }[] = [
    { label: 'CNPJ', value: formatCNPJ(company.cnpj) || '—' },
    { label: 'Nome fantasia', value: company.nome_fantasia || '—' },
    { label: 'Data de abertura', value: formatDateBR(company.data_abertura) },
    { label: 'Matriz/Filial', value: company.matriz_filial || '—' },
    { label: 'Porte', value: company.porte || '—' },
    { label: 'Natureza jurídica', value: company.natureza_juridica || '—' },
    { label: 'CNAE principal', value: [company.cnae_principal_codigo, company.cnae_principal_descricao].filter(Boolean).join(' — ') || '—' },
    { label: 'Situação cadastral', value: company.situacao_cadastral || '—' },
    { label: 'Data da situação', value: formatDateBR(company.data_situacao_cadastral) },
    { label: 'Município/UF', value: `${company.municipio || '—'}${company.uf ? '/' + company.uf : ''}` },
    { label: 'Endereço', value: company.endereco || '—' },
    { label: 'Regime tributário', value: company.regime_tributario },
  ];

  const columns: Column<Analysis>[] = [
    {
      key: 'title',
      header: 'Título',
      render: (a) => <span className="font-medium text-ink">{truncate(a.title ?? 'Sem título', 44)}</span>,
    },
    { key: 'status', header: 'Status', render: (a) => <Badge variant={getStatusBadgeVariant(a.status)}>{STATUS_LABELS[a.status]}</Badge> },
    { key: 'impact', header: 'Impacto', render: (a) => <RiskBadge level={a.impact_level} /> },
    { key: 'date', header: 'Atualizada', align: 'right', render: (a) => <span className="text-xs text-ink-muted">{formatDateTimeBR(a.updated_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title={company.razao_social || 'Empresa'}
        description={company.cnaes_secundarios.length ? `${company.cnaes_secundarios.length} atividade(s) secundária(s)` : undefined}
        breadcrumbs={[{ label: 'Empresas' }, { label: truncate(company.razao_social ?? '—', 30) }]}
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate(`/empresas/${company.id}/editar`)}>
              <EditIcon className="h-4 w-4" /> Editar
            </button>
            <button className="btn-primary" onClick={() => navigate(`/analises/nova?empresa=${company.id}`)}>
              <PlusIcon className="h-4 w-4" /> Nova análise
            </button>
          </>
        }
      />

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Dados cadastrais</h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {info.map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">{item.label}</dt>
              <dd className="mt-0.5 text-sm text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
        {company.cnaes_secundarios.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">CNAEs secundários</p>
            <div className="flex flex-wrap gap-2">
              {company.cnaes_secundarios.map((c, i) => (
                <Badge key={i} variant="neutral">
                  {[c.codigo, c.descricao].filter(Boolean).join(' — ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {company.observacoes && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">Observações internas</p>
            <p className="whitespace-pre-wrap text-sm text-ink">{company.observacoes}</p>
          </div>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Histórico de análises</h2>
        {analyses.length === 0 ? (
          <EmptyState
            title="Nenhuma análise para esta empresa"
            description="Gere o primeiro diagnóstico preliminar."
            icon={<ReportIcon className="h-8 w-8" />}
            action={
              <button className="btn-primary" onClick={() => navigate(`/analises/nova?empresa=${company.id}`)}>
                <PlusIcon className="h-4 w-4" /> Nova análise
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={analyses}
            rowKey={(a) => a.id}
            onRowClick={(a) => navigate(`/analises/${a.id}`)}
          />
        )}
      </section>

      <div className="mt-10 border-t border-line pt-6">
        <button className="btn-ghost text-danger hover:bg-danger-soft" onClick={() => setConfirmDelete(true)}>
          <TrashIcon className="h-4 w-4" /> Excluir empresa
        </button>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir empresa"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            <button className="btn-danger" onClick={handleDelete}>Excluir definitivamente</button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Tem certeza que deseja excluir <strong>{company.razao_social}</strong>? Todas as análises
          vinculadas também serão removidas. Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
