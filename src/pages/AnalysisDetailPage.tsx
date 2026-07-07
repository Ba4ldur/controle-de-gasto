import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { RiskBadge } from '../components/ui/RiskBadge';
import { Modal } from '../components/ui/Modal';
import { LoadingState, ErrorState, InlineAlert } from '../components/ui/states';
import { useToast } from '../components/ui/Toast';
import { DiagnosisReport } from '../components/analysis/DiagnosisReport';
import { DiagnosisEditor } from '../components/analysis/DiagnosisEditor';
import { WhatsAppSummaryModal } from '../components/analysis/WhatsAppSummaryModal';
import {
  EditIcon,
  PrintIcon,
  WhatsAppIcon,
  CopyIcon,
  EyeIcon,
  TrashIcon,
  CheckIcon,
  ArrowLeftIcon,
  SpinnerIcon,
} from '../components/ui/icons';
import { useAsync } from '../hooks/useAsync';
import { analysisService } from '../services/analysisService';
import { companyService } from '../services/companyService';
import { generatePrintableHtml, mapDiagnosisJsonToReport } from '../services/reportService';
import { generateWhatsAppSummary } from '../utils/whatsapp';
import { getStatusBadgeVariant, STATUS_LABELS } from '../utils/impact';
import { formatDateTimeBR, truncate } from '../utils/formatting';
import type { Diagnosis } from '../types/diagnosis';

type ViewMode = 'view' | 'edit';

export function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [mode, setMode] = useState<ViewMode>('view');
  const [saving, setSaving] = useState(false);
  const [whatsOpen, setWhatsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    if (!id) return null;
    const analysis = await analysisService.get(id);
    if (!analysis) return null;
    const company = await companyService.get(analysis.company_id);
    return { analysis, company };
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.analysis || !data.company) return <ErrorState message="Análise não encontrada." />;

  const { analysis, company } = data;

  async function persist(patch: Parameters<typeof analysisService.update>[1], successMsg?: string) {
    if (!id) return;
    setSaving(true);
    try {
      await analysisService.update(id, patch);
      if (successMsg) notify(successMsg, 'success');
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReview(diagnosis: Diagnosis, reviewerNotes: string) {
    await persist(
      {
        diagnosis,
        reviewer_notes: reviewerNotes,
        impact_level: diagnosis.executive_summary.impact_level,
        status: 'em_revisao',
      },
      'Revisão salva.',
    );
    setMode('view');
  }

  async function finalize() {
    if (!analysis.diagnosis) return;
    const model = mapDiagnosisJsonToReport(analysis, company);
    const html = model ? generatePrintableHtml(model) : null;
    const summary = generateWhatsAppSummary(analysis.diagnosis, company);
    await persist(
      {
        status: 'finalizado',
        report_html: html ?? undefined,
        generated_summary: summary,
      },
      'Análise finalizada.',
    );
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await analysisService.remove(id);
      notify('Análise excluída.', 'success');
      navigate('/analises');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  function handlePrint() {
    window.print();
  }

  function downloadHtml() {
    const model = mapDiagnosisJsonToReport(analysis, company);
    if (!model) return;
    const html = generatePrintableHtml(model);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-${(company.razao_social ?? 'empresa').replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyExecutiveSummary() {
    if (!analysis.diagnosis) return;
    const text = analysis.diagnosis.executive_summary.general_conclusion;
    try {
      await navigator.clipboard.writeText(text);
      notify('Resumo executivo copiado.', 'success');
    } catch {
      notify('Não foi possível copiar.', 'error');
    }
  }

  // Estados sem diagnóstico
  if (analysis.status === 'processando' && !analysis.diagnosis) {
    return (
      <div>
        <BackHeader analysis={analysis} companyName={company.razao_social} onBack={() => navigate('/analises')} />
        <div className="card p-10 text-center">
          <SpinnerIcon className="mx-auto h-8 w-8 text-brand-700" />
          <p className="mt-3 text-sm text-ink-muted">Processando diagnóstico…</p>
        </div>
      </div>
    );
  }

  if (analysis.status === 'erro') {
    return (
      <div>
        <BackHeader analysis={analysis} companyName={company.razao_social} onBack={() => navigate('/analises')} />
        <ErrorState
          title="Falha ao gerar o diagnóstico"
          message={analysis.error_message ?? 'Ocorreu um erro. Tente gerar novamente.'}
          onRetry={() => navigate(`/analises/nova?empresa=${company.id}`)}
        />
      </div>
    );
  }

  if (!analysis.diagnosis) {
    return (
      <div>
        <BackHeader analysis={analysis} companyName={company.razao_social} onBack={() => navigate('/analises')} />
        <InlineAlert variant="warning">
          Esta análise ainda não possui diagnóstico gerado.
        </InlineAlert>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={truncate(analysis.title ?? 'Diagnóstico', 60)}
          breadcrumbs={[{ label: 'Análises' }, { label: truncate(company.razao_social ?? '—', 28) }]}
          actions={
            <>
              <button className="btn-ghost" onClick={() => navigate('/analises')}>
                <ArrowLeftIcon className="h-4 w-4" /> Voltar
              </button>
              {mode === 'view' ? (
                <button className="btn-secondary" onClick={() => setMode('edit')}>
                  <EditIcon className="h-4 w-4" /> Revisar
                </button>
              ) : (
                <button className="btn-secondary" onClick={() => setMode('view')}>
                  <EyeIcon className="h-4 w-4" /> Ver relatório
                </button>
              )}
            </>
          }
        />

        {/* Barra de status e ações */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4">
          <Badge variant={getStatusBadgeVariant(analysis.status)}>{STATUS_LABELS[analysis.status]}</Badge>
          <RiskBadge level={analysis.impact_level} />
          <span className="text-xs text-ink-muted">Atualizada em {formatDateTimeBR(analysis.updated_at)}</span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button className="btn-ghost text-sm" onClick={copyExecutiveSummary}>
              <CopyIcon className="h-4 w-4" /> Copiar resumo
            </button>
            <button className="btn-ghost text-sm" onClick={() => setWhatsOpen(true)}>
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </button>
            <button className="btn-ghost text-sm" onClick={downloadHtml}>
              Baixar HTML
            </button>
            <button className="btn-secondary text-sm" onClick={handlePrint}>
              <PrintIcon className="h-4 w-4" /> Imprimir / PDF
            </button>
            {analysis.status !== 'finalizado' ? (
              <button className="btn-primary text-sm" onClick={finalize} disabled={saving}>
                {saving ? <SpinnerIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                Finalizar
              </button>
            ) : (
              <button className="btn-secondary text-sm" onClick={() => persist({ status: 'em_revisao' }, 'Análise reaberta para revisão.')}>
                Reabrir revisão
              </button>
            )}
          </div>
        </div>

        {analysis.status === 'em_revisao' && mode === 'view' && (
          <div className="mb-6">
            <InlineAlert variant="warning">
              Diagnóstico em revisão. Revise o conteúdo e finalize antes de emitir ao cliente.
            </InlineAlert>
          </div>
        )}
      </div>

      {mode === 'edit' ? (
        <div className="no-print">
          <DiagnosisEditor
            diagnosis={analysis.diagnosis}
            reviewerNotes={analysis.reviewer_notes ?? ''}
            saving={saving}
            onSave={handleSaveReview}
            onCancel={() => setMode('view')}
          />
        </div>
      ) : (
        <DiagnosisReport diagnosis={analysis.diagnosis} company={company} analysis={analysis} />
      )}

      {/* Rodapé de exclusão */}
      {mode === 'view' && (
        <div className="mt-10 border-t border-line pt-6 no-print">
          <button className="btn-ghost text-danger hover:bg-danger-soft" onClick={() => setConfirmDelete(true)}>
            <TrashIcon className="h-4 w-4" /> Excluir análise
          </button>
        </div>
      )}

      <WhatsAppSummaryModal
        open={whatsOpen}
        onClose={() => setWhatsOpen(false)}
        diagnosis={analysis.diagnosis}
        company={company}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir análise"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            <button className="btn-danger" onClick={handleDelete}>Excluir</button>
          </>
        }
      >
        <p className="text-sm text-ink">Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.</p>
      </Modal>
    </div>
  );
}

function BackHeader({
  analysis,
  companyName,
  onBack,
}: {
  analysis: { title: string | null };
  companyName: string | null;
  onBack: () => void;
}) {
  return (
    <PageHeader
      title={truncate(analysis.title ?? 'Diagnóstico', 60)}
      breadcrumbs={[{ label: 'Análises' }, { label: truncate(companyName ?? '—', 28) }]}
      actions={
        <button className="btn-ghost" onClick={onBack}>
          <ArrowLeftIcon className="h-4 w-4" /> Voltar
        </button>
      }
    />
  );
}
