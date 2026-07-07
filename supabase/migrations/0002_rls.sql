-- =====================================================================
-- Attivare Reforma Intelligence — Row Level Security (RLS)
-- =====================================================================
-- Regra geral: cada usuário autenticado só acessa os próprios registros.
-- Administradores (profiles.role = 'admin') acessam todos os registros.
-- =====================================================================

-- Helper: usuário atual é admin?
-- SECURITY DEFINER + search_path fixo evita recursão de RLS ao ler profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Ativa RLS em todas as tabelas
alter table public.profiles          enable row level security;
alter table public.companies         enable row level security;
alter table public.analyses          enable row level security;
alter table public.documents         enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.audit_logs        enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- Macro de políticas owner-or-admin (aplicada manualmente por tabela)
-- ---------------------------------------------------------------------

-- companies
drop policy if exists "companies_select" on public.companies;
create policy "companies_select" on public.companies
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "companies_insert" on public.companies;
create policy "companies_insert" on public.companies
  for insert with check (owner_id = auth.uid());

drop policy if exists "companies_update" on public.companies;
create policy "companies_update" on public.companies
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "companies_delete" on public.companies;
create policy "companies_delete" on public.companies
  for delete using (owner_id = auth.uid() or public.is_admin());

-- analyses
drop policy if exists "analyses_select" on public.analyses;
create policy "analyses_select" on public.analyses
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "analyses_insert" on public.analyses;
create policy "analyses_insert" on public.analyses
  for insert with check (owner_id = auth.uid());

drop policy if exists "analyses_update" on public.analyses;
create policy "analyses_update" on public.analyses
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "analyses_delete" on public.analyses;
create policy "analyses_delete" on public.analyses
  for delete using (owner_id = auth.uid() or public.is_admin());

-- documents — acessíveis apenas pelo dono (e admin)
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "documents_insert" on public.documents;
create policy "documents_insert" on public.documents
  for insert with check (owner_id = auth.uid());

drop policy if exists "documents_update" on public.documents;
create policy "documents_update" on public.documents
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "documents_delete" on public.documents;
create policy "documents_delete" on public.documents
  for delete using (owner_id = auth.uid() or public.is_admin());

-- knowledge_sources
drop policy if exists "knowledge_select" on public.knowledge_sources;
create policy "knowledge_select" on public.knowledge_sources
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "knowledge_insert" on public.knowledge_sources;
create policy "knowledge_insert" on public.knowledge_sources
  for insert with check (owner_id = auth.uid());

drop policy if exists "knowledge_update" on public.knowledge_sources;
create policy "knowledge_update" on public.knowledge_sources
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "knowledge_delete" on public.knowledge_sources;
create policy "knowledge_delete" on public.knowledge_sources
  for delete using (owner_id = auth.uid() or public.is_admin());

-- audit_logs — inserção pelo próprio usuário; leitura pelo dono/admin
drop policy if exists "audit_select" on public.audit_logs;
create policy "audit_select" on public.audit_logs
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_insert" on public.audit_logs
  for insert with check (owner_id = auth.uid());
