/** Funções de formatação para o padrão brasileiro. */

/** Remove tudo que não for dígito. */
export function onlyDigits(value: string): string {
  return (value ?? '').replace(/\D+/g, '');
}

/** Formata CNPJ no padrão 00.000.000/0000-00. Retorna o valor original se inválido. */
export function formatCNPJ(value: string | null | undefined): string {
  if (!value) return '';
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length !== 14) return value;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
}

/** Aplica máscara de CNPJ progressivamente (para inputs). */
export function maskCNPJ(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** Formata valor numérico como moeda BRL. */
export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/** Converte 'YYYY-MM-DD' (ou ISO) para 'DD/MM/AAAA'. */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return '—';
  // Aceita ISO com hora ou apenas data.
  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  // Já pode estar em DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('pt-BR');
  }
  return value;
}

/** Data e hora amigável (DD/MM/AAAA HH:mm). */
export function formatDateTimeBR(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Converte 'DD/MM/AAAA' em 'YYYY-MM-DD' para salvar no banco (ou null). */
export function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

/**
 * Normaliza texto: colapsa espaços, remove caracteres de controle e
 * normaliza quebras de linha. Não altera o conteúdo semântico.
 */
export function normalizeText(value: string): string {
  return (value ?? '')
    .replace(/\r\n?/g, '\n')
    // Remove caracteres de controle (mantem quebras de linha e tabs)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Remove acentos e caixa para comparação de rótulos. */
export function slugCompare(value: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Iniciais do nome para avatar. */
export function initials(name: string | null | undefined): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Trunca texto com reticências. */
export function truncate(value: string, max: number): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
