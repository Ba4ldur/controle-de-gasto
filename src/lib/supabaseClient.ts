import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, hasSupabaseConfig } from './config';

/**
 * Cliente Supabase único para todo o app.
 *
 * O cliente é tipado de forma permissiva (sem o generic `Database`): os
 * serviços aplicam casts explícitos (`as Company`, `as Analysis`, …) nos
 * retornos, o que evita o atrito de manter os tipos gerados sincronizados à
 * mão e mantém as consultas legíveis. Os tipos de domínio vivem em
 * `src/types/database.ts`.
 *
 * Se as variáveis de ambiente não estiverem configuradas, o cliente não é
 * criado (o app roda em modo demonstração). Serviços verificam `supabase`
 * antes de usá-lo e recorrem aos dados fictícios quando `null`.
 */
export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Garante um cliente Supabase ou lança erro claro (uso interno dos serviços). */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.',
    );
  }
  return supabase;
}

export const STORAGE_BUCKET = 'analysis-documents';
