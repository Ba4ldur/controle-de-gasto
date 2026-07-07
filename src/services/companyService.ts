import { supabase, requireSupabase } from '../lib/supabaseClient';
import { isDemo } from '../lib/config';
import { demoStore, generateId } from './demoStore';
import { authService } from './authService';
import type { Company, CnaeSecundario } from '../types/database';

export type CompanyFormValues = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  data_abertura: string | null;
  matriz_filial: string;
  porte: string;
  natureza_juridica: string;
  cnae_principal_codigo: string;
  cnae_principal_descricao: string;
  cnaes_secundarios: CnaeSecundario[];
  endereco: string;
  municipio: string;
  uf: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string | null;
  regime_tributario: Company['regime_tributario'];
  observacoes: string;
};

function runningInDemo(): boolean {
  return isDemo || !supabase;
}

export const companyService = {
  async list(): Promise<Company[]> {
    if (runningInDemo()) return demoStore.listCompanies();
    const client = requireSupabase();
    const { data, error } = await client
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Company[];
  },

  async get(id: string): Promise<Company | null> {
    if (runningInDemo()) return demoStore.getCompany(id);
    const client = requireSupabase();
    const { data, error } = await client
      .from('companies')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Company) ?? null;
  },

  async create(values: CompanyFormValues): Promise<Company> {
    const now = new Date().toISOString();
    if (runningInDemo()) {
      const user = await authService.getCurrentUser();
      const company: Company = {
        id: generateId(),
        owner_id: user?.id ?? '00000000-0000-0000-0000-000000000000',
        ...normalize(values),
        created_at: now,
        updated_at: now,
      };
      return demoStore.upsertCompany(company);
    }
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    const { data, error } = await client
      .from('companies')
      .insert({ owner_id: userData.user?.id, ...normalize(values) })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Company;
  },

  async update(id: string, values: CompanyFormValues): Promise<Company> {
    const now = new Date().toISOString();
    if (runningInDemo()) {
      const existing = demoStore.getCompany(id);
      if (!existing) throw new Error('Empresa não encontrada.');
      const updated: Company = {
        ...existing,
        ...normalize(values),
        updated_at: now,
      };
      return demoStore.upsertCompany(updated);
    }
    const client = requireSupabase();
    const { data, error } = await client
      .from('companies')
      .update({ ...normalize(values), updated_at: now })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Company;
  },

  async remove(id: string): Promise<void> {
    if (runningInDemo()) {
      demoStore.deleteCompany(id);
      return;
    }
    const client = requireSupabase();
    const { error } = await client.from('companies').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

/** Converte strings vazias em null e garante o formato dos campos. */
function normalize(values: CompanyFormValues) {
  const emptyToNull = (v: string) => (v && v.trim() ? v.trim() : null);
  return {
    cnpj: emptyToNull(values.cnpj),
    razao_social: emptyToNull(values.razao_social),
    nome_fantasia: emptyToNull(values.nome_fantasia),
    data_abertura: values.data_abertura || null,
    matriz_filial: emptyToNull(values.matriz_filial),
    porte: emptyToNull(values.porte),
    natureza_juridica: emptyToNull(values.natureza_juridica),
    cnae_principal_codigo: emptyToNull(values.cnae_principal_codigo),
    cnae_principal_descricao: emptyToNull(values.cnae_principal_descricao),
    cnaes_secundarios: values.cnaes_secundarios.filter((c) => c.codigo || c.descricao),
    endereco: emptyToNull(values.endereco),
    municipio: emptyToNull(values.municipio),
    uf: values.uf ? values.uf.trim().toUpperCase().slice(0, 2) : null,
    situacao_cadastral: emptyToNull(values.situacao_cadastral),
    data_situacao_cadastral: values.data_situacao_cadastral || null,
    regime_tributario: values.regime_tributario,
    observacoes: emptyToNull(values.observacoes),
  };
}
