import type { CnpjCardFields } from '../types/diagnosis';
import { formatCNPJ, onlyDigits, slugCompare } from './formatting';
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

/** Encontra o valor após um rótulo em uma linha do tipo "RÓTULO: valor". */
function valueAfterLabel(lines: string[], labels: string[]): string {
  for (const line of lines) {
    const normalized = slugCompare(line);
    for (const label of labels) {
      const idx = normalized.indexOf(slugCompare(label));
      if (idx !== -1) {
        // Recorta na posição correspondente do texto original
        const afterLabel = line.slice(idx + label.length);
        const cleaned = afterLabel.replace(/^[\s:.-]+/, '').trim();
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
