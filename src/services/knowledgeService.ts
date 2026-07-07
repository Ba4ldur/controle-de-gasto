import { supabase, requireSupabase } from '../lib/supabaseClient';
import { isDemo } from '../lib/config';
import type { KnowledgeSource } from '../types/database';

function runningInDemo(): boolean {
  return isDemo || !supabase;
}

/** Referências informativas embutidas (não são parecer jurídico). */
const BUILTIN_REFERENCES: KnowledgeSource[] = [
  {
    id: 'ref-ec-132',
    owner_id: 'system',
    title: 'Emenda Constitucional nº 132/2023',
    source_type: 'Legislação',
    source_url: 'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm',
    content:
      'Reforma Tributária do Consumo: institui as bases de CBS, IBS e Imposto Seletivo em substituição gradual a PIS, Cofins, ICMS, ISS e IPI.',
    is_active: true,
    created_at: new Date('2023-12-20').toISOString(),
    updated_at: new Date('2023-12-20').toISOString(),
  },
  {
    id: 'ref-lc-214',
    owner_id: 'system',
    title: 'Lei Complementar nº 214/2025',
    source_type: 'Legislação',
    source_url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
    content:
      'Regulamentação do IBS, da CBS e do Imposto Seletivo, incluindo regras de não cumulatividade, créditos e transição.',
    is_active: true,
    created_at: new Date('2025-01-16').toISOString(),
    updated_at: new Date('2025-01-16').toISOString(),
  },
  {
    id: 'ref-transicao',
    owner_id: 'system',
    title: 'Cronograma de transição (2026–2033)',
    source_type: 'Orientação',
    source_url: '',
    content:
      'Período de convivência entre o sistema atual e o novo, com alíquotas-teste a partir de 2026 e implementação plena até 2033. Confirmar sempre a fonte oficial mais recente.',
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
];

export const knowledgeService = {
  async list(): Promise<KnowledgeSource[]> {
    if (runningInDemo()) return BUILTIN_REFERENCES;
    const client = requireSupabase();
    const { data, error } = await client
      .from('knowledge_sources')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    // Combina referências embutidas com as do usuário.
    return [...(data ?? []), ...BUILTIN_REFERENCES];
  },

  async create(input: {
    title: string;
    source_type: string;
    source_url: string;
    content: string;
  }): Promise<KnowledgeSource> {
    if (runningInDemo()) {
      throw new Error('Adição de fontes indisponível no modo demonstração.');
    }
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    const ownerId = userData.user?.id;
    if (!ownerId) throw new Error('Usuário não autenticado.');
    const { data, error } = await client
      .from('knowledge_sources')
      .insert({ owner_id: ownerId, ...input, is_active: true })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as KnowledgeSource;
  },

  isBuiltin(source: KnowledgeSource): boolean {
    return source.owner_id === 'system';
  },
};
