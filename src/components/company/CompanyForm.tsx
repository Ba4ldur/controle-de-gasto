import { useState, type FormEvent } from 'react';
import { TextField, SelectField, TextAreaField } from '../ui/Field';
import { InlineAlert } from '../ui/states';
import { PlusIcon, TrashIcon, SpinnerIcon } from '../ui/icons';
import { maskCNPJ, toIsoDate, formatDateBR } from '../../utils/formatting';
import { validateCNPJ, validateUF, validateDate, UF_LIST } from '../../utils/validation';
import type { Company, CnaeSecundario, RegimeTributario } from '../../types/database';
import type { CompanyFormValues } from '../../services/companyService';

const REGIMES: RegimeTributario[] = [
  'Não informado',
  'Simples Nacional',
  'Lucro Presumido',
  'Lucro Real',
  'MEI',
  'Imune/Isenta',
  'Outro',
];

const PORTES = ['', 'MEI', 'ME', 'EPP', 'Demais', 'Grande porte'];

interface CompanyFormProps {
  initial?: Partial<Company>;
  submitLabel?: string;
  saving?: boolean;
  onSubmit: (values: CompanyFormValues) => void;
  onCancel?: () => void;
}

function emptyValues(initial?: Partial<Company>): CompanyFormValues {
  return {
    cnpj: initial?.cnpj ?? '',
    razao_social: initial?.razao_social ?? '',
    nome_fantasia: initial?.nome_fantasia ?? '',
    data_abertura: initial?.data_abertura ?? null,
    matriz_filial: initial?.matriz_filial ?? '',
    porte: initial?.porte ?? '',
    natureza_juridica: initial?.natureza_juridica ?? '',
    cnae_principal_codigo: initial?.cnae_principal_codigo ?? '',
    cnae_principal_descricao: initial?.cnae_principal_descricao ?? '',
    cnaes_secundarios: initial?.cnaes_secundarios ?? [],
    endereco: initial?.endereco ?? '',
    municipio: initial?.municipio ?? '',
    uf: initial?.uf ?? '',
    situacao_cadastral: initial?.situacao_cadastral ?? '',
    data_situacao_cadastral: initial?.data_situacao_cadastral ?? null,
    regime_tributario: (initial?.regime_tributario as RegimeTributario) ?? 'Não informado',
    observacoes: initial?.observacoes ?? '',
  };
}

export function CompanyForm({ initial, submitLabel = 'Salvar', saving, onSubmit, onCancel }: CompanyFormProps) {
  const [values, setValues] = useState<CompanyFormValues>(() => emptyValues(initial));
  // Datas manejadas como texto BR para exibição/edição.
  const [aberturaText, setAberturaText] = useState(formatDateBRSafe(initial?.data_abertura));
  const [situacaoText, setSituacaoText] = useState(formatDateBRSafe(initial?.data_situacao_cadastral));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof CompanyFormValues>(key: K, value: CompanyFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function updateCnae(index: number, patch: Partial<CnaeSecundario>) {
    setValues((v) => {
      const list = [...v.cnaes_secundarios];
      list[index] = { ...list[index], ...patch };
      return { ...v, cnaes_secundarios: list };
    });
  }

  function addCnae() {
    set('cnaes_secundarios', [...values.cnaes_secundarios, { codigo: '', descricao: '' }]);
  }

  function removeCnae(index: number) {
    set(
      'cnaes_secundarios',
      values.cnaes_secundarios.filter((_, i) => i !== index),
    );
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!values.razao_social.trim() && !values.cnpj.trim()) {
      next.razao_social = 'Informe ao menos a razão social ou o CNPJ.';
    }
    if (values.cnpj.trim() && !validateCNPJ(values.cnpj)) {
      next.cnpj = 'CNPJ inválido (dígitos verificadores não conferem).';
    }
    if (values.uf.trim() && !validateUF(values.uf)) {
      next.uf = 'UF inválida.';
    }
    if (aberturaText.trim() && !validateDate(aberturaText)) {
      next.data_abertura = 'Data inválida (use DD/MM/AAAA).';
    }
    if (situacaoText.trim() && !validateDate(situacaoText)) {
      next.data_situacao_cadastral = 'Data inválida (use DD/MM/AAAA).';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...values,
      data_abertura: toIsoDate(aberturaText),
      data_situacao_cadastral: toIsoDate(situacaoText),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Identificação</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="cnpj"
            label="CNPJ"
            value={values.cnpj}
            onChange={(e) => set('cnpj', maskCNPJ(e.target.value))}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            error={errors.cnpj}
          />
          <SelectField
            id="regime"
            label="Regime tributário conhecido"
            value={values.regime_tributario}
            onChange={(e) => set('regime_tributario', e.target.value as RegimeTributario)}
            options={REGIMES.map((r) => ({ value: r, label: r }))}
          />
          <TextField
            id="razao"
            label="Razão social"
            value={values.razao_social}
            onChange={(e) => set('razao_social', e.target.value)}
            error={errors.razao_social}
            wrapClassName="sm:col-span-2"
          />
          <TextField
            id="fantasia"
            label="Nome fantasia"
            value={values.nome_fantasia}
            onChange={(e) => set('nome_fantasia', e.target.value)}
          />
          <TextField
            id="natureza"
            label="Natureza jurídica"
            value={values.natureza_juridica}
            onChange={(e) => set('natureza_juridica', e.target.value)}
          />
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Cadastro</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            id="abertura"
            label="Data de abertura"
            value={aberturaText}
            onChange={(e) => setAberturaText(e.target.value)}
            placeholder="DD/MM/AAAA"
            error={errors.data_abertura}
          />
          <SelectField
            id="matriz"
            label="Matriz ou filial"
            value={values.matriz_filial}
            onChange={(e) => set('matriz_filial', e.target.value)}
            options={[
              { value: '', label: 'Não informado' },
              { value: 'Matriz', label: 'Matriz' },
              { value: 'Filial', label: 'Filial' },
            ]}
          />
          <SelectField
            id="porte"
            label="Porte"
            value={values.porte}
            onChange={(e) => set('porte', e.target.value)}
            options={PORTES.map((p) => ({ value: p, label: p || 'Não informado' }))}
          />
          <TextField
            id="situacao"
            label="Situação cadastral"
            value={values.situacao_cadastral}
            onChange={(e) => set('situacao_cadastral', e.target.value)}
            placeholder="Ex.: ATIVA"
          />
          <TextField
            id="dataSituacao"
            label="Data da situação cadastral"
            value={situacaoText}
            onChange={(e) => setSituacaoText(e.target.value)}
            placeholder="DD/MM/AAAA"
            error={errors.data_situacao_cadastral}
          />
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Atividades (CNAE)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            id="cnaeCod"
            label="CNAE principal — código"
            value={values.cnae_principal_codigo}
            onChange={(e) => set('cnae_principal_codigo', e.target.value)}
            placeholder="00.00-0-00"
          />
          <TextField
            id="cnaeDesc"
            label="CNAE principal — descrição"
            value={values.cnae_principal_descricao}
            onChange={(e) => set('cnae_principal_descricao', e.target.value)}
            wrapClassName="sm:col-span-2"
          />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="label-base mb-0">CNAEs secundários</span>
            <button type="button" onClick={addCnae} className="btn-ghost px-2 py-1 text-xs">
              <PlusIcon className="h-3.5 w-3.5" /> Adicionar
            </button>
          </div>
          {values.cnaes_secundarios.length === 0 ? (
            <p className="text-xs text-ink-soft">Nenhum CNAE secundário informado.</p>
          ) : (
            <div className="space-y-2">
              {values.cnaes_secundarios.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input-base w-32"
                    placeholder="Código"
                    value={c.codigo}
                    onChange={(e) => updateCnae(i, { codigo: e.target.value })}
                  />
                  <input
                    className="input-base flex-1"
                    placeholder="Descrição"
                    value={c.descricao}
                    onChange={(e) => updateCnae(i, { descricao: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeCnae(i)}
                    className="btn-ghost px-2"
                    aria-label="Remover CNAE"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Endereço</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            id="endereco"
            label="Endereço"
            value={values.endereco}
            onChange={(e) => set('endereco', e.target.value)}
            wrapClassName="sm:col-span-2"
          />
          <TextField
            id="municipio"
            label="Município"
            value={values.municipio}
            onChange={(e) => set('municipio', e.target.value)}
          />
          <SelectField
            id="uf"
            label="UF"
            value={values.uf}
            onChange={(e) => set('uf', e.target.value)}
            error={errors.uf}
            options={[{ value: '', label: '—' }, ...UF_LIST.map((u) => ({ value: u, label: u }))]}
          />
        </div>
      </div>

      <div className="card p-6">
        <TextAreaField
          id="obs"
          label="Observações internas"
          value={values.observacoes}
          onChange={(e) => set('observacoes', e.target.value)}
          hint="Notas de uso interno da Attivare. Não aparecem no diagnóstico gerado, salvo se você incluir."
        />
      </div>

      {Object.keys(errors).length > 0 && (
        <InlineAlert variant="danger">Revise os campos destacados antes de salvar.</InlineAlert>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <SpinnerIcon className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function formatDateBRSafe(value: string | null | undefined): string {
  if (!value) return '';
  const f = formatDateBR(value);
  return f === '—' ? '' : f;
}
