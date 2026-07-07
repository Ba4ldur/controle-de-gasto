import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { isDemo } from '../lib/config';
import type { Profile, UserRole } from '../types/database';

const DEMO_SESSION_KEY = 'ari_demo_session';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

/** Usuário fictício do modo demonstração. */
const DEMO_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'demonstracao@attivare.local',
  full_name: 'Usuário Demonstração',
  role: 'contador',
};

export const authService = {
  isDemo,

  async getSession(): Promise<Session | null> {
    if (isDemo || !supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /** Retorna o usuário atual (ou o usuário demo). */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (isDemo || !supabase) {
      const active = localStorage.getItem(DEMO_SESSION_KEY);
      return active === 'active' ? DEMO_USER : null;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return mapUser(data.user, await fetchProfile(data.user.id));
  },

  async signIn(email: string, password: string): Promise<AuthUser> {
    if (isDemo || !supabase) {
      // Em demo qualquer credencial não vazia entra.
      if (!email.trim()) throw new Error('Informe um e-mail.');
      localStorage.setItem(DEMO_SESSION_KEY, 'active');
      return DEMO_USER;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw translateAuthError(error.message);
    if (!data.user) throw new Error('Não foi possível autenticar.');
    return mapUser(data.user, await fetchProfile(data.user.id));
  },

  async signUp(email: string, password: string, fullName: string): Promise<void> {
    if (isDemo || !supabase) {
      localStorage.setItem(DEMO_SESSION_KEY, 'active');
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw translateAuthError(error.message);
  },

  async resetPassword(email: string): Promise<void> {
    if (isDemo || !supabase) {
      throw new Error('Recuperação de senha indisponível no modo demonstração.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw translateAuthError(error.message);
  },

  async signOut(): Promise<void> {
    if (isDemo || !supabase) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      return;
    }
    await supabase.auth.signOut();
  },

  /** Assina mudanças de auth. Retorna função de cancelamento. */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    if (isDemo || !supabase) {
      return () => undefined;
    }
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }
      callback(mapUser(session.user, await fetchProfile(session.user.id)));
    });
    return () => data.subscription.unsubscribe();
  },
};

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data ?? null;
}

function mapUser(user: User, profile: Profile | null): AuthUser {
  return {
    id: user.id,
    email: user.email ?? profile?.email ?? '',
    full_name: profile?.full_name ?? (user.user_metadata?.full_name as string) ?? user.email ?? '',
    role: profile?.role ?? 'contador',
  };
}

function translateAuthError(message: string): Error {
  const map: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha inválidos.',
    'Email not confirmed': 'E-mail ainda não confirmado. Verifique sua caixa de entrada.',
    'User already registered': 'Este e-mail já está cadastrado.',
  };
  return new Error(map[message] ?? message);
}
