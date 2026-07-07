/**
 * Dados de EXEMPLO FICTÍCIO — usados no modo demonstração.
 *
 * IMPORTANTE: nada aqui representa uma empresa real. Todos os valores são
 * inventados apenas para permitir avaliar o fluxo completo do sistema sem
 * infraestrutura (Supabase/OpenAI). O app deixa isso explícito na interface.
 */

import type { Company } from '../types/database';
import type {
  ClassificationResult,
  Diagnosis,
  ExtractionResult,
} from '../types/diagnosis';
import { sortGutMatrix } from '../utils/gut';

export const DEMO_OWNER_ID = '00000000-0000-0000-0000-000000000000';

export const SAMPLE_CNPJ_CARD_TEXT = `COMPROVANTE DE INSCRIÇÃO E DE SITUAÇÃO CADASTRAL (EXEMPLO FICTÍCIO)

NÚMERO DE INSCRIÇÃO: 12.345.678/0001-90
MATRIZ

DATA DE ABERTURA: 15/03/2016

NOME EMPRESARIAL: PADARIA E CONFEITARIA MODELO LTDA

TÍTULO DO ESTABELECIMENTO (NOME DE FANTASIA): PÃO NOSSO

PORTE: EPP

CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL:
10.91-1-01 - Fabricação de produtos de panificação industrial

CÓDIGO E DESCRIÇÃO DAS ATIVIDADES ECONÔMICAS SECUNDÁRIAS:
47.21-1-02 - Padaria e confeitaria com predominância de revenda
56.11-2-01 - Restaurantes e similares

CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA:
206-2 - Sociedade Empresária Limitada

LOGRADOURO: RUA DAS FLORES
NÚMERO: 1000
COMPLEMENTO: LOJA A
BAIRRO/DISTRITO: CENTRO
CEP: 30.000-000
MUNICÍPIO: BELO HORIZONTE
UF: MG

SITUAÇÃO CADASTRAL: ATIVA
DATA DA SITUAÇÃO CADASTRAL: 15/03/2016`;

export const SAMPLE_COMPANY: Company = {
  id: 'demo-company-1',
  owner_id: DEMO_OWNER_ID,
  cnpj: '12.345.678/0001-90',
  razao_social: 'PADARIA E CONFEITARIA MODELO LTDA',
  nome_fantasia: 'PÃO NOSSO',
  data_abertura: '2016-03-15',
  matriz_filial: 'Matriz',
  porte: 'EPP',
  natureza_juridica: '206-2 - Sociedade Empresária Limitada',
  cnae_principal_codigo: '10.91-1-01',
  cnae_principal_descricao: 'Fabricação de produtos de panificação industrial',
  cnaes_secundarios: [
    { codigo: '47.21-1-02', descricao: 'Padaria e confeitaria com predominância de revenda' },
    { codigo: '56.11-2-01', descricao: 'Restaurantes e similares' },
  ],
  endereco: 'RUA DAS FLORES, 1000, LOJA A, CENTRO, 30.000-000',
  municipio: 'BELO HORIZONTE',
  uf: 'MG',
  situacao_cadastral: 'ATIVA',
  data_situacao_cadastral: '2016-03-15',
  regime_tributario: 'Não informado',
  observacoes: 'Empresa fictícia usada para demonstração do sistema.',
  created_at: new Date('2026-01-10T12:00:00Z').toISOString(),
  updated_at: new Date('2026-01-10T12:00:00Z').toISOString(),
};

const SAMPLE_COMPANY_2: Company = {
  ...SAMPLE_COMPANY,
  id: 'demo-company-2',
  cnpj: '98.765.432/0001-10',
  razao_social: 'TECNOLOGIA E SISTEMAS ALFA LTDA',
  nome_fantasia: 'ALFA TECH',
  porte: 'ME',
  natureza_juridica: '206-2 - Sociedade Empresária Limitada',
  cnae_principal_codigo: '62.01-5-01',
  cnae_principal_descricao: 'Desenvolvimento de programas de computador sob encomenda',
  cnaes_secundarios: [
    { codigo: '62.02-3-00', descricao: 'Desenvolvimento e licenciamento de programas customizáveis' },
  ],
  endereco: 'AV. TECNOLÓGICA, 500, SALA 12, SAVASSI, 30.100-000',
  municipio: 'BELO HORIZONTE',
  uf: 'MG',
  situacao_cadastral: 'ATIVA',
  regime_tributario: 'Simples Nacional',
  data_abertura: '2020-06-01',
  data_situacao_cadastral: '2020-06-01',
  created_at: new Date('2026-02-05T12:00:00Z').toISOString(),
  updated_at: new Date('2026-02-05T12:00:00Z').toISOString(),
};

export const SAMPLE_COMPANIES: Company[] = [SAMPLE_COMPANY, SAMPLE_COMPANY_2];

export const SAMPLE_EXTRACTION: ExtractionResult = {
  document_quality: 'ficticio',
  confidence_level: 'alto',
  fields: {
    cnpj: SAMPLE_COMPANY.cnpj!,
    razao_social: SAMPLE_COMPANY.razao_social!,
    nome_fantasia: SAMPLE_COMPANY.nome_fantasia!,
    data_abertura: '15/03/2016',
    matriz_filial: 'Matriz',
    porte: 'EPP',
    natureza_juridica: SAMPLE_COMPANY.natureza_juridica!,
    cnae_principal_codigo: SAMPLE_COMPANY.cnae_principal_codigo!,
    cnae_principal_descricao: SAMPLE_COMPANY.cnae_principal_descricao!,
    cnaes_secundarios: SAMPLE_COMPANY.cnaes_secundarios.map((c) => `${c.codigo} - ${c.descricao}`),
    endereco: SAMPLE_COMPANY.endereco!,
    municipio: SAMPLE_COMPANY.municipio!,
    uf: SAMPLE_COMPANY.uf!,
    situacao_cadastral: 'ATIVA',
    data_situacao_cadastral: '15/03/2016',
  },
  missing_fields: [],
  inconsistencies: [],
  evidence: ['Documento de exemplo fictício fornecido pelo modo demonstração.'],
  warnings: ['Documento fictício: não representa uma empresa real.'],
};

export const SAMPLE_CLASSIFICATION: ClassificationResult = {
  economic_profile: 'operacao_mista',
  segments: ['Indústria de panificação', 'Comércio varejista de alimentos', 'Alimentação/food service'],
  operation_indicators: [
    'CNAE principal industrial (fabricação de panificação)',
    'CNAEs secundários de comércio varejista e restaurante',
    'Perfil predominante B2C com possível B2B em revenda',
  ],
  likely_documents: ['NF-e', 'NFC-e', 'NFS-e (eventual)'],
  current_taxes_potentially_involved: ['PIS', 'Cofins', 'ICMS', 'IPI (eventual)', 'ISS (eventual)'],
  new_taxes_potentially_involved: ['CBS', 'IBS', 'Imposto Seletivo (verificar produtos)'],
  assumptions: [
    'Presume-se operação mista pela combinação de CNAEs industriais, comerciais e de alimentação.',
  ],
  limitations: [
    'Regime tributário e faturamento não constam do cartão CNPJ e precisam ser confirmados.',
  ],
};

function buildSampleDiagnosis(): Diagnosis {
  const gut = sortGutMatrix([
    { action: 'Confirmar regime tributário e segregar receitas por atividade', gravity: 5, urgency: 5, trend: 4, score: 0, priority_order: 0 },
    { action: 'Revisar cadastro de produtos (NCM) e enquadramento no Imposto Seletivo', gravity: 4, urgency: 4, trend: 4, score: 0, priority_order: 0 },
    { action: 'Avaliar capacidade do ERP/emissor para CBS e IBS', gravity: 4, urgency: 3, trend: 5, score: 0, priority_order: 0 },
    { action: 'Mapear créditos de compras e insumos na não cumulatividade', gravity: 4, urgency: 3, trend: 3, score: 0, priority_order: 0 },
    { action: 'Revisar cláusulas tributárias de contratos com clientes e fornecedores', gravity: 3, urgency: 2, trend: 3, score: 0, priority_order: 0 },
  ]);

  return {
    executive_summary: {
      general_conclusion:
        'A empresa apresenta perfil de operação mista (indústria de panificação, comércio varejista e alimentação), o que a expõe a mudanças relevantes de tratamento tributário com a implementação de CBS e IBS. A migração para a não cumulatividade ampla tende a exigir revisão de créditos, cadastro de produtos e sistemas fiscais. Sem dados financeiros, não é possível afirmar aumento ou redução de carga.',
      impact_level: 'alto',
      preliminary_notice:
        'Diagnóstico preliminar baseado exclusivamente no cartão CNPJ e em dados informados. Não substitui análise quantitativa.',
      sufficient_for_financial_calculation: false,
    },
    extracted_data_review: {
      identified_data: [
        'CNPJ, razão social e nome fantasia',
        'CNAE principal e secundários',
        'Natureza jurídica e porte',
        'Município/UF e situação cadastral',
      ],
      missing_data: [
        'Regime tributário efetivo',
        'Faturamento dos últimos 12 meses',
        'Segregação de receitas por atividade',
        'Margens e estrutura de custos',
      ],
      needs_confirmation: [
        'Porte declarado x faturamento real',
        'Predominância entre indústria, comércio e alimentação',
      ],
    },
    economic_profile: {
      classification: 'Operação mista (indústria + comércio + alimentação)',
      main_activity_analysis:
        'A atividade principal (fabricação de produtos de panificação industrial) indica processo produtivo com insumos e possível geração de créditos na cadeia. Sob a Reforma, o produto tende a acompanhar as regras gerais de CBS/IBS, com atenção à seletividade quando aplicável.',
      secondary_activities_analysis:
        'As atividades secundárias de revenda e restaurante reforçam a natureza mista e o público B2C, com uso intensivo de NFC-e e potencial ISS/ISSQN em serviços de alimentação conforme o município.',
      mixed_operation_indication:
        'Há forte indício de operação mista: convivência de industrialização, revenda e serviço de alimentação exige segregação de receitas para tratamento correto.',
      likely_tax_documents: ['NF-e', 'NFC-e', 'NFS-e (eventual)'],
    },
    current_and_future_taxes: {
      current_taxes: ['PIS', 'Cofins', 'ICMS', 'IPI (na industrialização)', 'ISS (eventual em alimentação)'],
      future_taxes: ['CBS', 'IBS', 'Imposto Seletivo (a confirmar por produto/NCM)'],
      confirmation_required:
        'A incidência de Imposto Seletivo depende da classificação fiscal (NCM) dos produtos e deve ser confirmada. O enquadramento no Simples Nacional altera significativamente a análise.',
    },
    impact_diagnosis: {
      fiscal:
        'Substituição de PIS/Cofins por CBS e de ICMS/ISS por IBS muda a lógica de créditos e alíquotas. Operação mista exige segregação precisa.',
      operational:
        'Necessidade de revisar rotinas de emissão, escrituração e apuração, além de treinamento de equipe fiscal.',
      technological:
        'O ERP/emissor precisará suportar os novos tributos, layouts e cálculo de créditos. Avaliar roadmap do fornecedor de software.',
      financial:
        'Impacto financeiro não pode ser quantificado sem faturamento, margens e composição de compras. Requer análise dedicada.',
      commercial:
        'A formação de preço pode ser afetada pela mudança de carga e pela transparência tributária ao consumidor. Revisar política comercial.',
      contractual:
        'Contratos de fornecimento e prestação devem prever repasse e responsabilidade sobre os novos tributos.',
      strategic:
        'A empresa deve tratar a transição como projeto, aproveitando créditos e revisando cadeia de fornecedores para otimização legítima.',
    },
    value_chain: [
      { stage: 'Compras', possible_impact: 'Novo regime de créditos amplos sobre insumos e serviços', risk: 'Perda de crédito por fornecedor não conforme', recommended_action: 'Mapear fornecedores e qualificação fiscal' },
      { stage: 'Fornecedores', possible_impact: 'Fornecedores no Simples podem gerar crédito limitado', risk: 'Redução de competitividade de compras', recommended_action: 'Revisar base de fornecedores' },
      { stage: 'Estoque/Insumos', possible_impact: 'Revisão de cadastro de produtos e NCM', risk: 'Erro de enquadramento e Imposto Seletivo', recommended_action: 'Auditar cadastro de itens' },
      { stage: 'Produção/Serviço', possible_impact: 'Mudança na apuração da industrialização', risk: 'Cálculo incorreto de créditos', recommended_action: 'Revisar processo produtivo x fiscal' },
      { stage: 'Vendas', possible_impact: 'Emissão com CBS/IBS destacados', risk: 'Não conformidade em NFC-e/NF-e', recommended_action: 'Atualizar emissor fiscal' },
      { stage: 'Faturamento', possible_impact: 'Segregação de receitas por atividade', risk: 'Mistura de bases tributáveis', recommended_action: 'Implantar segregação de receitas' },
      { stage: 'Financeiro', possible_impact: 'Fluxo de caixa afetado por prazos de crédito', risk: 'Descasamento de caixa', recommended_action: 'Revisar planejamento financeiro' },
      { stage: 'Contabilidade/Fiscal', possible_impact: 'Novas obrigações acessórias', risk: 'Passivo por erro de apuração', recommended_action: 'Capacitar equipe e revisar rotinas' },
      { stage: 'Gestão comercial', possible_impact: 'Recomposição de preços', risk: 'Margem comprimida', recommended_action: 'Revisar formação de preço' },
      { stage: 'Contratos', possible_impact: 'Cláusulas de repasse tributário', risk: 'Litígio sobre responsabilidade', recommended_action: 'Revisar contratos vigentes' },
    ],
    risk_matrix: [
      { risk: 'Regime tributário não confirmado', category: 'Fiscal', probability: 'alta', impact: 'alto', risk_level: 'alto', justification: 'Toda a análise depende do regime efetivo', recommended_control: 'Confirmar regime e segregar receitas' },
      { risk: 'Cadastro de produtos/NCM desatualizado', category: 'Operacional', probability: 'media', impact: 'alto', risk_level: 'alto', justification: 'Impacta Imposto Seletivo e créditos', recommended_control: 'Auditoria de cadastro de itens' },
      { risk: 'ERP sem suporte a CBS/IBS', category: 'Tecnológico', probability: 'media', impact: 'critico', risk_level: 'critico', justification: 'Impede emissão e apuração corretas', recommended_control: 'Validar roadmap do fornecedor' },
      { risk: 'Contratos sem cláusula de repasse', category: 'Contratual', probability: 'media', impact: 'medio', risk_level: 'medio', justification: 'Risco de assumir tributo indevidamente', recommended_control: 'Revisão contratual' },
    ],
    gut_matrix: gut,
    swot: {
      strengths: ['Empresa ativa e estabelecida', 'Cadeia produtiva própria (industrialização)'],
      weaknesses: ['Operação mista sem segregação evidente', 'Dependência de definição de regime'],
      opportunities: ['Aproveitamento de créditos na não cumulatividade', 'Revisão de fornecedores para otimização'],
      threats: ['Aumento de complexidade na transição', 'Possível Imposto Seletivo sobre itens específicos'],
    },
    porter_five_forces: {
      competitive_rivalry: 'Setor de panificação/alimentação com alta concorrência local.',
      customer_bargaining_power: 'Consumidor final com poder moderado; sensibilidade a preço.',
      supplier_bargaining_power: 'Fornecedores de insumos com poder relevante; qualificação fiscal importa mais sob a Reforma.',
      threat_new_entrants: 'Barreira de entrada moderada no varejo de alimentação.',
      threat_substitutes: 'Substitutos relevantes (redes, food service, industrializados).',
    },
    additional_information_required: [
      'Regime tributário atual',
      'Faturamento dos últimos 12 meses',
      'Segregação de receitas por atividade',
      'Notas fiscais emitidas e de entrada',
      'Compras e insumos com respectivos NCM',
      'Margem bruta e DRE',
      'Balancete recente',
      'Contratos com clientes e fornecedores',
      'Cadastro de produtos e serviços (NCM/NBS)',
      'ERP/emissor fiscal utilizado',
      'Perfil B2B/B2C e perfil de fornecedores',
    ],
    action_plan: [
      { action: 'Confirmar regime e segregar receitas', objective: 'Estabelecer base correta de análise', responsible_area: 'Contábil/Fiscal', priority: 'critica', suggested_deadline: '30 dias', expected_deliverable: 'Relatório de segregação de receitas' },
      { action: 'Auditar cadastro de produtos e NCM', objective: 'Evitar erro de enquadramento', responsible_area: 'Fiscal/Operações', priority: 'alta', suggested_deadline: '45 dias', expected_deliverable: 'Cadastro revisado' },
      { action: 'Validar ERP para CBS/IBS', objective: 'Garantir conformidade de sistemas', responsible_area: 'TI/Fiscal', priority: 'alta', suggested_deadline: '60 dias', expected_deliverable: 'Parecer de aderência do sistema' },
      { action: 'Revisar contratos', objective: 'Prever repasse dos novos tributos', responsible_area: 'Jurídico/Comercial', priority: 'media', suggested_deadline: '90 dias', expected_deliverable: 'Minuta de cláusula tributária' },
    ],
    technical_conclusion: {
      maturity_level: 'Intermediário — estrutura ativa, porém sem preparação específica para a Reforma.',
      top_three_risks: [
        'Regime tributário não confirmado',
        'ERP possivelmente sem suporte a CBS/IBS',
        'Cadastro de produtos/NCM desatualizado',
      ],
      top_three_urgent_actions: [
        'Confirmar regime e segregar receitas',
        'Validar sistema fiscal para os novos tributos',
        'Auditar cadastro de produtos e NCM',
      ],
      cnpj_card_sufficiency:
        'O cartão CNPJ é insuficiente para cálculo financeiro. Serve para diagnóstico qualitativo preliminar e direcionamento das próximas etapas.',
    },
    professional_disclaimer:
      'Este diagnóstico é preliminar e foi elaborado com base nas informações disponíveis no cartão CNPJ e em dados complementares informados pelo usuário. Não substitui análise tributária quantitativa baseada em documentos fiscais, contábeis, financeiros, contratos, regime tributário, faturamento, margens, créditos e operações reais da empresa.',
  };
}

export const SAMPLE_DIAGNOSIS: Diagnosis = buildSampleDiagnosis();
