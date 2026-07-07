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

  // Chamada à OpenAI (Chat Completions com resposta JSON).
  let content: string;
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return json({ error: `Falha na API da OpenAI (${openaiRes.status}): ${errText.slice(0, 500)}` }, 502);
    }

    const data = await openaiRes.json();
    content = data?.choices?.[0]?.message?.content ?? '';
    if (!content) {
      return json({ error: 'A OpenAI não retornou conteúdo.' }, 502);
    }
  } catch (err) {
    return json({ error: `Erro ao chamar a OpenAI: ${(err as Error).message}` }, 502);
  }

  // Parse + validação estrutural.
  let diagnosis: Record<string, unknown>;
  try {
    diagnosis = JSON.parse(content);
  } catch {
    return json({ error: 'A OpenAI retornou um JSON inválido.' }, 502);
  }

  const validation = validateDiagnosis(diagnosis);
  if (!validation.ok) {
    return json({ error: `Diagnóstico fora do formato esperado: ${validation.errors.join('; ')}` }, 502);
  }

  normalizeGut(diagnosis);

  return json({ diagnosis });
});
