import { supabase, requireSupabase, STORAGE_BUCKET } from '../lib/supabaseClient';
import { isDemo } from '../lib/config';
import { validateUploadFile } from '../utils/validation';
import type { AnalysisDocument } from '../types/database';

function runningInDemo(): boolean {
  return isDemo || !supabase;
}

export interface UploadDocumentInput {
  file: File;
  companyId: string;
  analysisId: string;
  extractedText?: string;
  extractionStatus?: string;
}

/** Sanitiza o nome do arquivo para o caminho do storage. */
function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

export const documentService = {
  /**
   * Faz upload do documento ao bucket privado e registra os metadados.
   * Caminho: user_id/company_id/analysis_id/file_name
   */
  async upload(input: UploadDocumentInput): Promise<AnalysisDocument | null> {
    const validation = validateUploadFile(input.file);
    if (!validation.ok) throw new Error(validation.error);

    if (runningInDemo()) {
      // Em demo não há storage; retorna um registro simbólico (não persistido).
      return {
        id: 'demo-doc',
        company_id: input.companyId,
        analysis_id: input.analysisId,
        owner_id: '00000000-0000-0000-0000-000000000000',
        file_name: input.file.name,
        file_type: input.file.type,
        storage_path: null,
        extracted_text: input.extractedText ?? null,
        extraction_status: input.extractionStatus ?? null,
        created_at: new Date().toISOString(),
      };
    }

    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuário não autenticado.');

    const fileName = safeFileName(input.file.name);
    const storagePath = `${userId}/${input.companyId}/${input.analysisId}/${Date.now()}_${fileName}`;

    const { error: uploadError } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, input.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: input.file.type || undefined,
      });
    if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

    const { data, error } = await client
      .from('documents')
      .insert({
        company_id: input.companyId,
        analysis_id: input.analysisId,
        owner_id: userId,
        file_name: input.file.name,
        file_type: input.file.type,
        storage_path: storagePath,
        extracted_text: input.extractedText ?? null,
        extraction_status: input.extractionStatus ?? null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as AnalysisDocument;
  },

  async listByAnalysis(analysisId: string): Promise<AnalysisDocument[]> {
    if (runningInDemo()) return [];
    const client = requireSupabase();
    const { data, error } = await client
      .from('documents')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AnalysisDocument[];
  },

  /** Gera uma URL assinada temporária para download de um documento privado. */
  async getSignedUrl(storagePath: string, expiresInSeconds = 300): Promise<string | null> {
    if (runningInDemo() || !storagePath) return null;
    const client = requireSupabase();
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error) throw new Error(error.message);
    return data?.signedUrl ?? null;
  },
};
