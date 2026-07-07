/**
 * Tipos do diagnóstico estruturado gerado pela IA.
 *
 * Estes tipos espelham exatamente o JSON exigido no prompt interno
 * `generate-diagnosis`. Toda resposta da IA deve ser validável contra eles.
 */

export type ImpactLevel = 'baixo' | 'medio' | 'alto' | 'critico';
export type ConfidenceLevel = 'baixo' | 'medio' | 'alto';
export type Probability = 'baixa' | 'media' | 'alta';
export type Priority = 'baixa' | 'media' | 'alta' | 'critica';

export type DocumentQuality =
  | 'oficial'
  | 'ficticio'
  | 'incompleto'
  | 'inconsistente'
  | 'ilegivel';

export type EconomicProfile =
  | 'comercio'
  | 'servico'
  | 'industria'
  | 'operacao_mista'
  | 'alimentacao'
  | 'transporte'
  | 'tecnologia'
  | 'saude'
  | 'educacao'
  | 'turismo'
  | 'construcao'
  | 'locacao'
  | 'intermediacao'
  | 'outro';

/** Campos do cartão CNPJ extraídos. */
export interface CnpjCardFields {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  data_abertura: string;
  matriz_filial: string;
  porte: string;
  natureza_juridica: string;
  cnae_principal_codigo: string;
  cnae_principal_descricao: string;
  cnaes_secundarios: string[];
  endereco: string;
  municipio: string;
  uf: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string;
}

/** Saída do prompt `extract-cnpj-card`. */
export interface ExtractionResult {
  document_quality: DocumentQuality;
  confidence_level: ConfidenceLevel;
  fields: CnpjCardFields;
  missing_fields: string[];
  inconsistencies: string[];
  evidence: string[];
  warnings: string[];
}

/** Saída do prompt `classify-company`. */
export interface ClassificationResult {
  economic_profile: EconomicProfile;
  segments: string[];
  operation_indicators: string[];
  likely_documents: string[];
  current_taxes_potentially_involved: string[];
  new_taxes_potentially_involved: string[];
  assumptions: string[];
  limitations: string[];
}

export interface ExecutiveSummary {
  general_conclusion: string;
  impact_level: ImpactLevel;
  preliminary_notice: string;
  sufficient_for_financial_calculation: boolean;
}

export interface ExtractedDataReview {
  identified_data: string[];
  missing_data: string[];
  needs_confirmation: string[];
}

export interface EconomicProfileSection {
  classification: string;
  main_activity_analysis: string;
  secondary_activities_analysis: string;
  mixed_operation_indication: string;
  likely_tax_documents: string[];
}

export interface CurrentAndFutureTaxes {
  current_taxes: string[];
  future_taxes: string[];
  confirmation_required: string;
}

export interface ImpactDiagnosis {
  fiscal: string;
  operational: string;
  technological: string;
  financial: string;
  commercial: string;
  contractual: string;
  strategic: string;
}

export interface ValueChainStage {
  stage: string;
  possible_impact: string;
  risk: string;
  recommended_action: string;
}

export interface RiskMatrixItem {
  risk: string;
  category: string;
  probability: Probability;
  impact: ImpactLevel;
  risk_level: ImpactLevel;
  justification: string;
  recommended_control: string;
}

export interface GutMatrixItem {
  action: string;
  gravity: number;
  urgency: number;
  trend: number;
  score: number;
  priority_order: number;
}

export interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface PorterFiveForces {
  competitive_rivalry: string;
  customer_bargaining_power: string;
  supplier_bargaining_power: string;
  threat_new_entrants: string;
  threat_substitutes: string;
}

export interface ActionPlanItem {
  action: string;
  objective: string;
  responsible_area: string;
  priority: Priority;
  suggested_deadline: string;
  expected_deliverable: string;
}

export interface TechnicalConclusion {
  maturity_level: string;
  top_three_risks: string[];
  top_three_urgent_actions: string[];
  cnpj_card_sufficiency: string;
}

/** Diagnóstico completo — saída do prompt `generate-diagnosis`. */
export interface Diagnosis {
  executive_summary: ExecutiveSummary;
  extracted_data_review: ExtractedDataReview;
  economic_profile: EconomicProfileSection;
  current_and_future_taxes: CurrentAndFutureTaxes;
  impact_diagnosis: ImpactDiagnosis;
  value_chain: ValueChainStage[];
  risk_matrix: RiskMatrixItem[];
  gut_matrix: GutMatrixItem[];
  swot: Swot;
  porter_five_forces: PorterFiveForces;
  additional_information_required: string[];
  action_plan: ActionPlanItem[];
  technical_conclusion: TechnicalConclusion;
  professional_disclaimer: string;
}
