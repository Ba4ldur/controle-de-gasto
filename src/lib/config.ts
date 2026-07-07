/**
 * Configuração central lida das variáveis de ambiente do Vite.
 *
 * Nenhum segredo sensível vive aqui: apenas a URL e a chave pública (anon)
 * do Supabase, que são projetadas para uso no navegador. A chave da OpenAI
 * fica exclusivamente na Edge Function, no servidor.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** Quando true, o app opera com dados fictícios (sem Supabase/OpenAI). */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE?.trim() === 'true';

/** Indica se há credenciais de Supabase configuradas. */
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Quando não há Supabase configurado, o app funciona automaticamente em
 * modo demonstração para que o fluxo completo possa ser avaliado.
 */
export const isDemo = DEMO_MODE || !hasSupabaseConfig;

export const config = {
  supabaseUrl,
  supabaseAnonKey,
  appName: 'Attivare Reforma Intelligence',
  appShortName: 'Reforma Intelligence',
  org: 'Attivare Contabilidade',
} as const;
