// =====================================================================
// Edge Function: generate-diagnosis
// =====================================================================
// Recebe dados estruturados da análise, monta o prompt interno, chama a
// OpenAI exigindo resposta JSON, valida a estrutura e devolve o diagnóstico.
//
// A OPENAI_API_KEY vive apenas aqui (no servidor). NUNCA no frontend.
//
// Deploy:
//   supabase functions deploy generate-diagnosis
// Segredos:
//   supabase secrets set OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o-mini
// =====================================================================

import { SYSTEM_PROMPT, buildUserPrompt } from './prompt.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const IMPACT_LEVELS = ['baixo', 'medio', 'alto', 'critico'];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Validação estrutural mínima do diagnóstico (espelha o frontend). */
function validateDiagnosis(raw: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['Resposta não é um objeto JSON.'] };
  }
  const d = raw as Record<string, unknown>;
  const required = [
    'executive_summary', 'extracted_data_review', 'economic_profile',
    'current_and_future_taxes', 'impact_diagnosis', 'value_chain',
    'risk_matrix', 'gut_matrix', 'swot', 'porter_five_forces',
    'additional_information_required', 'action_plan', 'technical_conclusion',
    'professional_disclaimer',
  ];
  for (const key of required) {
    if (!(key in d)) errors.push(`Seção ausente: ${key}`);
  }
  const es = d.executive_summary as Record<string, unknown> | undefined;
  if (!es || typeof es.general_conclusion !== 'string') {
    errors.push('executive_summary.general_conclusion inválido.');
  }
  if (es && !IMPACT_LEVELS.includes(String(es.impact_level))) {
    errors.push('executive_summary.impact_level inválido.');
  }
  for (const arr of ['value_chain', 'risk_matrix', 'gut_matrix', 'action_plan']) {
    if (!Array.isArray(d[arr])) errors.push(`${arr} deve ser lista.`);
  }
  if (typeof d.professional_disclaimer !== 'string' || !d.professional_disclaimer) {
    errors.push('professional_disclaimer ausente.');
  }
  return { ok: errors.length === 0, errors };
}

/** Recalcula score e ordem da matriz GUT. */
function normalizeGut(raw: Record<string, unknown>): void {
  const clamp = (n: unknown) => Math.min(5, Math.max(1, Math.round(Number(n) || 1)));
  const items = (Array.isArray(raw.gut_matrix) ? raw.gut_matrix : []) as Record<string, unknown>[];
  const normalized = items
    .map((it) => {
      const gravity = clamp(it.gravity);
      const urgency = clamp(it.urgency);
      const trend = clamp(it.trend);
      return { ...it, gravity, urgency, trend, score: gravity * urgency * trend };
    })
    .sort((a, b) => (b.score as number) - (a.score as number))
    .map((it, i) => ({ ...it, priority_order: i + 1 }));
  raw.gut_matrix = normalized;
}

/**
 * Extrai o objeto JSON de um texto, tolerando cercas markdown (```json) e
 * texto adjacente que o modelo eventualmente inclua.
 */
function stripJsonFences(text: string): string {
  let t = (text ?? '').trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  if (fence) t = fence[1].trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  return t;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Chama a OpenAI (Chat Completions, resposta JSON) e devolve o conteúdo. */
async function callOpenAIChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API da OpenAI respondeu ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('a OpenAI retornou conteúdo vazio.');
  return content;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405);
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
  if (!apiKey) {
    return json({ error: 'OPENAI_API_KEY não configurada no servidor.' }, 500);
  }

  let payload: {
    company?: Record<string, unknown>;
    extraction?: Record<string, unknown>;
    classification?: Record<string, unknown>;
    input_text?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido (JSON esperado).' }, 400);
  }

  // Validação de entrada mínima.
  const company = payload.company ?? {};
  const hasIdentity = Boolean(company.razao_social || company.cnpj);
  const hasActivity = Boolean(
    (payload.extraction as Record<string, unknown>)?.fields ||
      payload.classification ||
      (payload.input_text && payload.input_text.trim().length > 20),
  );
  if (!hasIdentity || !hasActivity) {
    return json(
      { error: 'Dados mínimos ausentes: informe razão social/CNPJ e atividade ou texto do cartão CNPJ.' },
      400,
    );
  }

  const userPrompt = buildUserPrompt({
    company,
    extraction: payload.extraction ?? {},
    classification: payload.classification ?? {},
    input_text: payload.input_text ?? '',
  });

  // Chamada à OpenAI com validação e UMA retentativa corretiva quando a
  // resposta vem malformada (JSON inválido ou fora do schema). Erros de
  // rede/API não são repetidos (retornam fallback imediato e claro).
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  const MAX_ATTEMPTS = 2;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let content: string;
    try {
      content = await callOpenAIChat(apiKey, model, messages);
    } catch (err) {
      // Falha de conectividade/API — fallback imediato e explícito.
      return json(
        {
          error: `Não foi possível contatar a IA. ${(err as Error).message}`,
          code: 'openai_unavailable',
        },
        502,
      );
    }

    // Parse tolerante a cercas markdown.
    let diagnosis: Record<string, unknown> | null = null;
    try {
      diagnosis = JSON.parse(stripJsonFences(content)) as Record<string, unknown>;
    } catch {
      lastError = 'A IA retornou um JSON inválido.';
    }

    if (diagnosis) {
      const validation = validateDiagnosis(diagnosis);
      if (validation.ok) {
        normalizeGut(diagnosis);
        return json({ diagnosis });
      }
      lastError = `Diagnóstico fora do formato esperado: ${validation.errors.join('; ')}`;
    }

    // Se ainda há tentativas, reforça a instrução e repete uma vez.
    if (attempt < MAX_ATTEMPTS) {
      messages.push({
        role: 'user',
        content:
          `Sua resposta anterior foi inválida (${lastError}). ` +
          'Responda NOVAMENTE apenas com o objeto JSON completo e válido, sem markdown, ' +
          'sem texto fora do JSON, preenchendo todas as chaves obrigatórias do schema.',
      });
    }
  }

  // Fallback claro após esgotar as tentativas.
  return json(
    {
      error: `Não foi possível obter um diagnóstico válido da IA após ${MAX_ATTEMPTS} tentativas. ${lastError}`,
      code: 'invalid_ai_response',
    },
    502,
  );
});
