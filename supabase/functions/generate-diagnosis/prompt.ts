// =====================================================================
// Prompt interno da Edge Function `generate-diagnosis`.
// Mantém as regras de negócio: contador sênior + consultor tributário +
// especialista na Reforma Tributária do Consumo + analista gerencial,
// sem parecer jurídico definitivo, sem inventar dados, separando fatos,
// hipóteses e recomendações.
// =====================================================================

export const SYSTEM_PROMPT = `Você é um contador sênior, consultor tributário e especialista na Reforma Tributária do Consumo do Brasil (CBS, IBS e Imposto Seletivo), atuando também como analista gerencial.

REGRAS OBRIGATÓRIAS:
- Não emita parecer jurídico definitivo.
- Não invente dados (CNAE, faturamento, regime, alíquota, NCM, NBS, notas fiscais, margem). Se um dado não foi informado, trate-o como ausente.
- Não presuma o regime tributário apenas pelo porte (ME/EPP não implica Simples Nacional).
- Não conclua aumento ou redução de carga tributária sem dados financeiros.
- Separe com clareza: dados extraídos, dados ausentes, hipóteses técnicas, inferências gerenciais e recomendações preliminares.
- Deixe explícito que o diagnóstico por cartão CNPJ é PRELIMINAR e qualitativo.
- Escreva em português do Brasil, tom profissional e executivo, sem emojis.

SAÍDA: responda EXCLUSIVAMENTE com um objeto JSON válido, sem markdown, sem comentários, no formato exato especificado pelo usuário. Todos os campos são obrigatórios; use listas vazias quando não houver conteúdo, mas nunca omita chaves.`;

interface PromptInput {
  company: Record<string, unknown>;
  extraction: Record<string, unknown>;
  classification: Record<string, unknown>;
  input_text?: string;
}

export function buildUserPrompt(input: PromptInput): string {
  const schema = `{
  "executive_summary": {
    "general_conclusion": "string",
    "impact_level": "baixo | medio | alto | critico",
    "preliminary_notice": "string",
    "sufficient_for_financial_calculation": false
  },
  "extracted_data_review": { "identified_data": [], "missing_data": [], "needs_confirmation": [] },
  "economic_profile": {
    "classification": "string",
    "main_activity_analysis": "string",
    "secondary_activities_analysis": "string",
    "mixed_operation_indication": "string",
    "likely_tax_documents": []
  },
  "current_and_future_taxes": { "current_taxes": [], "future_taxes": [], "confirmation_required": "string" },
  "impact_diagnosis": {
    "fiscal": "string", "operational": "string", "technological": "string",
    "financial": "string", "commercial": "string", "contractual": "string", "strategic": "string"
  },
  "value_chain": [ { "stage": "", "possible_impact": "", "risk": "", "recommended_action": "" } ],
  "risk_matrix": [ { "risk": "", "category": "", "probability": "baixa | media | alta", "impact": "baixo | medio | alto | critico", "risk_level": "baixo | medio | alto | critico", "justification": "", "recommended_control": "" } ],
  "gut_matrix": [ { "action": "", "gravity": 1, "urgency": 1, "trend": 1, "score": 1, "priority_order": 1 } ],
  "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
  "porter_five_forces": {
    "competitive_rivalry": "", "customer_bargaining_power": "", "supplier_bargaining_power": "",
    "threat_new_entrants": "", "threat_substitutes": ""
  },
  "additional_information_required": [],
  "action_plan": [ { "action": "", "objective": "", "responsible_area": "", "priority": "baixa | media | alta | critica", "suggested_deadline": "", "expected_deliverable": "" } ],
  "technical_conclusion": {
    "maturity_level": "", "top_three_risks": [], "top_three_urgent_actions": [], "cnpj_card_sufficiency": ""
  },
  "professional_disclaimer": "string"
}`;

  const disclaimer =
    'Este diagnóstico é preliminar e foi elaborado com base nas informações disponíveis no cartão CNPJ e em dados complementares informados pelo usuário. Não substitui análise tributária quantitativa baseada em documentos fiscais, contábeis, financeiros, contratos, regime tributário, faturamento, margens, créditos e operações reais da empresa.';

  return `Gere o diagnóstico preliminar da Reforma Tributária do Consumo para a empresa abaixo.

DADOS CADASTRAIS DA EMPRESA (JSON):
${JSON.stringify(input.company, null, 2)}

DADOS EXTRAÍDOS DO CARTÃO CNPJ (JSON):
${JSON.stringify(input.extraction, null, 2)}

CLASSIFICAÇÃO PRELIMINAR (JSON):
${JSON.stringify(input.classification, null, 2)}

TEXTO BRUTO DO CARTÃO CNPJ (pode estar vazio):
"""
${(input.input_text ?? '').slice(0, 8000)}
"""

INSTRUÇÕES:
- Preencha TODAS as seções do JSON abaixo.
- gut_matrix: calcule score = gravity * urgency * trend e ordene priority_order do maior para o menor score. Valores de gravity/urgency/trend entre 1 e 5.
- Use "sufficient_for_financial_calculation": false, pois o cartão CNPJ não traz dados financeiros.
- No campo "professional_disclaimer", use EXATAMENTE este texto: "${disclaimer}"

Responda apenas com JSON no formato:
${schema}`;
}
