import { supabase } from '../lib/supabaseClient';
import { isDemo } from '../lib/config';
import { validateDiagnosis } from './diagnosisValidation';
import { buildDemoDiagnosisForInput } from '../data/demoDiagnosis';
import type { Company } from '../types/database';
import type {
  ClassificationResult,
  Diagnosis,
  ExtractionResult,
} from '../types/diagnosis';

export interface GenerateDiagnosisInput {
  company: Pick<
    Company,
    | 'cnpj'
    | 'razao_social'
    | 'nome_fantasia'
    | 'municipio'
    | 'uf'
    | 'regime_tributario'
    | 'observacoes'
  >;
  extraction: ExtractionResult;
  classification: ClassificationResult;
  input_text?: string;
}

export interface GenerateDiagnosisResult {
  diagnosis: Diagnosis;
  source: 'ia' | 'demo';
}

/**
 * Gera o diagnóstico estruturado.
 *
 * - Modo real: invoca a Edge Function `generate-diagnosis` (que chama a
 *   OpenAI no servidor — a chave nunca aparece no frontend).
 * - Modo demo: monta um diagnóstico de exemplo coerente com os dados.
 *
 * Em ambos os casos a saída é validada estruturalmente antes de retornar.
 */
export const aiService = {
  async generateDiagnosis(input: GenerateDiagnosisInput): Promise<GenerateDiagnosisResult> {
    if (isDemo || !supabase) {
      const diagnosis = buildDemoDiagnosisForInput({
        extraction: input.extraction,
        classification: input.classification,
        regimeTributario: input.company.regime_tributario,
        observacoes: input.company.observacoes ?? undefined,
      });
      // Simula latência para exercitar os estados de carregamento.
      await new Promise((resolve) => setTimeout(resolve, 900));
      const validated = validateDiagnosis(diagnosis);
      if (!validated.ok || !validated.diagnosis) {
        throw new Error(`Diagnóstico de demonstração inválido: ${validated.errors.join(', ')}`);
      }
      return { diagnosis: validated.diagnosis, source: 'demo' };
    }

    const { data, error } = await supabase.functions.invoke<{
      diagnosis?: unknown;
      error?: string;
    }>('generate-diagnosis', {
      body: {
        company: input.company,
        extraction: input.extraction,
        classification: input.classification,
        input_text: input.input_text ?? '',
      },
    });

    if (error) {
      // FunctionsHttpError expõe o corpo da resposta em `context`; extraímos
      // a mensagem detalhada da Edge Function em vez do genérico "non-2xx".
      const detail = await extractFunctionError(error);
      throw new Error(detail);
    }
    if (!data || data.error) {
      throw new Error(data?.error ?? 'A função de diagnóstico não retornou dados.');
    }

    const validated = validateDiagnosis(data.diagnosis);
    if (!validated.ok || !validated.diagnosis) {
      throw new Error(
        `A IA retornou um diagnóstico fora do formato esperado: ${validated.errors.join('; ')}`,
      );
    }

    return { diagnosis: validated.diagnosis, source: 'ia' };
  },
};

/** Lê a mensagem detalhada de erro retornada pela Edge Function. */
async function extractFunctionError(error: unknown): Promise<string> {
  const fallback = 'Falha ao gerar diagnóstico com a IA. Tente novamente em instantes.';
  const ctx = (error as { context?: unknown })?.context;
  if (ctx && typeof (ctx as Response).json === 'function') {
    try {
      const body = await (ctx as Response).json();
      if (body?.error) return String(body.error);
    } catch {
      // corpo não-JSON: mantém o fallback
    }
  }
  const message = (error as { message?: string })?.message;
  return message ? `Falha ao gerar diagnóstico: ${message}` : fallback;
}
