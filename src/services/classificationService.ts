import type {
  ClassificationResult,
  CnpjCardFields,
  EconomicProfile,
} from '../types/diagnosis';
import { onlyDigits, slugCompare } from '../utils/formatting';

/**
 * Classificação preliminar LOCAL e determinística do perfil operacional a
 * partir do CNAE. Não usa IA e não inventa dados: quando o CNAE não é
 * reconhecido, classifica como "outro" e sinaliza a limitação.
 *
 * A classificação é uma hipótese técnica de conferência — o contador revisa.
 */

interface DivisionRule {
  profile: EconomicProfile;
  segment: string;
  currentTaxes: string[];
  likelyDocs: string[];
}

/** Regras por divisão CNAE (2 primeiros dígitos). */
function ruleForDivision(division: number): DivisionRule | null {
  if (division >= 1 && division <= 3)
    return { profile: 'industria', segment: 'Agropecuária', currentTaxes: ['PIS', 'Cofins', 'ICMS', 'FUNRURAL'], likelyDocs: ['NF-e'] };
  if (division >= 5 && division <= 9)
    return { profile: 'industria', segment: 'Indústria extrativa', currentTaxes: ['PIS', 'Cofins', 'ICMS', 'IPI'], likelyDocs: ['NF-e'] };
  if (division >= 10 && division <= 33) {
    const food = division >= 10 && division <= 12;
    return {
      profile: 'industria',
      segment: food ? 'Indústria de alimentos/bebidas' : 'Indústria de transformação',
      currentTaxes: ['PIS', 'Cofins', 'ICMS', 'IPI'],
      likelyDocs: ['NF-e'],
    };
  }
  if (division >= 41 && division <= 43)
    return { profile: 'construcao', segment: 'Construção civil', currentTaxes: ['PIS', 'Cofins', 'ISS', 'ICMS (materiais)', 'INSS/CPRB'], likelyDocs: ['NF-e', 'NFS-e'] };
  if (division >= 45 && division <= 47)
    return { profile: 'comercio', segment: 'Comércio varejista/atacadista', currentTaxes: ['PIS', 'Cofins', 'ICMS'], likelyDocs: ['NF-e', 'NFC-e'] };
  if (division >= 49 && division <= 53)
    return { profile: 'transporte', segment: 'Transporte e logística', currentTaxes: ['PIS', 'Cofins', 'ICMS (ICMS-transporte)', 'ISS (eventual)'], likelyDocs: ['CT-e', 'MDF-e', 'NF-e'] };
  if (division >= 55 && division <= 56)
    return { profile: 'alimentacao', segment: 'Alojamento e alimentação', currentTaxes: ['PIS', 'Cofins', 'ICMS', 'ISS (eventual)'], likelyDocs: ['NFC-e', 'NF-e', 'NFS-e (eventual)'] };
  if (division >= 58 && division <= 63)
    return { profile: 'tecnologia', segment: 'Informação e tecnologia', currentTaxes: ['PIS', 'Cofins', 'ISS'], likelyDocs: ['NFS-e'] };
  if (division >= 64 && division <= 66)
    return { profile: 'intermediacao', segment: 'Serviços financeiros', currentTaxes: ['PIS', 'Cofins', 'ISS', 'IOF'], likelyDocs: ['NFS-e'] };
  if (division === 68)
    return { profile: 'locacao', segment: 'Atividades imobiliárias', currentTaxes: ['PIS', 'Cofins', 'ISS (intermediação)'], likelyDocs: ['NFS-e'] };
  if (division >= 69 && division <= 75)
    return { profile: 'servico', segment: 'Serviços profissionais e técnicos', currentTaxes: ['PIS', 'Cofins', 'ISS'], likelyDocs: ['NFS-e'] };
  if (division >= 77 && division <= 82) {
    const rental = division === 77;
    return {
      profile: rental ? 'locacao' : 'servico',
      segment: rental ? 'Locação de bens' : 'Serviços administrativos',
      currentTaxes: ['PIS', 'Cofins', 'ISS'],
      likelyDocs: ['NFS-e'],
    };
  }
  if (division === 85)
    return { profile: 'educacao', segment: 'Educação', currentTaxes: ['PIS', 'Cofins', 'ISS'], likelyDocs: ['NFS-e'] };
  if (division >= 86 && division <= 88)
    return { profile: 'saude', segment: 'Saúde e serviços sociais', currentTaxes: ['PIS', 'Cofins', 'ISS'], likelyDocs: ['NFS-e'] };
  if (division >= 90 && division <= 93)
    return { profile: 'turismo', segment: 'Cultura, esporte e lazer', currentTaxes: ['PIS', 'Cofins', 'ISS'], likelyDocs: ['NFS-e'] };
  if (division >= 94 && division <= 96)
    return { profile: 'servico', segment: 'Outros serviços', currentTaxes: ['PIS', 'Cofins', 'ISS'], likelyDocs: ['NFS-e'] };
  return null;
}

function divisionFromCnae(code: string): number | null {
  const digits = onlyDigits(code);
  if (digits.length < 2) return null;
  return Number(digits.slice(0, 2));
}

/** Palavras-chave que reforçam o segmento de alimentação. */
function looksLikeFood(text: string): boolean {
  const t = slugCompare(text);
  return /padaria|restaurante|lanchonete|alimenta|confeitaria|bar |bebida|food/.test(t);
}

export function classifyCompany(
  fields: CnpjCardFields,
  observacoes?: string,
): ClassificationResult {
  const primaryRule = fields.cnae_principal_codigo
    ? ruleForDivision(divisionFromCnae(fields.cnae_principal_codigo) ?? -1)
    : null;

  const secondaryRules = fields.cnaes_secundarios
    .map((c) => {
      const code = /(\d{2})/.exec(c);
      return code ? ruleForDivision(Number(code[1])) : null;
    })
    .filter((r): r is DivisionRule => r !== null);

  const allRules = [primaryRule, ...secondaryRules].filter(
    (r): r is DivisionRule => r !== null,
  );

  const profiles = new Set(allRules.map((r) => r.profile));
  const segments = new Set(allRules.map((r) => r.segment));
  const currentTaxes = new Set(allRules.flatMap((r) => r.currentTaxes));
  const likelyDocs = new Set(allRules.flatMap((r) => r.likelyDocs));

  // Perfil final
  let economic_profile: EconomicProfile;
  if (!primaryRule && allRules.length === 0) {
    economic_profile = 'outro';
  } else if (profiles.size > 1) {
    economic_profile = 'operacao_mista';
  } else {
    economic_profile = primaryRule?.profile ?? allRules[0].profile;
  }

  // Reforço de alimentação por palavras-chave
  const textForKeywords = `${fields.cnae_principal_descricao} ${fields.cnaes_secundarios.join(' ')} ${observacoes ?? ''}`;
  if (looksLikeFood(textForKeywords)) {
    segments.add('Alimentação / food service');
    likelyDocs.add('NFC-e');
    if (economic_profile !== 'operacao_mista' && economic_profile !== 'alimentacao') {
      // Se há atividade industrial/comercial + alimentação, tende a mista
      if (profiles.size >= 1 && !profiles.has('alimentacao')) {
        economic_profile = 'operacao_mista';
      }
    }
  }

  const operationIndicators: string[] = [];
  if (primaryRule) operationIndicators.push(`Atividade principal: ${primaryRule.segment}`);
  if (secondaryRules.length) operationIndicators.push(`${secondaryRules.length} atividade(s) secundária(s) mapeada(s)`);
  if (profiles.size > 1) operationIndicators.push('Combinação de naturezas distintas indica operação mista');

  const assumptions: string[] = [];
  if (economic_profile === 'operacao_mista') {
    assumptions.push('Operação mista pressupõe segregação de receitas por atividade para tratamento correto.');
  }
  if (!primaryRule) {
    assumptions.push('CNAE principal não reconhecido pelas regras locais — confirmar manualmente.');
  }

  const limitations = [
    'Classificação baseada apenas no CNAE do cartão CNPJ; a operação real pode diferir.',
    'Regime tributário, faturamento e mix de receitas não constam do cartão CNPJ.',
  ];

  return {
    economic_profile,
    segments: [...segments],
    operation_indicators: operationIndicators,
    likely_documents: [...likelyDocs],
    current_taxes_potentially_involved: [...currentTaxes],
    new_taxes_potentially_involved: ['CBS', 'IBS', 'Imposto Seletivo (a confirmar por produto/NCM)'],
    assumptions,
    limitations,
  };
}
