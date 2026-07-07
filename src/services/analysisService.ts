import { supabase, requireSupabase } from '../lib/supabaseClient';
import { isDemo } from '../lib/config';
import { demoStore, generateId } from './demoStore';
import { authService } from './authService';
import type {
  Analysis,
  AnalysisStatus,
} from '../types/database';
import type {
  ClassificationResult,
  ConfidenceLevel,
  Diagnosis,
  ExtractionResult,
  ImpactLevel,
} from '../types/diagnosis';

function runningInDemo(): boolean {
  return isDemo || !supabase;
}

export interface CreateAnalysisInput {
  company_id: string;
  title: string;
  analysis_type: string;
  input_text?: string;
}

export type AnalysisPatch = Partial<{
  title: string;
  status: AnalysisStatus;
  impact_level: ImpactLevel | null;
  confidence_level: ConfidenceLevel | null;
  input_text: string;
  extracted_data: ExtractionResult | null;
  classification: ClassificationResult | null;
  diagnosis: Diagnosis | null;
  report_html: string;
  reviewer_notes: string;
  generated_summary: string;
  error_message: string | null;
}>;

export const analysisService = {
  async list(companyId?: string): Promise<Analysis[]> {
    if (runningInDemo()) return demoStore.listAnalyses(companyId);
    const client = requireSupabase();
    let query = client.from('analyses').select('*').order('created_at', { ascending: false });
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Analysis[];
  },

  async get(id: string): Promise<Analysis | null> {
    if (runningInDemo()) return demoStore.getAnalysis(id);
    const client = requireSupabase();
    const { data, error } = await client
      .from('analyses')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Analysis) ?? null;
  },

  async create(input: CreateAnalysisInput): Promise<Analysis> {
    const now = new Date().toISOString();
    if (runningInDemo()) {
      const user = await authService.getCurrentUser();
      const analysis: Analysis = {
        id: generateId(),
        company_id: input.company_id,
        owner_id: user?.id ?? '00000000-0000-0000-0000-000000000000',
        title: input.title,
        analysis_type: input.analysis_type,
        status: 'rascunho',
        impact_level: null,
        confidence_level: null,
        input_text: input.input_text ?? null,
        extracted_data: null,
        classification: null,
        diagnosis: null,
        report_html: null,
        reviewer_notes: null,
        generated_summary: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };
      return demoStore.upsertAnalysis(analysis);
    }
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    const { data, error } = await client
      .from('analyses')
      .insert({
        company_id: input.company_id,
        owner_id: userData.user?.id,
        title: input.title,
        analysis_type: input.analysis_type,
        status: 'rascunho',
        input_text: input.input_text ?? null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Analysis;
  },

  async update(id: string, patch: AnalysisPatch): Promise<Analysis> {
    const now = new Date().toISOString();
    if (runningInDemo()) {
      const existing = demoStore.getAnalysis(id);
      if (!existing) throw new Error('Análise não encontrada.');
      const updated: Analysis = { ...existing, ...patch, updated_at: now } as Analysis;
      return demoStore.upsertAnalysis(updated);
    }
    const client = requireSupabase();
    const { data, error } = await client
      .from('analyses')
      .update({ ...patch, updated_at: now })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Analysis;
  },

  async remove(id: string): Promise<void> {
    if (runningInDemo()) {
      demoStore.deleteAnalysis(id);
      return;
    }
    const client = requireSupabase();
    const { error } = await client.from('analyses').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
