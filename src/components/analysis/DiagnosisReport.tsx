import type { ReactNode } from 'react';
import { Logo } from '../ui/Logo';
import { Badge } from '../ui/Badge';
import { RiskBadge } from '../ui/RiskBadge';
import {
  getImpactBadgeVariant,
  getPriorityBadgeVariant,
  getProbabilityBadgeVariant,
  getStatusBadgeVariant,
  IMPACT_LABELS,
  PRIORITY_LABELS,
  PROBABILITY_LABELS,
  STATUS_LABELS,
} from '../../utils/impact';
import { formatCNPJ, formatDateBR, formatDateTimeBR } from '../../utils/formatting';
import type { Analysis, Company } from '../../types/database';
import type { Diagnosis } from '../../types/diagnosis';

interface DiagnosisReportProps {
  diagnosis: Diagnosis;
  company: Company;
  analysis: Analysis;
}

/** Relatório completo e imprimível. Renderiza as 14 seções obrigatórias. */
export function DiagnosisReport({ diagnosis: d, company, analysis }: DiagnosisReportProps) {
  return (
    <div className="print-container space-y-8">
      {/* Capa */}
      <div className="avoid-break rounded-lg border border-line bg-surface p-8">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-xs uppercase tracking-widest text-gold-deep">Reforma Intelligence</span>
        </div>
        <div className="mt-8 border-t border-line pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Diagnóstico preliminar</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{analysis.title ?? 'Diagnóstico preliminar'}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {company.razao_social} — {formatCNPJ(company.cnpj)}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-soft">Emitido em</p>
              <p className="text-ink">{formatDateTimeBR(analysis.updated_at ?? analysis.created_at)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-soft">Status</p>
              <Badge variant={getStatusBadgeVariant(analysis.status)}>{STATUS_LABELS[analysis.status]}</Badge>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-soft">Nível de exposição</p>
              <RiskBadge level={d.executive_summary.impact_level} />
            </div>
          </div>
        </div>
      </div>

      {/* 1. Sumário Executivo */}
      <Section n={1} title="Sumário Executivo">
        <p className="text-sm leading-relaxed text-ink">{d.executive_summary.general_conclusion}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Chip label="Nível de exposição">
            <RiskBadge level={d.executive_summary.impact_level} />
          </Chip>
          <Chip label="Suficiente para cálculo financeiro">
            <Badge variant={d.executive_summary.sufficient_for_financial_calculation ? 'positive' : 'warning'}>
              {d.executive_summary.sufficient_for_financial_calculation ? 'Sim' : 'Não'}
            </Badge>
          </Chip>
        </div>
        <p className="mt-4 rounded-md bg-canvas p-3 text-xs text-ink-muted">{d.executive_summary.preliminary_notice}</p>
      </Section>

      {/* 2. Dados Extraídos */}
      <Section n={2} title="Dados Extraídos do Cartão CNPJ">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <KV label="CNPJ" value={formatCNPJ(company.cnpj)} />
          <KV label="Razão social" value={company.razao_social} />
          <KV label="Nome fantasia" value={company.nome_fantasia} />
          <KV label="Data de abertura" value={formatDateBR(company.data_abertura)} />
          <KV label="Matriz/Filial" value={company.matriz_filial} />
          <KV label="Porte" value={company.porte} />
          <KV label="Natureza jurídica" value={company.natureza_juridica} />
          <KV label="CNAE principal" value={[company.cnae_principal_codigo, company.cnae_principal_descricao].filter(Boolean).join(' — ')} />
          <KV label="Situação cadastral" value={company.situacao_cadastral} />
          <KV label="Data da situação" value={formatDateBR(company.data_situacao_cadastral)} />
          <KV label="Município/UF" value={`${company.municipio ?? '—'}${company.uf ? '/' + company.uf : ''}`} />
          <KV label="Endereço" value={company.endereco} />
        </dl>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <ListBlock title="Dados identificados" items={d.extracted_data_review.identified_data} variant="positive" />
          <ListBlock title="Dados ausentes" items={d.extracted_data_review.missing_data} variant="warning" />
          <ListBlock title="Precisam de confirmação" items={d.extracted_data_review.needs_confirmation} variant="info" />
        </div>
      </Section>

      {/* 3. Perfil Econômico */}
      <Section n={3} title="Perfil Econômico e Operacional">
        <p className="mb-2 text-sm"><span className="font-medium text-ink">Classificação:</span>{' '}
          <span className="text-ink-muted">{d.economic_profile.classification}</span></p>
        <Para label="Atividade principal" text={d.economic_profile.main_activity_analysis} />
        <Para label="Atividades secundárias" text={d.economic_profile.secondary_activities_analysis} />
        <Para label="Operação mista" text={d.economic_profile.mixed_operation_indication} />
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">Documentos fiscais prováveis</p>
          <div className="flex flex-wrap gap-1.5">
            {d.economic_profile.likely_tax_documents.map((doc, i) => (
              <Badge key={i} variant="info">{doc}</Badge>
            ))}
          </div>
        </div>
      </Section>

      {/* 4. Tributos */}
      <Section n={4} title="Tributos Atuais e Futuros">
        <div className="grid gap-4 sm:grid-cols-2">
          <ListBlock title="Tributos atuais potencialmente impactados" items={d.current_and_future_taxes.current_taxes} variant="neutral" />
          <ListBlock title="Novos tributos / mecanismos" items={d.current_and_future_taxes.future_taxes} variant="info" />
        </div>
        {d.current_and_future_taxes.confirmation_required && (
          <p className="mt-3 rounded-md bg-canvas p-3 text-xs text-ink-muted">
            {d.current_and_future_taxes.confirmation_required}
          </p>
        )}
      </Section>

      {/* 5. Impactos */}
      <Section n={5} title="Diagnóstico dos Impactos da Reforma">
        <div className="grid gap-3 sm:grid-cols-2">
          <Para label="Fiscal" text={d.impact_diagnosis.fiscal} />
          <Para label="Operacional" text={d.impact_diagnosis.operational} />
          <Para label="Tecnológico" text={d.impact_diagnosis.technological} />
          <Para label="Financeiro" text={d.impact_diagnosis.financial} />
          <Para label="Comercial" text={d.impact_diagnosis.commercial} />
          <Para label="Contratual" text={d.impact_diagnosis.contractual} />
          <Para label="Estratégico" text={d.impact_diagnosis.strategic} />
        </div>
      </Section>

      {/* 6. Cadeia de valor */}
      <Section n={6} title="Cadeia de Valor Tributária">
        <ReportTable
          head={['Etapa', 'Possível impacto', 'Risco', 'Ação recomendada']}
          rows={d.value_chain.map((v) => [v.stage, v.possible_impact, v.risk, v.recommended_action])}
        />
      </Section>

      {/* 7. Matriz de risco */}
      <Section n={7} title="Matriz de Risco">
        <ReportTable
          head={['Risco', 'Categoria', 'Probabilidade', 'Impacto', 'Nível', 'Controle recomendado']}
          rows={d.risk_matrix.map((r) => [
            r.risk,
            r.category,
            <Badge key="p" variant={getProbabilityBadgeVariant(r.probability)}>{PROBABILITY_LABELS[r.probability] ?? r.probability}</Badge>,
            <Badge key="i" variant={getImpactBadgeVariant(r.impact)}>{IMPACT_LABELS[r.impact] ?? r.impact}</Badge>,
            <Badge key="n" variant={getImpactBadgeVariant(r.risk_level)}>{IMPACT_LABELS[r.risk_level] ?? r.risk_level}</Badge>,
            r.recommended_control,
          ])}
        />
      </Section>

      {/* 8. GUT */}
      <Section n={8} title="Matriz GUT (Gravidade × Urgência × Tendência)">
        <ReportTable
          head={['#', 'Ação', 'G', 'U', 'T', 'Pontuação']}
          align={[undefined, undefined, 'center', 'center', 'center', 'center']}
          rows={d.gut_matrix.map((g) => [
            String(g.priority_order),
            g.action,
            String(g.gravity),
            String(g.urgency),
            String(g.trend),
            <strong key="s" className="font-mono">{g.score}</strong>,
          ])}
        />
      </Section>

      {/* 9. SWOT */}
      <Section n={9} title="SWOT Tributária e Gerencial">
        <div className="grid gap-4 sm:grid-cols-2">
          <ListBlock title="Forças" items={d.swot.strengths} variant="positive" />
          <ListBlock title="Fraquezas" items={d.swot.weaknesses} variant="danger" />
          <ListBlock title="Oportunidades" items={d.swot.opportunities} variant="info" />
          <ListBlock title="Ameaças" items={d.swot.threats} variant="warning" />
        </div>
      </Section>

      {/* 10. Porter */}
      <Section n={10} title="5 Forças de Porter">
        <div className="grid gap-3 sm:grid-cols-2">
          <Para label="Rivalidade entre concorrentes" text={d.porter_five_forces.competitive_rivalry} />
          <Para label="Poder de barganha dos clientes" text={d.porter_five_forces.customer_bargaining_power} />
          <Para label="Poder de barganha dos fornecedores" text={d.porter_five_forces.supplier_bargaining_power} />
          <Para label="Ameaça de novos entrantes" text={d.porter_five_forces.threat_new_entrants} />
          <Para label="Ameaça de substitutos" text={d.porter_five_forces.threat_substitutes} />
        </div>
      </Section>

      {/* 11. Informações complementares */}
      <Section n={11} title="Informações Complementares Necessárias">
        <ListBlock items={d.additional_information_required} variant="neutral" columns />
      </Section>

      {/* 12. Plano de ação */}
      <Section n={12} title="Plano de Ação Gerencial">
        <ReportTable
          head={['Ação', 'Objetivo', 'Área', 'Prioridade', 'Prazo', 'Entregável']}
          rows={d.action_plan.map((a) => [
            a.action,
            a.objective,
            a.responsible_area,
            <Badge key="p" variant={getPriorityBadgeVariant(a.priority)}>{PRIORITY_LABELS[a.priority] ?? a.priority}</Badge>,
            a.suggested_deadline,
            a.expected_deliverable,
          ])}
        />
      </Section>

      {/* 13. Conclusão técnica */}
      <Section n={13} title="Conclusão Técnica">
        <Para label="Nível de maturidade" text={d.technical_conclusion.maturity_level} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ListBlock title="Três maiores riscos" items={d.technical_conclusion.top_three_risks} variant="danger" />
          <ListBlock title="Três ações mais urgentes" items={d.technical_conclusion.top_three_urgent_actions} variant="info" />
        </div>
        <p className="mt-3 rounded-md bg-canvas p-3 text-sm text-ink">
          <span className="font-medium">Suficiência do cartão CNPJ:</span> {d.technical_conclusion.cnpj_card_sufficiency}
        </p>
      </Section>

      {/* Observações do contador */}
      {analysis.reviewer_notes && (
        <Section n={undefined} title="Observações do Contador">
          <p className="whitespace-pre-wrap text-sm text-ink">{analysis.reviewer_notes}</p>
        </Section>
      )}

      {/* 14. Disclaimer */}
      <div className="avoid-break rounded-lg border border-line bg-canvas p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Aviso profissional</p>
        <p className="text-xs leading-relaxed text-ink-muted">{d.professional_disclaimer}</p>
      </div>
    </div>
  );
}

/* ---------- Subcomponentes ---------- */

function Section({ n, title, children }: { n?: number; title: string; children: ReactNode }) {
  return (
    <section className="avoid-break rounded-lg border border-line bg-surface p-6">
      <h2 className="mb-4 flex items-center gap-2 border-b border-line pb-2 text-base font-semibold text-brand-900">
        {n !== undefined && (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-900 text-xs font-semibold text-white">{n}</span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

function KV({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value || '—'}</dd>
    </div>
  );
}

function Para({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-ink">{text || '—'}</p>
    </div>
  );
}

function Chip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-line px-3 py-2">
      <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      {children}
    </div>
  );
}

function ListBlock({
  title,
  items,
  variant = 'neutral',
  columns,
}: {
  title?: string;
  items: string[];
  variant?: 'positive' | 'danger' | 'info' | 'warning' | 'neutral';
  columns?: boolean;
}) {
  const dot: Record<string, string> = {
    positive: 'bg-positive',
    danger: 'bg-danger',
    info: 'bg-info',
    warning: 'bg-warning',
    neutral: 'bg-ink-soft',
  };
  return (
    <div>
      {title && <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">{title}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">—</p>
      ) : (
        <ul className={`space-y-1 ${columns ? 'sm:columns-2 sm:gap-8' : ''}`}>
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink">
              <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot[variant]}`} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportTable({
  head,
  rows,
  align,
}: {
  head: string[];
  rows: ReactNode[][];
  align?: (('center' | 'right') | undefined)[];
}) {
  const alignClass = (a?: 'center' | 'right') => (a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left');
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas">
            {head.map((h, i) => (
              <th key={i} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-900 ${alignClass(align?.[i])}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-line last:border-0 align-top">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-3 py-2 text-ink ${alignClass(align?.[ci])}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
