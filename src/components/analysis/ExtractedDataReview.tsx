import { useMemo } from 'react';
import { Badge } from '../ui/Badge';
import { CNPJ_FIELD_LABELS } from '../../utils/cnpjCardParser';
import { maskCNPJ } from '../../utils/formatting';
import type { CnpjCardFields } from '../../types/diagnosis';
import type { BadgeVariant } from '../../utils/impact';

export type FieldOrigin = 'extraido' | 'manual' | 'nao_identificado' | 'confirmar';

const ORIGIN_META: Record<FieldOrigin, { label: string; variant: BadgeVariant }> = {
  extraido: { label: 'Extraído', variant: 'positive' },
  manual: { label: 'Manual', variant: 'info' },
  nao_identificado: { label: 'Não identificado', variant: 'neutral' },
  confirmar: { label: 'Confirmar', variant: 'warning' },
};

interface ExtractedDataReviewProps {
  fields: CnpjCardFields;
  origins: Record<string, FieldOrigin>;
  onChange: (fields: CnpjCardFields, origins: Record<string, FieldOrigin>) => void;
}

/** Ordem de exibição dos campos simples (cnaes_secundarios tratado à parte). */
const SIMPLE_FIELDS: (keyof CnpjCardFields)[] = [
  'cnpj',
  'razao_social',
  'nome_fantasia',
  'data_abertura',
  'matriz_filial',
  'porte',
  'natureza_juridica',
  'cnae_principal_codigo',
  'cnae_principal_descricao',
  'endereco',
  'municipio',
  'uf',
  'situacao_cadastral',
  'data_situacao_cadastral',
];

export function ExtractedDataReview({ fields, origins, onChange }: ExtractedDataReviewProps) {
  function setField(key: keyof CnpjCardFields, value: string) {
    const nextValue = key === 'cnpj' ? maskCNPJ(value) : key === 'uf' ? value.toUpperCase().slice(0, 2) : value;
    const nextFields = { ...fields, [key]: nextValue };
    const nextOrigins = { ...origins, [key]: 'manual' as FieldOrigin };
    onChange(nextFields, nextOrigins);
  }

  function setSecondary(index: number, part: 'codigo' | 'descricao', value: string) {
    const list = [...fields.cnaes_secundarios];
    // cnaes_secundarios é string[] "codigo - descricao"; edição simples do texto.
    list[index] = value;
    onChange({ ...fields, cnaes_secundarios: list }, { ...origins, cnaes_secundarios: 'manual' });
    void part;
  }

  function addSecondary() {
    onChange(
      { ...fields, cnaes_secundarios: [...fields.cnaes_secundarios, ''] },
      { ...origins, cnaes_secundarios: 'manual' },
    );
  }

  function removeSecondary(index: number) {
    onChange(
      { ...fields, cnaes_secundarios: fields.cnaes_secundarios.filter((_, i) => i !== index) },
      { ...origins, cnaes_secundarios: 'manual' },
    );
  }

  const counts = useMemo(() => {
    const values = Object.values(origins);
    return {
      extraido: values.filter((o) => o === 'extraido').length,
      manual: values.filter((o) => o === 'manual').length,
      naoId: values.filter((o) => o === 'nao_identificado').length,
    };
  }, [origins]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="positive">{counts.extraido} extraído(s)</Badge>
        <Badge variant="info">{counts.manual} manual(is)</Badge>
        <Badge variant="neutral">{counts.naoId} não identificado(s)</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SIMPLE_FIELDS.map((key) => {
          const origin = origins[key] ?? (fields[key] ? 'extraido' : 'nao_identificado');
          const meta = ORIGIN_META[origin];
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor={`f-${key}`} className="text-[0.8125rem] font-medium text-ink-muted">
                  {CNPJ_FIELD_LABELS[key]}
                </label>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>
              <input
                id={`f-${key}`}
                className="input-base"
                value={String(fields[key] ?? '')}
                onChange={(e) => setField(key, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-line p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[0.8125rem] font-medium text-ink-muted">CNAEs secundários</span>
          <button type="button" onClick={addSecondary} className="btn-ghost px-2 py-1 text-xs">
            Adicionar
          </button>
        </div>
        {fields.cnaes_secundarios.length === 0 ? (
          <p className="text-xs text-ink-soft">Nenhum CNAE secundário identificado.</p>
        ) : (
          <div className="space-y-2">
            {fields.cnaes_secundarios.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input-base flex-1"
                  value={c}
                  placeholder="Código - descrição"
                  onChange={(e) => setSecondary(i, 'descricao', e.target.value)}
                />
                <button type="button" onClick={() => removeSecondary(i)} className="btn-ghost px-2 text-xs">
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
