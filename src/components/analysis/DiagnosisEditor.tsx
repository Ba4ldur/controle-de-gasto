import { useState } from 'react';
import { InlineAlert } from '../ui/states';
import { PlusIcon, TrashIcon, SpinnerIcon } from '../ui/icons';
import { IMPACT_LABELS, PRIORITY_LABELS } from '../../utils/impact';
import type { Diagnosis, ImpactLevel, Priority } from '../../types/diagnosis';

interface DiagnosisEditorProps {
  diagnosis: Diagnosis;
  reviewerNotes: string;
  saving?: boolean;
  onSave: (diagnosis: Diagnosis, reviewerNotes: string) => void;
  onCancel: () => void;
}

/** Editor de revisão humana das seções-chave do diagnóstico. */
export function DiagnosisEditor({ diagnosis, reviewerNotes, saving, onSave, onCancel }: DiagnosisEditorProps) {
  const [draft, setDraft] = useState<Diagnosis>(() => structuredCloneSafe(diagnosis));
  const [notes, setNotes] = useState(reviewerNotes);

  function patchExec(patch: Partial<Diagnosis['executive_summary']>) {
    setDraft((d) => ({ ...d, executive_summary: { ...d.executive_summary, ...patch } }));
  }
  function patchTech(patch: Partial<Diagnosis['technical_conclusion']>) {
    setDraft((d) => ({ ...d, technical_conclusion: { ...d.technical_conclusion, ...patch } }));
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Sumário executivo</h3>
        <div>
          <label className="label-base">Conclusão geral</label>
          <textarea
            className="input-base min-h-[120px]"
            value={draft.executive_summary.general_conclusion}
            onChange={(e) => patchExec({ general_conclusion: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-base">Nível de exposição</label>
            <select
              className="input-base"
              value={draft.executive_summary.impact_level}
              onChange={(e) => patchExec({ impact_level: e.target.value as ImpactLevel })}
            >
              {(Object.keys(IMPACT_LABELS) as ImpactLevel[]).map((lvl) => (
                <option key={lvl} value={lvl}>{IMPACT_LABELS[lvl]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-600"
                checked={draft.executive_summary.sufficient_for_financial_calculation}
                onChange={(e) => patchExec({ sufficient_for_financial_calculation: e.target.checked })}
              />
              Dados suficientes para cálculo financeiro
            </label>
          </div>
        </div>
        <div>
          <label className="label-base">Aviso preliminar</label>
          <textarea
            className="input-base min-h-[70px]"
            value={draft.executive_summary.preliminary_notice}
            onChange={(e) => patchExec({ preliminary_notice: e.target.value })}
          />
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Conclusão técnica</h3>
        <div>
          <label className="label-base">Nível de maturidade</label>
          <input
            className="input-base"
            value={draft.technical_conclusion.maturity_level}
            onChange={(e) => patchTech({ maturity_level: e.target.value })}
          />
        </div>
        <StringListEditor
          label="Três maiores riscos"
          items={draft.technical_conclusion.top_three_risks}
          onChange={(items) => patchTech({ top_three_risks: items })}
        />
        <StringListEditor
          label="Três ações mais urgentes"
          items={draft.technical_conclusion.top_three_urgent_actions}
          onChange={(items) => patchTech({ top_three_urgent_actions: items })}
        />
      </section>

      <section className="card space-y-4 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Plano de ação</h3>
        <div className="space-y-3">
          {draft.action_plan.map((item, i) => (
            <div key={i} className="rounded-md border border-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted">Ação {i + 1}</span>
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs text-danger"
                  onClick={() => setDraft((d) => ({ ...d, action_plan: d.action_plan.filter((_, idx) => idx !== i) }))}
                >
                  <TrashIcon className="h-3.5 w-3.5" /> Remover
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="input-base sm:col-span-2"
                  placeholder="Ação"
                  value={item.action}
                  onChange={(e) => updateAction(setDraft, i, { action: e.target.value })}
                />
                <input
                  className="input-base"
                  placeholder="Objetivo"
                  value={item.objective}
                  onChange={(e) => updateAction(setDraft, i, { objective: e.target.value })}
                />
                <input
                  className="input-base"
                  placeholder="Área responsável"
                  value={item.responsible_area}
                  onChange={(e) => updateAction(setDraft, i, { responsible_area: e.target.value })}
                />
                <select
                  className="input-base"
                  value={item.priority}
                  onChange={(e) => updateAction(setDraft, i, { priority: e.target.value as Priority })}
                >
                  {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
                <input
                  className="input-base"
                  placeholder="Prazo sugerido"
                  value={item.suggested_deadline}
                  onChange={(e) => updateAction(setDraft, i, { suggested_deadline: e.target.value })}
                />
                <input
                  className="input-base sm:col-span-2"
                  placeholder="Entregável esperado"
                  value={item.expected_deliverable}
                  onChange={(e) => updateAction(setDraft, i, { expected_deliverable: e.target.value })}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                action_plan: [
                  ...d.action_plan,
                  { action: '', objective: '', responsible_area: '', priority: 'media', suggested_deadline: '', expected_deliverable: '' },
                ],
              }))
            }
          >
            <PlusIcon className="h-4 w-4" /> Adicionar ação
          </button>
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Observações do contador</h3>
        <textarea
          className="input-base min-h-[100px]"
          placeholder="Notas de revisão, ressalvas e recomendações adicionais…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <InlineAlert variant="info">
        As edições são salvas apenas quando você clicar em “Salvar revisão”. O relatório final deve
        ser revisado por um profissional antes da emissão.
      </InlineAlert>

      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSave(draft, notes)} disabled={saving}>
          {saving && <SpinnerIcon className="h-4 w-4" />}
          Salvar revisão
        </button>
      </div>
    </div>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label-base mb-0">{label}</span>
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => onChange([...items, ''])}>
          <PlusIcon className="h-3.5 w-3.5" /> Adicionar
        </button>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input-base flex-1"
              value={it}
              onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
            />
            <button
              type="button"
              className="btn-ghost px-2"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              aria-label="Remover item"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function updateAction(
  setDraft: React.Dispatch<React.SetStateAction<Diagnosis>>,
  index: number,
  patch: Partial<Diagnosis['action_plan'][number]>,
) {
  setDraft((d) => ({
    ...d,
    action_plan: d.action_plan.map((a, i) => (i === index ? { ...a, ...patch } : a)),
  }));
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
