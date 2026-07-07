-- =====================================================================
-- Attivare Reforma Intelligence — Schema inicial
-- =====================================================================
-- Cria as tabelas do MVP, funções utilitárias e triggers.
-- RLS e Storage são configurados em migrations separadas (0002, 0003).
-- =====================================================================

-- Extensão para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Função utilitária: atualiza updated_at automaticamente
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles — perfil do usuário, 1:1 com auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  role        text not null default 'contador'
              check (role in ('admin', 'contador', 'analista', 'cliente')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria automaticamente um profile ao criar um usuário no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    'contador'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- companies — empresas analisadas
-- ---------------------------------------------------------------------
create table if not exists public.companies (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid not null references auth.users (id) on delete cascade,
  cnpj                      text,
  razao_social              text,
  nome_fantasia             text,
  data_abertura             date,
  matriz_filial             text,
  porte                     text,
  natureza_juridica         text,
  cnae_principal_codigo     text,
  cnae_principal_descricao  text,
  cnaes_secundarios         jsonb not null default '[]'::jsonb,
  endereco                  text,
  municipio                 text,
  uf                        text,
  situacao_cadastral        text,
  data_situacao_cadastral   date,
  regime_tributario         text not null default 'Não informado',
  observacoes               text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_companies_owner on public.companies (owner_id);
create index if not exists idx_companies_cnpj on public.companies (cnpj);

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- analyses — diagnósticos gerados
-- ---------------------------------------------------------------------
create table if not exists public.analyses (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  owner_id          uuid not null references auth.users (id) on delete cascade,
  title             text,
  analysis_type     text,
  status            text not null default 'rascunho'
                    check (status in ('rascunho', 'processando', 'em_revisao', 'finalizado', 'erro')),
  impact_level      text check (impact_level in ('baixo', 'medio', 'alto', 'critico')),
  confidence_level  text check (confidence_level in ('baixo', 'medio', 'alto')),
  input_text        text,
  extracted_data    jsonb,
  classification    jsonb,
  diagnosis         jsonb,
  report_html       text,
  reviewer_notes    text,
  generated_summary text,
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_analyses_owner on public.analyses (owner_id);
create index if not exists idx_analyses_company on public.analyses (company_id);
create index if not exists idx_analyses_status on public.analyses (status);

drop trigger if exists trg_analyses_updated_at on public.analyses;
create trigger trg_analyses_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- documents — arquivos enviados (metadados; binário vive no Storage)
-- ---------------------------------------------------------------------
create table if not exists public.documents (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references public.companies (id) on delete cascade,
  analysis_id       uuid references public.analyses (id) on delete cascade,
  owner_id          uuid not null references auth.users (id) on delete cascade,
  file_name         text not null,
  file_type         text,
  storage_path      text,
  extracted_text    text,
  extraction_status text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_documents_owner on public.documents (owner_id);
create index if not exists idx_documents_analysis on public.documents (analysis_id);

-- ---------------------------------------------------------------------
-- knowledge_sources — base de conhecimento (referências)
-- ---------------------------------------------------------------------
create table if not exists public.knowledge_sources (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  title       text,
  source_type text,
  source_url  text,
  content     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_knowledge_owner on public.knowledge_sources (owner_id);

drop trigger if exists trg_knowledge_updated_at on public.knowledge_sources;
create trigger trg_knowledge_updated_at
  before update on public.knowledge_sources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- audit_logs — trilha de auditoria
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  entity_type text,
  entity_id   uuid,
  action      text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_owner on public.audit_logs (owner_id);
create index if not exists idx_audit_entity on public.audit_logs (entity_type, entity_id);
