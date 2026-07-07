import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingState, ErrorState, InlineAlert } from '../components/ui/states';
import { useToast } from '../components/ui/Toast';
import { PlusIcon, KnowledgeIcon } from '../components/ui/icons';
import { useAsync } from '../hooks/useAsync';
import { knowledgeService } from '../services/knowledgeService';
import { isDemo } from '../lib/config';
import { formatDateBR } from '../utils/formatting';

export function KnowledgeBasePage() {
  const { notify } = useToast();
  const { data, loading, error, reload } = useAsync(() => knowledgeService.list(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', source_type: 'Legislação', source_url: '', content: '' });
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!form.title.trim()) {
      notify('Informe o título da fonte.', 'error');
      return;
    }
    setSaving(true);
    try {
      await knowledgeService.create(form);
      notify('Fonte adicionada.', 'success');
      setOpen(false);
      setForm({ title: '', source_type: 'Legislação', source_url: '', content: '' });
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Base de conhecimento"
        description="Referências sobre a Reforma Tributária do Consumo utilizadas como apoio."
        actions={
          !isDemo && (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <PlusIcon className="h-4 w-4" /> Nova fonte
            </button>
          )
        }
      />

      <div className="mb-6">
        <InlineAlert variant="info">
          As referências abaixo são informativas e não constituem parecer jurídico. Confirme sempre a
          legislação oficial mais recente antes de decisões.
        </InlineAlert>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.length ?? 0) === 0 ? (
        <div className="card p-10 text-center text-ink-muted">
          <KnowledgeIcon className="mx-auto h-8 w-8" />
          <p className="mt-2 text-sm">Nenhuma fonte cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.map((source) => (
            <div key={source.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-ink">{source.title}</h3>
                    {knowledgeService.isBuiltin(source) && <Badge variant="neutral">Referência do sistema</Badge>}
                  </div>
                  {source.source_type && (
                    <Badge variant="info" className="mt-1">{source.source_type}</Badge>
                  )}
                </div>
                <span className="text-xs text-ink-soft">{formatDateBR(source.created_at)}</span>
              </div>
              {source.content && <p className="mt-2 text-sm text-ink-muted">{source.content}</p>}
              {source.source_url && (
                <a
                  href={source.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline"
                >
                  Abrir fonte oficial →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-lg border border-dashed border-line p-5">
        <p className="text-sm font-medium text-ink">Em desenvolvimento</p>
        <p className="mt-1 text-sm text-ink-muted">
          Busca semântica e uso das fontes diretamente na geração do diagnóstico serão adicionados em
          módulos futuros.
        </p>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova fonte"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving}>Salvar</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label-base">Título</label>
            <input className="input-base" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label-base">Tipo</label>
            <input className="input-base" value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} />
          </div>
          <div>
            <label className="label-base">URL (opcional)</label>
            <input className="input-base" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
          </div>
          <div>
            <label className="label-base">Conteúdo / resumo</label>
            <textarea className="input-base min-h-[100px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
