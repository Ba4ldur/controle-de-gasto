import type { CnpjCardFields } from '../types/diagnosis';
import { formatCNPJ, onlyDigits } from './formatting';
import { validateUF } from './validation';

/**
 * Parser heurístico local do texto do cartão CNPJ (comprovante de inscrição
 * e situação cadastral da Receita Federal).
 *
 * É um pré-preenchimento determinístico, sem IA — serve como ponto de partida
 * de conferência quando não houver Edge Function/OpenAI disponível, ou como
 * fallback. NÃO inventa dados: só extrai o que reconhece explicitamente no
 * texto. Campos não reconhecidos ficam vazios para o usuário confirmar.
 */

export interface ParsedCnpjCard {
  fields: CnpjCardFields;
  missing_fields: string[];
  matched_fields: string[];
}

const EMPTY_FIELDS: CnpjCardFields = {
  cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  data_abertura: '',
  matriz_filial: '',
  porte: '',
  natureza_juridica: '',
  cnae_principal_codigo: '',
  cnae_principal_descricao: '',
  cnaes_secundarios: [],
  endereco: '',
  municipio: '',
  uf: '',
  situacao_cadastral: '',
  data_situacao_cadastral: '',
};

const FIELD_LABELS: Record<keyof CnpjCardFields, string> = {
  cnpj: 'CNPJ',
  razao_social: 'Razão social',
  nome_fantasia: 'Nome fantasia',
  data_abertura: 'Data de abertura',
  matriz_filial: 'Matriz/Filial',
  porte: 'Porte',
  natureza_juridica: 'Natureza jurídica',
  cnae_principal_codigo: 'CNAE principal (código)',
  cnae_principal_descricao: 'CNAE principal (descrição)',
  cnaes_secundarios: 'CNAEs secundários',
  endereco: 'Endereço',
  municipio: 'Município',
  uf: 'UF',
  situacao_cadastral: 'Situação cadastral',
  data_situacao_cadastral: 'Data da situação cadastral',
};

/**
 * Dobra acentos 1:1 (preservando o comprimento) e coloca em caixa alta.
 * Diferente de slugCompare (que usa NFD e altera o comprimento), aqui os
 * índices permanecem alinhados com a string original — essencial para
 * recortar o valor no ponto correto.
 */
function foldAccents(s: string): string {
  return (s ?? '')
    .replace(/[áàâãäÁÀÂÃÄ]/g, 'A')
    .replace(/[éèêëÉÈÊË]/g, 'E')
    .replace(/[íìîïÍÌÎÏ]/g, 'I')
    .replace(/[óòôõöÓÒÔÕÖ]/g, 'O')
    .replace(/[úùûüÚÙÛÜ]/g, 'U')
    .replace(/[çÇ]/g, 'C')
    .toUpperCase();
}

/**
 * Rótulos conhecidos do cartão CNPJ (já dobrados). Usados como fronteira:
 * quando várias etiquetas caem na mesma linha (comum em PDFs extraídos como
 * fluxo contínuo), o valor é cortado antes do próximo rótulo, evitando que
 * um campo "engula" os seguintes.
 */
const BOUNDARY_LABELS = [
  'NUMERO DE INSCRICAO',
  'NOME EMPRESARIAL',
  'RAZAO SOCIAL',
  'TITULO DO ESTABELECIMENTO (NOME DE FANTASIA)',
  'TITULO DO ESTABELECIMENTO',
  'NOME DE FANTASIA',
  'NOME FANTASIA',
  'DATA DE ABERTURA',
  'DATA DE INICIO DE ATIVIDADE',
  'PORTE',
  'CODIGO E DESCRICAO DA ATIVIDADE ECONOMICA PRINCIPAL',
  'CODIGO E DESCRICAO DAS ATIVIDADES ECONOMICAS SECUNDARIAS',
  'ATIVIDADE ECONOMICA PRINCIPAL',
  'CNAE FISCAL PRINCIPAL',
  'CNAE PRINCIPAL',
  'NATUREZA JURIDICA',
  'LOGRADOURO',
  'NUMERO',
  'COMPLEMENTO',
  'BAIRRO/DISTRITO',
  'BAIRRO',
  'CEP',
  'MUNICIPIO',
  'ESTADO',
  'SITUACAO CADASTRAL',
  'DATA DA SITUACAO CADASTRAL',
  'MOTIVO DE SITUACAO CADASTRAL',
  'ENTE FEDERATIVO RESPONSAVEL',
];

/** Corta o valor no início do próximo rótulo conhecido, se houver. */
function cutAtNextLabel(value: string, currentLabelFolded: string): string {
  const folded = foldAccents(value);
  let cutAt = value.length;
  for (const label of BOUNDARY_LABELS) {
    if (label === currentLabelFolded) continue;
    // Procura o rótulo respeitando fronteira de palavra, para não casar
    // dentro de outra palavra (ex.: "PORTE" dentro de "TRANSPORTES").
    let from = 0;
    for (;;) {
      const idx = folded.indexOf(label, from);
      if (idx === -1) break;
      const before = idx === 0 ? ' ' : folded[idx - 1];
      const after = folded[idx + label.length] ?? ' ';
      const wordBoundary = /[^A-Z0-9]/.test(before) && /[^A-Z]/.test(after);
      if (wordBoundary && idx > 0 && idx < cutAt) {
        cutAt = idx;
        break;
      }
      from = idx + 1;
    }
  }
  return value.slice(0, cutAt);
}

/** Encontra o valor após um rótulo em uma linha do tipo "RÓTULO: valor". */
function valueAfterLabel(lines: string[], labels: string[]): string {
  for (const line of lines) {
    const foldedLine = foldAccents(line); // índices alinhados com `line`
    for (const label of labels) {
      const foldedLabel = foldAccents(label);
      const idx = foldedLine.indexOf(foldedLabel);
      if (idx !== -1) {
        const afterLabel = line.slice(idx + label.length);
        // Corta antes do próximo rótulo (evita capturar campos seguintes).
        const bounded = cutAtNextLabel(afterLabel, foldedLabel);
        const cleaned = bounded.replace(/^[\s:.-]+/, '').trim();
        if (cleaned) return cleaned;
      }
    }
  }
  return '';
}

function findDate(text: string): string {
  const match = /(\d{2}\/\d{2}\/\d{4})/.exec(text);
  return match ? match[1] : '';
}

export function parseCnpjCardText(rawText: string): ParsedCnpjCard {
  const fields: CnpjCardFields = { ...EMPTY_FIELDS, cnaes_secundarios: [] };
  const text = rawText ?? '';
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // CNPJ — primeira ocorrência de 14 dígitos com máscara ou não
  const cnpjMatch = /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/.exec(text);
  if (cnpjMatch && onlyDigits(cnpjMatch[1]).length === 14) {
    fields.cnpj = formatCNPJ(cnpjMatch[1]);
  }

  fields.razao_social = valueAfterLabel(lines, [
    'NOME EMPRESARIAL',
    'RAZÃO SOCIAL',
    'RAZAO SOCIAL',
  ]);

  fields.nome_fantasia = valueAfterLabel(lines, [
    'TÍTULO DO ESTABELECIMENTO (NOME DE FANTASIA)',
    'NOME DE FANTASIA',
    'NOME FANTASIA',
    'TÍTULO DO ESTABELECIMENTO',
  ]);

  const abertura = valueAfterLabel(lines, [
    'DATA DE ABERTURA',
    'DATA DE INÍCIO DE ATIVIDADE',
    'DATA DE INICIO DE ATIVIDADE',
  ]);
  fields.data_abertura = findDate(abertura);

  const matriz = valueAfterLabel(lines, [
    'MATRIZ/FILIAL',
    'IDENTIFICAÇÃO DO ESTABELECIMENTO',
  ]);
  if (matriz) {
    fields.matriz_filial = /filial/i.test(matriz) ? 'Filial' : 'Matriz';
  } else if (/\bMATRIZ\b/i.test(text)) {
    fields.matriz_filial = 'Matriz';
  } else if (/\bFILIAL\b/i.test(text)) {
    fields.matriz_filial = 'Filial';
  }

  fields.porte = valueAfterLabel(lines, ['PORTE']);

  fields.natureza_juridica = valueAfterLabel(lines, [
    'NATUREZA JURÍDICA',
    'NATUREZA JURIDICA',
  ]);

  // CNAE principal: "CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL"
  const cnaePrincipal = valueAfterLabel(lines, [
    'CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL',
    'CODIGO E DESCRICAO DA ATIVIDADE ECONOMICA PRINCIPAL',
    'ATIVIDADE ECONÔMICA PRINCIPAL',
    'ATIVIDADE ECONOMICA PRINCIPAL',
    'CNAE PRINCIPAL',
    'CNAE FISCAL PRINCIPAL',
  ]);
  const cnaeCode = /(\d{2}\.?\d{2}-?\d?[-/]?\d{2})/.exec(cnaePrincipal || '');
  if (cnaeCode) {
    fields.cnae_principal_codigo = cnaeCode[1];
    fields.cnae_principal_descricao = cnaePrincipal
      .replace(cnaeCode[1], '')
      .replace(/^[\s-]+/, '')
      .trim();
  } else if (cnaePrincipal) {
    fields.cnae_principal_descricao = cnaePrincipal;
  }

  // Situação cadastral e data
  fields.situacao_cadastral = valueAfterLabel(lines, [
    'SITUAÇÃO CADASTRAL',
    'SITUACAO CADASTRAL',
  ]).replace(/data.*$/i, '').trim();

  const dataSituacao = valueAfterLabel(lines, [
    'DATA DA SITUAÇÃO CADASTRAL',
    'DATA DA SITUACAO CADASTRAL',
  ]);
  fields.data_situacao_cadastral = findDate(dataSituacao);

  // Município / UF
  fields.municipio = valueAfterLabel(lines, ['MUNICÍPIO', 'MUNICIPIO']);
  const ufValue = valueAfterLabel(lines, ['UF', 'ESTADO']);
  const ufCandidate = ufValue.trim().toUpperCase().slice(0, 2);
  if (validateUF(ufCandidate)) fields.uf = ufCandidate;

  // Endereço (logradouro + número + complemento + bairro + CEP quando presente)
  const logradouro = valueAfterLabel(lines, ['LOGRADOURO']);
  const numero = valueAfterLabel(lines, ['NÚMERO', 'NUMERO']);
  const complemento = valueAfterLabel(lines, ['COMPLEMENTO']);
  const bairro = valueAfterLabel(lines, ['BAIRRO/DISTRITO', 'BAIRRO']);
  const cep = valueAfterLabel(lines, ['CEP']);
  const enderecoParts = [logradouro, numero, complemento, bairro, cep].filter(Boolean);
  if (enderecoParts.length) {
    fields.endereco = enderecoParts.join(', ');
  }

  // Determina campos ausentes e reconhecidos
  const matched: string[] = [];
  const missing: string[] = [];
  (Object.keys(FIELD_LABELS) as (keyof CnpjCardFields)[]).forEach((key) => {
    const value = fields[key];
    const filled = Array.isArray(value) ? value.length > 0 : Boolean(value);
    if (filled) matched.push(FIELD_LABELS[key]);
    else missing.push(FIELD_LABELS[key]);
  });

  return { fields, missing_fields: missing, matched_fields: matched };
}

export { FIELD_LABELS as CNPJ_FIELD_LABELS };
