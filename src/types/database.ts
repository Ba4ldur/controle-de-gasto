/**
 * Tipagem do schema do banco (espelha as migrations em `supabase/migrations`).
 *
 * Mantida manualmente. Em produção pode-se regenerar com:
 *   supabase gen types typescript --project-id <id> > src/types/database.ts
 */

import type {
  ClassificationResult,
  ConfidenceLevel,
  Diagnosis,
  ExtractionResult,
  ImpactLevel,
} from './diagnosis';

export type UserRole = 'admin' | 'contador' | 'analista' | 'cliente';

export type RegimeTributario =
  | 'Não informado'
  | 'Simples Nacional'
  | 'Lucro Presumido'
  | 'Lucro Real'
  | 'MEI'
  | 'Imune/Isenta'
  | 'Outro';

export type AnalysisStatus =
  | 'rascunho'
  | 'processando'
  | 'em_revisao'
  | 'finalizado'
  | 'erro';

export type CnaeSecundario = {
  codigo: string;
  descricao: string;
};

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  owner_id: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  data_abertura: string | null;
  matriz_filial: string | null;
  porte: string | null;
  natureza_juridica: string | null;
  cnae_principal_codigo: string | null;
  cnae_principal_descricao: string | null;
  cnaes_secundarios: CnaeSecundario[];
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  situacao_cadastral: string | null;
  data_situacao_cadastral: string | null;
  regime_tributario: RegimeTributario;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type CompanyInsert = Omit<
  Company,
  'id' | 'created_at' | 'updated_at' | 'owner_id'
> & { owner_id?: string };

export interface Analysis {
  id: string;
  company_id: string;
  owner_id: string;
  title: string | null;
  analysis_type: string | null;
  status: AnalysisStatus;
  impact_level: ImpactLevel | null;
  confidence_level: ConfidenceLevel | null;
  input_text: string | null;
  extracted_data: ExtractionResult | null;
  classification: ClassificationResult | null;
  diagnosis: Diagnosis | null;
  report_html: string | null;
  reviewer_notes: string | null;
  generated_summary: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type AnalysisInsert = Partial<
  Omit<Analysis, 'id' | 'created_at' | 'updated_at'>
> &
  Pick<Analysis, 'company_id'>;

export interface AnalysisDocument {
  id: string;
  company_id: string | null;
  analysis_id: string | null;
  owner_id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string | null;
  extracted_text: string | null;
  extraction_status: string | null;
  created_at: string;
}

export interface KnowledgeSource {
  id: string;
  owner_id: string;
  title: string | null;
  source_type: string | null;
  source_url: string | null;
  content: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  owner_id: string;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Interface `Database` usada pelo cliente Supabase tipado. Mantida enxuta
 * (Row/Insert/Update) para as tabelas efetivamente consultadas no MVP.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      companies: {
        Row: Company;
        Insert: CompanyInsert;
        Update: Partial<Company>;
      };
      analyses: {
        Row: Analysis;
        Insert: AnalysisInsert;
        Update: Partial<Analysis>;
      };
      documents: {
        Row: AnalysisDocument;
        Insert: Partial<AnalysisDocument> & { file_name: string; owner_id: string };
        Update: Partial<AnalysisDocument>;
      };
      knowledge_sources: {
        Row: KnowledgeSource;
        Insert: Partial<KnowledgeSource> & { owner_id: string };
        Update: Partial<KnowledgeSource>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Partial<AuditLog> & { owner_id: string };
        Update: Partial<AuditLog>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
