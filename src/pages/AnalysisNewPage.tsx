import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Stepper, type Step } from '../components/ui/Stepper';
import { UploadBox } from '../components/analysis/UploadBox';
import { ExtractedDataReview, type FieldOrigin } from '../components/analysis/ExtractedDataReview';
import { Badge } from '../components/ui/Badge';
import { InlineAlert, LoadingState, ErrorState } from '../components/ui/states';
import { useToast } from '../components/ui/Toast';
import { SpinnerIcon, ArrowLeftIcon, ChevronRightIcon } from '../components/ui/icons';
import { useAsync } from '../hooks/useAsync';
import { companyService } from '../services/companyService';
import { analysisService } from '../services/analysisService';
import { documentService } from '../services/documentService';
import { aiService } from '../services/aiService';
import { classifyCompany } from '../services/classificationService';
import { parseCnpjCardText } from '../utils/cnpjCardParser';
import { extractTextFromFile } from '../services/pdfExtractService';
import { checkMinimumDataForDiagnosis } from '../utils/validation';
import { ECONOMIC_PROFILE_LABELS } from '../utils/impact';
import { isDemo } from '../lib/config';
import { SAMPLE_CNPJ_CARD_TEXT } from '../data/sampleData';
import type { CnpjCardFields, ClassificationResult, EconomicProfile, ExtractionResult } from '../types/diagnosis';
import type { CnaeSecundario, Company } from '../types/database';

const STEPS: Step[] = [
  { id: 1, label: 'Identificação' },
  { id: 2, label: 'Entrada de dados' },
  { id: 3, label: 'Dados extraídos' },
  { id: 4, label: 'Classificação' },
  { id: 5, label: 'Diagnóstico' },
];

const ANALYSIS_TYPE = 'Diagnóstico preliminar por cartão CNPJ';

const EMPTY_FIELDS: CnpjCardFields = {
  cnpj: '', razao_social: '', nome_fantasia: '', data_abertura: '', matriz_filial: '',
  porte: '', natureza_juridica: '', cnae_principal_codigo: '', cnae_principal_descricao: '',
  cnaes_secundarios: [], endereco: '', municipio: '', uf: '', situacao_cadastral: '',
  data_situacao_cadastral: '',
};

export function AnalysisNewPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('empresa') ?? '';

  const { data: companies, loading, error } = useAsync(() => companyService.list(), []);

  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);

  const [companyId, setCompanyId] = useState(preselected);
  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractionMsg, setExtractionMsg] = useState<{ text: string; variant: 'info' | 'warning' | 'danger' } | null>(null);
  const [extracting, setExtracting] = useState(false);

  const [fields, setFields] = useState<CnpjCardFields>(EMPTY_FIELDS);
  const [origins, setOrigins] = useState<Record<string, FieldOrigin>>({});
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [profileOverride, setProfileOverride] = useState<EconomicProfile | ''>('');

  const [generating, setGenerating] = useState(false);

  const selectedCompany = useMemo(
    () => companies?.find((c) => c.id === companyId) ?? null,
    [companies, companyId],
  );

  function goTo(next: number) {
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  }

  // Etapa 1 → 2
  function submitStep1() {
    if (!companyId) {
      notify('Selecione uma empresa para continuar.', 'error');
      return;
    }
    if (!title.trim()) {
      setTitle(`Diagnóstico — ${selectedCompany?.razao_social ?? 'empresa'}`);
    }
    goTo(2);
  }

  async function handleFile(file: File) {
    setExtracting(true);
    setExtractionMsg(null);
    setFileName(file.name);
    setUploadedFile(file);
    try {
      const result = await extractTextFromFile(file);
      if (result.text) {
        setInputText((prev) => (prev.trim() ? `${prev}\n\n${result.text}` : result.text));
      }
      if (result.status === 'sucesso') {
        setExtractionMsg({ text: `Texto extraído de "${file.name}".`, variant: 'info' });
      } else {
        setExtractionMsg({
          text: result.message ?? 'Não foi possível extrair texto automaticamente.',
          variant: result.status === 'erro' ? 'danger' : 'warning',
        });
      }
    } catch (err) {
      setExtractionMsg({ text: (err as Error).message, variant: 'danger' });
    } finally {
      setExtracting(false);
    }
  }

  // Etapa 2 → 3: parseia e mescla com dados cadastrais da empresa
  function submitStep2() {
    if (!inputText.trim() && !selectedCompany?.cnae_principal_descricao) {
      notify('Cole o texto do cartão CNPJ ou envie um arquivo com texto.', 'error');
      return;
    }
    const parsed = parseCnpjCardText(inputText);
    const merged = mergeWithCompany(parsed.fields, selectedCompany);
    const nextOrigins: Record<string, FieldOrigin> = {};
    (Object.keys(merged) as (keyof CnpjCardFields)[]).forEach((key) => {
      if (key === 'cnaes_secundarios') {
        nextOrigins[key] = merged.cnaes_secundarios.length ? 'extraido' : 'nao_identificado';
        return;
      }
      const parsedHas = Boolean((parsed.fields[key] as string)?.toString().trim());
      const mergedHas = Boolean((merged[key] as string)?.toString().trim());
      nextOrigins[key] = parsedHas ? 'extraido' : mergedHas ? 'confirmar' : 'nao_identificado';
    });
    setFields(merged);
    setOrigins(nextOrigins);
    goTo(3);
  }

  // Etapa 3 → 4: classifica
  function submitStep3() {
    const result = classifyCompany(fields, selectedCompany?.observacoes ?? undefined);
    setClassification(result);
    setProfileOverride('');
    goTo(4);
  }

  // Etapa 5: gera diagnóstico
  async function generate() {
    if (!selectedCompany || !classification) return;
    const effectiveClassification: ClassificationResult = profileOverride
      ? { ...classification, economic_profile: profileOverride }
      : classification;

    const minimum = checkMinimumDataForDiagnosis({
      razao_social: fields.razao_social,
      cnpj: fields.cnpj,
      cnae_principal_descricao: fields.cnae_principal_descricao,
      input_text: inputText,
    });
    if (!minimum.ok) {
      notify(`Dados mínimos ausentes: ${minimum.missing.join(', ')}.`, 'error');
      return;
    }

    setGenerating(true);
    const extraction: ExtractionResult = {
      document_quality: isDemo ? 'ficticio' : 'oficial',
      confidence_level: 'medio',
      fields,
      missing_fields: Object.entries(origins)
        .filter(([, o]) => o === 'nao_identificado')
        .map(([k]) => k),
      inconsistencies: [],
      evidence: fileName ? [`Documento: ${fileName}`] : ['Texto informado manualmente.'],
      warnings: isDemo ? ['Modo demonstração: dados podem ser fictícios.'] : [],
    };

    try {
      // Atualiza o cadastro da empresa com os dados revisados.
      await syncCompany(selectedCompany, fields);

      // Cria a análise (rascunho → processando).
      const analysis = await analysisService.create({
        company_id: selectedCompany.id,
        title: title.trim() || `Diagnóstico — ${selectedCompany.razao_social ?? 'empresa'}`,
        analysis_type: ANALYSIS_TYPE,
        input_text: inputText,
      });
      await analysisService.update(analysis.id, {
        status: 'processando',
        extracted_data: extraction,
        classification: effectiveClassification,
      });

      // Salva o documento (se houver) no storage privado.
      if (uploadedFile) {
        try {
          await documentService.upload({
            file: uploadedFile,
            companyId: selectedCompany.id,
            analysisId: analysis.id,
            extractedText: inputText,
            extractionStatus: 'processado',
          });
        } catch (docErr) {
          // Falha de upload não impede o diagnóstico.
          notify(`Documento não pôde ser salvo: ${(docErr as Error).message}`, 'error');
        }
      }

      // Gera o diagnóstico via IA/Edge Function (ou demo).
      const { diagnosis } = await aiService.generateDiagnosis({
        company: selectedCompany,
        extraction,
        classification: effectiveClassification,
        input_text: inputText,
      });

      await analysisService.update(analysis.id, {
        status: 'em_revisao',
        diagnosis,
        impact_level: diagnosis.executive_summary.impact_level,
        confidence_level: extraction.confidence_level,
      });

      notify('Diagnóstico gerado com sucesso.', 'success');
      navigate(`/analises/${analysis.id}`);
    } catch (err) {
      notify(`Falha ao gerar diagnóstico: ${(err as Error).message}`, 'error');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const noCompanies = (companies?.length ?? 0) === 0;

  return (
    <div>
      <PageHeader
        title="Nova análise"
        description="Diagnóstico preliminar da Reforma Tributária a partir do cartão CNPJ."
        breadcrumbs={[{ label: 'Análises' }, { label: 'Nova' }]}
      />

      <div className="mb-6 overflow-x-auto">
        <Stepper steps={STEPS} current={step} maxReached={maxReached} onStepClick={(id) => setStep(id)} />
      </div>

      {/* ETAPA 1 */}
      {step === 1 && (
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-ink">Identificação</h2>
          {noCompanies ? (
            <InlineAlert variant="warning">
              Nenhuma empresa cadastrada.{' '}
              <button className="font-medium underline" onClick={() => navigate('/empresas/nova')}>
                Cadastre uma empresa
              </button>{' '}
              antes de criar a análise.
            </InlineAlert>
          ) : (
            <>
              <div>
                <label htmlFor="company" className="label-base">Empresa</label>
                <select
                  id="company"
                  className="input-base"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                >
                  <option value="">Selecione uma empresa…</option>
                  {companies?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razao_social ?? c.cnpj ?? 'Empresa sem nome'}
                    </option>
                  ))}
                </select>
                <button className="mt-1.5 text-sm text-brand-700 hover:underline" onClick={() => navigate('/empresas/nova')}>
                  + Cadastrar nova empresa
                </button>
              </div>
              <div>
                <label htmlFor="title" className="label-base">Título da análise</label>
                <input
                  id="title"
                  className="input-base"
                  placeholder={`Diagnóstico — ${selectedCompany?.razao_social ?? 'empresa'}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="type" className="label-base">Tipo de análise</label>
                <select id="type" className="input-base" value={ANALYSIS_TYPE} disabled>
                  <option>{ANALYSIS_TYPE}</option>
                </select>
                <p className="mt-1 text-xs text-ink-soft">Outros tipos de análise serão adicionados em módulos futuros.</p>
              </div>
              <div className="flex justify-end">
                <button className="btn-primary" onClick={submitStep1}>
                  Continuar <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ETAPA 2 */}
      {step === 2 && (
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-ink">Entrada de dados</h2>
          <p className="text-sm text-ink-muted">
            Cole o conteúdo do cartão CNPJ (comprovante de inscrição) ou envie um arquivo. Nada é
            consultado automaticamente na Receita — os dados vêm do que você fornecer.
          </p>

          <div>
            <label htmlFor="cnpjText" className="label-base">Texto do cartão CNPJ</label>
            <textarea
              id="cnpjText"
              className="input-base min-h-[180px] font-mono text-xs"
              placeholder="Cole aqui o texto do comprovante de inscrição e situação cadastral…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            {isDemo && (
              <button
                className="mt-1.5 text-sm text-brand-700 hover:underline"
                onClick={() => setInputText(SAMPLE_CNPJ_CARD_TEXT)}
              >
                Carregar exemplo fictício
              </button>
            )}
          </div>

          <div>
            <span className="label-base">Ou envie um arquivo</span>
            <UploadBox onFile={handleFile} busy={extracting} currentFileName={fileName} />
            {extractionMsg && (
              <div className="mt-2">
                <InlineAlert variant={extractionMsg.variant}>{extractionMsg.text}</InlineAlert>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              <ArrowLeftIcon className="h-4 w-4" /> Voltar
            </button>
            <button className="btn-primary" onClick={submitStep2}>
              Extrair dados <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3 */}
      {step === 3 && (
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-ink">Conferência dos dados extraídos</h2>
          <p className="text-sm text-ink-muted">
            Revise e corrija os campos antes de continuar. Nada é presumido: o sistema só preenche o
            que reconheceu no texto.
          </p>
          <ExtractedDataReview
            fields={fields}
            origins={origins}
            onChange={(f, o) => {
              setFields(f);
              setOrigins(o);
            }}
          />
          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(2)}>
              <ArrowLeftIcon className="h-4 w-4" /> Voltar
            </button>
            <button className="btn-primary" onClick={submitStep3}>
              Classificar <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4 */}
      {step === 4 && classification && (
        <div className="card space-y-5 p-6">
          <h2 className="text-lg font-semibold text-ink">Classificação preliminar</h2>

          <div>
            <label htmlFor="profile" className="label-base">Perfil econômico</label>
            <select
              id="profile"
              className="input-base max-w-sm"
              value={profileOverride || classification.economic_profile}
              onChange={(e) => setProfileOverride(e.target.value as EconomicProfile)}
            >
              {Object.entries(ECONOMIC_PROFILE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-soft">Sugerido pelas regras de CNAE. Ajuste se necessário.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ClassBlock title="Segmentos" items={classification.segments} />
            <ClassBlock title="Indícios de operação" items={classification.operation_indicators} />
            <ClassBlock title="Documentos fiscais prováveis" items={classification.likely_documents} />
            <ClassBlock title="Tributos atuais potencialmente envolvidos" items={classification.current_taxes_potentially_involved} />
            <ClassBlock title="Novos tributos (Reforma)" items={classification.new_taxes_potentially_involved} />
            <ClassBlock title="Limitações" items={classification.limitations} muted />
          </div>

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(3)}>
              <ArrowLeftIcon className="h-4 w-4" /> Voltar
            </button>
            <button className="btn-primary" onClick={() => goTo(5)}>
              Avançar <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 5 */}
      {step === 5 && (
        <div className="card space-y-5 p-6">
          <h2 className="text-lg font-semibold text-ink">Gerar diagnóstico</h2>
          <InlineAlert variant="info">
            O diagnóstico por cartão CNPJ é <strong>preliminar</strong> e qualitativo. Não calcula
            impacto financeiro — isso exige faturamento, regime, notas fiscais, margens e contratos.
          </InlineAlert>

          <dl className="grid gap-x-8 gap-y-3 rounded-md border border-line p-4 sm:grid-cols-2">
            <SummaryRow label="Empresa" value={selectedCompany?.razao_social ?? '—'} />
            <SummaryRow label="CNPJ" value={fields.cnpj || '—'} />
            <SummaryRow label="Perfil" value={ECONOMIC_PROFILE_LABELS[profileOverride || classification?.economic_profile || 'outro']} />
            <SummaryRow label="Município/UF" value={`${fields.municipio || '—'}${fields.uf ? '/' + fields.uf : ''}`} />
          </dl>

          {isDemo && (
            <InlineAlert variant="warning">
              Modo demonstração: o diagnóstico será um exemplo gerado localmente, sem chamar a IA.
            </InlineAlert>
          )}

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(4)} disabled={generating}>
              <ArrowLeftIcon className="h-4 w-4" /> Voltar
            </button>
            <button className="btn-primary" onClick={generate} disabled={generating}>
              {generating && <SpinnerIcon className="h-4 w-4" />}
              {generating ? 'Gerando diagnóstico…' : 'Gerar diagnóstico com IA'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassBlock({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">—</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <Badge key={i} variant={muted ? 'neutral' : 'info'}>{it}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

/** Preenche campos do cartão vazios com dados cadastrais já existentes. */
function mergeWithCompany(parsed: CnpjCardFields, company: Company | null): CnpjCardFields {
  if (!company) return parsed;
  const pick = (parsedVal: string, companyVal: string | null | undefined) =>
    parsedVal?.trim() ? parsedVal : companyVal ?? '';
  return {
    cnpj: pick(parsed.cnpj, company.cnpj),
    razao_social: pick(parsed.razao_social, company.razao_social),
    nome_fantasia: pick(parsed.nome_fantasia, company.nome_fantasia),
    data_abertura: parsed.data_abertura || '',
    matriz_filial: pick(parsed.matriz_filial, company.matriz_filial),
    porte: pick(parsed.porte, company.porte),
    natureza_juridica: pick(parsed.natureza_juridica, company.natureza_juridica),
    cnae_principal_codigo: pick(parsed.cnae_principal_codigo, company.cnae_principal_codigo),
    cnae_principal_descricao: pick(parsed.cnae_principal_descricao, company.cnae_principal_descricao),
    cnaes_secundarios: parsed.cnaes_secundarios.length
      ? parsed.cnaes_secundarios
      : company.cnaes_secundarios.map((c) => [c.codigo, c.descricao].filter(Boolean).join(' - ')),
    endereco: pick(parsed.endereco, company.endereco),
    municipio: pick(parsed.municipio, company.municipio),
    uf: pick(parsed.uf, company.uf),
    situacao_cadastral: pick(parsed.situacao_cadastral, company.situacao_cadastral),
    data_situacao_cadastral: parsed.data_situacao_cadastral || '',
  };
}

/** Atualiza o cadastro da empresa com os campos revisados (preenche vazios). */
async function syncCompany(company: Company, fields: CnpjCardFields): Promise<void> {
  const secundarios: CnaeSecundario[] = fields.cnaes_secundarios
    .map((s) => {
      const match = /^\s*([\d.\-/]+)\s*[-–]\s*(.+)$/.exec(s);
      if (match) return { codigo: match[1].trim(), descricao: match[2].trim() };
      return { codigo: '', descricao: s.trim() };
    })
    .filter((c) => c.codigo || c.descricao);

  await companyService.update(company.id, {
    cnpj: fields.cnpj || company.cnpj || '',
    razao_social: fields.razao_social || company.razao_social || '',
    nome_fantasia: fields.nome_fantasia || company.nome_fantasia || '',
    data_abertura: company.data_abertura ?? null,
    matriz_filial: fields.matriz_filial || company.matriz_filial || '',
    porte: fields.porte || company.porte || '',
    natureza_juridica: fields.natureza_juridica || company.natureza_juridica || '',
    cnae_principal_codigo: fields.cnae_principal_codigo || company.cnae_principal_codigo || '',
    cnae_principal_descricao: fields.cnae_principal_descricao || company.cnae_principal_descricao || '',
    cnaes_secundarios: secundarios.length ? secundarios : company.cnaes_secundarios,
    endereco: fields.endereco || company.endereco || '',
    municipio: fields.municipio || company.municipio || '',
    uf: fields.uf || company.uf || '',
    situacao_cadastral: fields.situacao_cadastral || company.situacao_cadastral || '',
    data_situacao_cadastral: company.data_situacao_cadastral ?? null,
    regime_tributario: company.regime_tributario,
    observacoes: company.observacoes || '',
  });
}
