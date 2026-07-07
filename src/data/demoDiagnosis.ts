/**
 * Gerador de diagnóstico de DEMONSTRAÇÃO.
 *
 * Produz um diagnóstico estruturado coerente com os dados informados, para
 * permitir avaliar o fluxo completo sem chamar a OpenAI. É claramente um
 * EXEMPLO: o aviso preliminar deixa explícito que foi gerado em modo demo e
 * não substitui a análise real feita pela Edge Function/IA.
 */

import type {
  ClassificationResult,
  Diagnosis,
  ExtractionResult,
  ImpactLevel,
} from '../types/diagnosis';
import { sortGutMatrix } from '../utils/gut';
import { SAMPLE_DIAGNOSIS } from './sampleData';

export interface DemoDiagnosisInput {
  extraction: ExtractionResult;
  classification: ClassificationResult;
  regimeTributario?: string;
  observacoes?: string;
}

const PROFILE_IMPACT: Record<string, ImpactLevel> = {
  operacao_mista: 'alto',
  industria: 'alto',
  comercio: 'medio',
  alimentacao: 'alto',
  transporte: 'medio',
  servico: 'medio',
  tecnologia: 'medio',
  saude: 'medio',
  educacao: 'medio',
  turismo: 'medio',
  construcao: 'alto',
  locacao: 'medio',
  intermediacao: 'medio',
  outro: 'medio',
};

const DISCLAIMER =
  'Este diagnóstico é preliminar e foi elaborado com base nas informações disponíveis no cartão CNPJ e em dados complementares informados pelo usuário. Não substitui análise tributária quantitativa baseada em documentos fiscais, contábeis, financeiros, contratos, regime tributário, faturamento, margens, créditos e operações reais da empresa.';

/**
 * Monta um diagnóstico de demonstração adaptado aos dados de entrada.
 * Reaproveita a estrutura rica do SAMPLE_DIAGNOSIS e sobrescreve os pontos
 * que dependem diretamente dos campos extraídos/classificados.
 */
export function buildDemoDiagnosisForInput(input: DemoDiagnosisInput): Diagnosis {
  const { extraction, classification } = input;
  const fields = extraction.fields;
  const profile = classification.economic_profile;
  const impact = PROFILE_IMPACT[profile] ?? 'medio';

  const razao = fields.razao_social || 'a empresa analisada';
  const atividade = fields.cnae_principal_descricao || 'atividade principal não identificada';

  const base = SAMPLE_DIAGNOSIS;

  const identified: string[] = [];
  const missing: string[] = [];
  if (fields.cnpj) identified.push(`CNPJ ${fields.cnpj}`);
  if (fields.razao_social) identified.push('Razão social');
  if (fields.cnae_principal_codigo || fields.cnae_principal_descricao) identified.push('CNAE principal');
  if (fields.cnaes_secundarios.length) identified.push('CNAEs secundários');
  if (fields.municipio || fields.uf) identified.push('Município/UF');
  if (fields.situacao_cadastral) identified.push('Situação cadastral');

  if (!input.regimeTributario || input.regimeTributario === 'Não informado') {
    missing.push('Regime tributário efetivo');
  }
  missing.push('Faturamento dos últimos 12 meses', 'Segregação de receitas', 'Margens e estrutura de custos');

  const gut = sortGutMatrix(
    base.gut_matrix.map((g) => ({ ...g, score: 0, priority_order: 0 })),
  );

  return {
    ...base,
    executive_summary: {
      general_conclusion: `Com base no cartão CNPJ de ${razao}, cuja atividade principal é "${atividade}", a empresa foi classificada com perfil ${profile.replace('_', ' ')}. A Reforma Tributária do Consumo (CBS, IBS e eventual Imposto Seletivo) tende a exigir revisão de créditos, sistemas fiscais e formação de preço. Não há dados financeiros suficientes para afirmar aumento ou redução de carga.`,
      impact_level: impact,
      preliminary_notice:
        '[EXEMPLO — MODO DEMONSTRAÇÃO] Diagnóstico gerado localmente para avaliação do fluxo, sem consulta à IA. Em produção, o conteúdo é gerado pela Edge Function com base nos dados reais. Análise preliminar, não substitui estudo quantitativo.',
      sufficient_for_financial_calculation: false,
    },
    extracted_data_review: {
      identified_data: identified.length ? identified : base.extracted_data_review.identified_data,
      missing_data: missing,
      needs_confirmation: [
        'Predominância da atividade (principal x secundárias)',
        input.regimeTributario && input.regimeTributario !== 'Não informado'
          ? `Regime informado (${input.regimeTributario}) x operação real`
          : 'Regime tributário efetivo',
      ],
    },
    economic_profile: {
      ...base.economic_profile,
      classification: `${profile.replace('_', ' ')}${
        classification.segments.length ? ` — ${classification.segments.join(', ')}` : ''
      }`,
      main_activity_analysis: `A atividade principal "${atividade}" orienta o tratamento sob a Reforma. ${base.economic_profile.main_activity_analysis}`,
      likely_tax_documents: classification.likely_documents.length
        ? classification.likely_documents
        : base.economic_profile.likely_tax_documents,
    },
    current_and_future_taxes: {
      current_taxes: classification.current_taxes_potentially_involved.length
        ? classification.current_taxes_potentially_involved
        : base.current_and_future_taxes.current_taxes,
      future_taxes: classification.new_taxes_potentially_involved.length
        ? classification.new_taxes_potentially_involved
        : base.current_and_future_taxes.future_taxes,
      confirmation_required: base.current_and_future_taxes.confirmation_required,
    },
    additional_information_required: base.additional_information_required,
    gut_matrix: gut,
    professional_disclaimer: DISCLAIMER,
  };
}
