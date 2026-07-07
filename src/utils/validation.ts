import { onlyDigits } from './formatting';

/** Validação do dígito verificador do CNPJ. */
export function validateCNPJ(value: string | null | undefined): boolean {
  if (!value) return false;
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  // Rejeita sequências repetidas (00000000000000, etc.)
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string): number => {
    let sum = 0;
    let factor = base.length - 7;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * factor;
      factor = factor === 2 ? 9 : factor - 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const base12 = cnpj.slice(0, 12);
  const digit1 = calcDigit(base12);
  const digit2 = calcDigit(base12 + digit1);
  return cnpj.endsWith(`${digit1}${digit2}`);
}

/** Valida UF brasileira (2 letras dentro do conjunto oficial). */
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export function validateUF(value: string | null | undefined): boolean {
  if (!value) return false;
  return UFS.includes(value.trim().toUpperCase());
}

export const UF_LIST = UFS;

/** Valida data ISO (YYYY-MM-DD) ou BR (DD/MM/AAAA) que exista no calendário. */
export function validateDate(value: string | null | undefined): boolean {
  if (!value) return true; // vazio é permitido (campo opcional)
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (iso) {
    y = Number(iso[1]); m = Number(iso[2]); d = Number(iso[3]);
  } else if (br) {
    d = Number(br[1]); m = Number(br[2]); y = Number(br[3]);
  } else {
    return false;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Tipos de arquivo permitidos no upload de documentos. */
export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'txt'] as const;
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain',
];
export const MAX_FILE_SIZE_MB = 15;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

/** Valida extensão, tipo MIME e tamanho de um arquivo antes do upload. */
export function validateUploadFile(file: File): FileValidationResult {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext as (typeof ALLOWED_FILE_EXTENSIONS)[number])) {
    return {
      ok: false,
      error: `Tipo de arquivo não permitido (.${ext}). Aceitos: PDF, PNG, JPG, JPEG, TXT.`,
    };
  }
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: `Formato "${file.type}" não permitido. Aceitos: PDF, PNG, JPG, JPEG, TXT.`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `Arquivo excede o limite de ${MAX_FILE_SIZE_MB} MB.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Arquivo vazio.' };
  }
  return { ok: true };
}

/**
 * Dados mínimos para gerar diagnóstico:
 * - razão social OU CNPJ;
 * - atividade principal OU texto do cartão CNPJ.
 * Município/UF entram como recomendação, não bloqueio.
 */
export interface MinimumDataInput {
  razao_social?: string | null;
  cnpj?: string | null;
  cnae_principal_descricao?: string | null;
  input_text?: string | null;
}

export interface MinimumDataResult {
  ok: boolean;
  missing: string[];
}

export function checkMinimumDataForDiagnosis(input: MinimumDataInput): MinimumDataResult {
  const missing: string[] = [];
  const hasIdentity = Boolean(input.razao_social?.trim() || input.cnpj?.trim());
  const hasActivity = Boolean(
    input.cnae_principal_descricao?.trim() || (input.input_text?.trim()?.length ?? 0) > 30,
  );
  if (!hasIdentity) missing.push('Razão social ou CNPJ');
  if (!hasActivity) missing.push('Atividade principal (CNAE) ou texto do cartão CNPJ');
  return { ok: missing.length === 0, missing };
}

/** Sanitiza texto livre para persistência (remove nulos e limita tamanho). */
export function sanitizeText(value: string, maxLength = 100_000): string {
  return (value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/\u0000/g, '')
    .slice(0, maxLength);
}
