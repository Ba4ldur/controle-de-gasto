import type { Company } from '../types/database';
import type { Diagnosis } from '../types/diagnosis';
import { IMPACT_LABELS } from './impact';

/**
 * Gera um resumo comercial curto para WhatsApp a partir do diagnóstico.
 * Linguagem profissional e consultiva — sem prometer números que exigem
 * análise quantitativa.
 */
export function generateWhatsAppSummary(
  diagnosis: Diagnosis | null,
  company: Pick<Company, 'razao_social' | 'nome_fantasia'> | null,
  contactName?: string,
): string {
  const nome = contactName?.trim() || 'tudo bem?';
  const empresa =
    company?.razao_social?.trim() ||
    company?.nome_fantasia?.trim() ||
    'a empresa analisada';

  const impacto = diagnosis
    ? IMPACT_LABELS[diagnosis.executive_summary.impact_level].toLowerCase()
    : 'a ser confirmado';

  const pontos =
    diagnosis?.technical_conclusion?.top_three_risks?.slice(0, 3).filter(Boolean) ?? [];
  const pontosTexto = pontos.length
    ? pontos.join('; ')
    : 'pontos que serão detalhados na conversa';

  const saudacao = contactName?.trim() ? `Olá, ${nome}.` : 'Olá, tudo bem?';

  return [
    saudacao,
    '',
    `Fizemos um diagnóstico preliminar da empresa ${empresa} com base no cartão CNPJ.`,
    `O impacto estimado da Reforma Tributária foi classificado como ${impacto}.`,
    `A análise indica atenção especial em: ${pontosTexto}.`,
    '',
    'Para calcular o impacto financeiro real, será necessário avaliar faturamento, ' +
      'regime tributário, notas fiscais, compras, margens e contratos.',
    '',
    'Podemos agendar uma conversa para aprofundar? — Attivare Contabilidade.',
  ].join('\n');
}
