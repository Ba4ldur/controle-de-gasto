import type { Analysis, Company } from '../types/database';
import type { Diagnosis } from '../types/diagnosis';
import {
  IMPACT_LABELS,
  PRIORITY_LABELS,
  PROBABILITY_LABELS,
} from '../utils/impact';
import { formatCNPJ, formatDateBR, formatDateTimeBR } from '../utils/formatting';

/** Modelo de relatório para renderização (view-model). */
export interface ReportModel {
  title: string;
  company: Company;
  generatedAt: string;
  status: Analysis['status'];
  diagnosis: Diagnosis;
  reviewerNotes: string | null;
}

/** Monta o view-model do relatório a partir da análise. */
export function mapDiagnosisJsonToReport(
  analysis: Analysis,
  company: Company,
): ReportModel | null {
  if (!analysis.diagnosis) return null;
  return {
    title: analysis.title ?? 'Diagnóstico preliminar',
    company,
    generatedAt: analysis.updated_at ?? analysis.created_at,
    status: analysis.status,
    diagnosis: analysis.diagnosis,
    reviewerNotes: analysis.reviewer_notes,
  };
}

function esc(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function list(items: string[]): string {
  if (!items?.length) return '<p class="muted">Não informado.</p>';
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

/**
 * Gera um HTML autocontido e imprimível do relatório. Usado para preencher
 * `analyses.report_html` e permitir download/impressão fora do app.
 */
export function generatePrintableHtml(model: ReportModel): string {
  const { diagnosis: d, company } = model;
  const impact = IMPACT_LABELS[d.executive_summary.impact_level];

  const valueChainRows = d.value_chain
    .map(
      (v) => `<tr>
        <td>${esc(v.stage)}</td>
        <td>${esc(v.possible_impact)}</td>
        <td>${esc(v.risk)}</td>
        <td>${esc(v.recommended_action)}</td>
      </tr>`,
    )
    .join('');

  const riskRows = d.risk_matrix
    .map(
      (r) => `<tr>
        <td>${esc(r.risk)}</td>
        <td>${esc(r.category)}</td>
        <td>${esc(PROBABILITY_LABELS[r.probability] ?? r.probability)}</td>
        <td>${esc(IMPACT_LABELS[r.impact] ?? r.impact)}</td>
        <td>${esc(IMPACT_LABELS[r.risk_level] ?? r.risk_level)}</td>
        <td>${esc(r.recommended_control)}</td>
      </tr>`,
    )
    .join('');

  const gutRows = d.gut_matrix
    .map(
      (g) => `<tr>
        <td>${g.priority_order}</td>
        <td>${esc(g.action)}</td>
        <td>${g.gravity}</td>
        <td>${g.urgency}</td>
        <td>${g.trend}</td>
        <td><strong>${g.score}</strong></td>
      </tr>`,
    )
    .join('');

  const actionRows = d.action_plan
    .map(
      (a) => `<tr>
        <td>${esc(a.action)}</td>
        <td>${esc(a.objective)}</td>
        <td>${esc(a.responsible_area)}</td>
        <td>${esc(PRIORITY_LABELS[a.priority] ?? a.priority)}</td>
        <td>${esc(a.suggested_deadline)}</td>
        <td>${esc(a.expected_deliverable)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${esc(model.title)} — ${esc(company.razao_social ?? '')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #13201B; margin: 0; padding: 32px; line-height: 1.5; }
  h1 { font-size: 22px; color: #0F2A52; margin: 0 0 4px; }
  h2 { font-size: 16px; color: #0F2A52; border-bottom: 2px solid #C8A96B; padding-bottom: 4px; margin: 28px 0 12px; }
  h3 { font-size: 13px; color: #143968; margin: 16px 0 6px; }
  .brand { color: #A98A4E; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; font-size: 12px; }
  .muted { color: #586660; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  .cover { border: 1px solid #DDE3E0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 12px; }
  th, td { border: 1px solid #DDE3E0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #F2F6FB; color: #143968; }
  ul { margin: 4px 0; padding-left: 18px; }
  li { margin-bottom: 3px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .kv { font-size: 12px; }
  .kv b { color: #143968; }
  .disclaimer { border: 1px solid #DDE3E0; background: #F5F7FA; padding: 14px; border-radius: 8px; font-size: 12px; color: #586660; margin-top: 20px; }
  @media print { body { padding: 0; } .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="cover">
    <div class="brand">Attivare Reforma Intelligence</div>
    <h1>${esc(model.title)}</h1>
    <p class="muted">${esc(company.razao_social ?? '')} — ${esc(formatCNPJ(company.cnpj))}</p>
    <p class="kv">Emitido em ${esc(formatDateTimeBR(model.generatedAt))} · Nível de exposição:
      <span class="badge" style="background:#F2F6FB;color:#0F2A52;">${esc(impact)}</span>
    </p>
  </div>

  <h2>1. Sumário Executivo</h2>
  <p>${esc(d.executive_summary.general_conclusion)}</p>
  <p class="kv"><b>Nível de exposição:</b> ${esc(impact)}</p>
  <p class="kv"><b>Suficiente para cálculo financeiro:</b> ${d.executive_summary.sufficient_for_financial_calculation ? 'Sim' : 'Não'}</p>
  <p class="muted">${esc(d.executive_summary.preliminary_notice)}</p>

  <h2>2. Dados Extraídos do Cartão CNPJ</h2>
  <div class="grid">
    <div class="kv"><b>CNPJ:</b> ${esc(formatCNPJ(company.cnpj))}</div>
    <div class="kv"><b>Razão social:</b> ${esc(company.razao_social)}</div>
    <div class="kv"><b>Nome fantasia:</b> ${esc(company.nome_fantasia)}</div>
    <div class="kv"><b>Data de abertura:</b> ${esc(formatDateBR(company.data_abertura))}</div>
    <div class="kv"><b>Matriz/Filial:</b> ${esc(company.matriz_filial)}</div>
    <div class="kv"><b>Porte:</b> ${esc(company.porte)}</div>
    <div class="kv"><b>Natureza jurídica:</b> ${esc(company.natureza_juridica)}</div>
    <div class="kv"><b>CNAE principal:</b> ${esc(company.cnae_principal_codigo)} ${esc(company.cnae_principal_descricao)}</div>
    <div class="kv"><b>Município/UF:</b> ${esc(company.municipio)}/${esc(company.uf)}</div>
    <div class="kv"><b>Situação cadastral:</b> ${esc(company.situacao_cadastral)}</div>
  </div>
  <h3>Dados identificados</h3>${list(d.extracted_data_review.identified_data)}
  <h3>Dados ausentes</h3>${list(d.extracted_data_review.missing_data)}
  <h3>Precisam de confirmação</h3>${list(d.extracted_data_review.needs_confirmation)}

  <h2>3. Perfil Econômico e Operacional</h2>
  <p class="kv"><b>Classificação:</b> ${esc(d.economic_profile.classification)}</p>
  <p>${esc(d.economic_profile.main_activity_analysis)}</p>
  <p>${esc(d.economic_profile.secondary_activities_analysis)}</p>
  <p class="kv"><b>Operação mista:</b> ${esc(d.economic_profile.mixed_operation_indication)}</p>
  <h3>Documentos fiscais prováveis</h3>${list(d.economic_profile.likely_tax_documents)}

  <h2>4. Tributos Atuais e Futuros</h2>
  <h3>Tributos atuais</h3>${list(d.current_and_future_taxes.current_taxes)}
  <h3>Novos tributos/mecanismos</h3>${list(d.current_and_future_taxes.future_taxes)}
  <p class="muted">${esc(d.current_and_future_taxes.confirmation_required)}</p>

  <h2>5. Diagnóstico dos Impactos</h2>
  <p class="kv"><b>Fiscal:</b> ${esc(d.impact_diagnosis.fiscal)}</p>
  <p class="kv"><b>Operacional:</b> ${esc(d.impact_diagnosis.operational)}</p>
  <p class="kv"><b>Tecnológico:</b> ${esc(d.impact_diagnosis.technological)}</p>
  <p class="kv"><b>Financeiro:</b> ${esc(d.impact_diagnosis.financial)}</p>
  <p class="kv"><b>Comercial:</b> ${esc(d.impact_diagnosis.commercial)}</p>
  <p class="kv"><b>Contratual:</b> ${esc(d.impact_diagnosis.contractual)}</p>
  <p class="kv"><b>Estratégico:</b> ${esc(d.impact_diagnosis.strategic)}</p>

  <h2>6. Cadeia de Valor Tributária</h2>
  <table><thead><tr><th>Etapa</th><th>Possível impacto</th><th>Risco</th><th>Ação recomendada</th></tr></thead>
  <tbody>${valueChainRows}</tbody></table>

  <h2>7. Matriz de Risco</h2>
  <table><thead><tr><th>Risco</th><th>Categoria</th><th>Probabilidade</th><th>Impacto</th><th>Nível</th><th>Controle</th></tr></thead>
  <tbody>${riskRows}</tbody></table>

  <h2>8. Matriz GUT</h2>
  <table><thead><tr><th>#</th><th>Ação</th><th>G</th><th>U</th><th>T</th><th>Pontuação</th></tr></thead>
  <tbody>${gutRows}</tbody></table>

  <h2>9. SWOT Tributária e Gerencial</h2>
  <div class="grid">
    <div><h3>Forças</h3>${list(d.swot.strengths)}</div>
    <div><h3>Fraquezas</h3>${list(d.swot.weaknesses)}</div>
    <div><h3>Oportunidades</h3>${list(d.swot.opportunities)}</div>
    <div><h3>Ameaças</h3>${list(d.swot.threats)}</div>
  </div>

  <h2>10. 5 Forças de Porter</h2>
  <p class="kv"><b>Rivalidade entre concorrentes:</b> ${esc(d.porter_five_forces.competitive_rivalry)}</p>
  <p class="kv"><b>Poder de barganha dos clientes:</b> ${esc(d.porter_five_forces.customer_bargaining_power)}</p>
  <p class="kv"><b>Poder de barganha dos fornecedores:</b> ${esc(d.porter_five_forces.supplier_bargaining_power)}</p>
  <p class="kv"><b>Ameaça de novos entrantes:</b> ${esc(d.porter_five_forces.threat_new_entrants)}</p>
  <p class="kv"><b>Ameaça de substitutos:</b> ${esc(d.porter_five_forces.threat_substitutes)}</p>

  <h2>11. Informações Complementares Necessárias</h2>
  ${list(d.additional_information_required)}

  <h2>12. Plano de Ação Gerencial</h2>
  <table><thead><tr><th>Ação</th><th>Objetivo</th><th>Área</th><th>Prioridade</th><th>Prazo</th><th>Entregável</th></tr></thead>
  <tbody>${actionRows}</tbody></table>

  <h2>13. Conclusão Técnica</h2>
  <p class="kv"><b>Nível de maturidade:</b> ${esc(d.technical_conclusion.maturity_level)}</p>
  <h3>Três maiores riscos</h3>${list(d.technical_conclusion.top_three_risks)}
  <h3>Três ações mais urgentes</h3>${list(d.technical_conclusion.top_three_urgent_actions)}
  <p class="kv"><b>Suficiência do cartão CNPJ:</b> ${esc(d.technical_conclusion.cnpj_card_sufficiency)}</p>

  ${model.reviewerNotes ? `<h2>Observações do contador</h2><p>${esc(model.reviewerNotes)}</p>` : ''}

  <div class="disclaimer"><strong>Aviso profissional:</strong> ${esc(d.professional_disclaimer)}</div>
</body>
</html>`;
}
