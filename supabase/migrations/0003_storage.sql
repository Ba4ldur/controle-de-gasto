-- =====================================================================
-- Attivare Reforma Intelligence — Storage
-- =====================================================================
-- Bucket privado para documentos das análises.
-- Caminho dos arquivos: user_id/company_id/analysis_id/file_name
-- A primeira pasta do caminho é o user_id, usada para isolar por dono.
-- =====================================================================

-- Cria o bucket privado (idempotente).
insert into storage.buckets (id, name, public)
values ('analysis-documents', 'analysis-documents', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Políticas de acesso: usuário só acessa arquivos sob a própria pasta.
-- storage.foldername(name)[1] = primeiro segmento do caminho = user_id
-- ---------------------------------------------------------------------

drop policy if exists "analysis_docs_select_own" on storage.objects;
create policy "analysis_docs_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'analysis-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "analysis_docs_insert_own" on storage.objects;
create policy "analysis_docs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'analysis-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "analysis_docs_update_own" on storage.objects;
create policy "analysis_docs_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'analysis-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "analysis_docs_delete_own" on storage.objects;
create policy "analysis_docs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'analysis-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
