import type { Diagnosis, ImpactLevel } from '../types/diagnosis';
import { sortGutMatrix } from '../utils/gut';

/**
 * Validação estrutural do JSON de diagnóstico retornado pela IA.
 *
 * A mesma verificação roda na Edge Function (servidor) e aqui no cliente,
 * como rede de segurança. Não confia cegamente na saída do modelo: garante
 * que todas as seções obrigatórias existam antes de exibir/salvar.
 */

const IMPACT_LEVELS: ImpactLevel[] = ['baixo', 'medio', 'alto', 'critico'];

export interface ValidationOutcome {
  ok: boolean;
  errors: string[];
  diagnosis?: Diagnosis;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function ensureStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? x : String(x ?? ''))).filter(Boolean);
}

/** Valida e normaliza um objeto arbitrário para o formato Diagnosis. */
export function validateDiagnosis(raw: unknown): ValidationOutcome {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { ok: false, errors: ['Resposta não é um objeto JSON válido.'] };
  }

  const requiredKeys = [
    'executive_summary',
    'extracted_data_review',
    'economic_profile',
    'current_and_future_taxes',
    'impact_diagnosis',
    'value_chain',
    'risk_matrix',
    'gut_matrix',
    'swot',
    'porter_five_forces',
    'additional_information_required',
    'action_plan',
    'technical_conclusion',
    'professional_disclaimer',
  ];

  for (const key of requiredKeys) {
    if (!(key in raw)) errors.push(`Seção obrigatória ausente: ${key}`);
  }

  const es = raw.executive_summary;
  if (!isObject(es) || typeof es.general_conclusion !== 'string') {
    errors.push('executive_summary.general_conclusion ausente ou inválido.');
  }
  if (isObject(es) && !IMPACT_LEVELS.includes(es.impact_level as ImpactLevel)) {
    errors.push('executive_summary.impact_level inválido.');
  }

  if (!Array.isArray(raw.value_chain)) errors.push('value_chain deve ser uma lista.');
  if (!Array.isArray(raw.risk_matrix)) errors.push('risk_matrix deve ser uma lista.');
  if (!Array.isArray(raw.gut_matrix)) errors.push('gut_matrix deve ser uma lista.');
  if (!Array.isArray(raw.action_plan)) errors.push('action_plan deve ser uma lista.');

  if (typeof raw.professional_disclaimer !== 'string' || !raw.professional_disclaimer) {
    errors.push('professional_disclaimer ausente.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Normaliza a matriz GUT (recalcula score e ordem de prioridade).
  const diagnosis = raw as unknown as Diagnosis;
  const normalized: Diagnosis = {
    ...diagnosis,
    additional_information_required: ensureStringArray(diagnosis.additional_information_required),
    gut_matrix: sortGutMatrix(
      (diagnosis.gut_matrix ?? []).map((item) => ({
        action: item.action ?? '',
        gravity: Number(item.gravity) || 1,
        urgency: Number(item.urgency) || 1,
        trend: Number(item.trend) || 1,
        score: 0,
        priority_order: 0,
      })),
    ),
  };

  return { ok: true, errors: [], diagnosis: normalized };
}
