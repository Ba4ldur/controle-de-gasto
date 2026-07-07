-- =====================================================================
-- Attivare Reforma Intelligence — Endurecimento de segurança
-- =====================================================================
-- Migration aditiva (não altera as anteriores):
--  1. Impede escalonamento de privilégio: usuário comum não pode alterar
--     o próprio `role` (ex.: virar 'admin'). Só admin muda papéis.
--  2. Reforça o insert de documentos: só é possível vincular um documento
--     a empresas/análises do próprio usuário.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Proteção do campo profiles.role
-- ---------------------------------------------------------------------
-- A cláusula WITH CHECK do RLS enxerga apenas os valores NOVOS, então não
-- consegue comparar com o valor antigo. Um trigger BEFORE UPDATE resolve:
-- se o `role` mudou e o autor não é admin, a alteração é revertida.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    -- Ignora silenciosamente a tentativa de mudança de papel.
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------
-- 2. Insert de documentos: exige propriedade da empresa/análise vinculada
-- ---------------------------------------------------------------------
drop policy if exists "documents_insert" on public.documents;
create policy "documents_insert" on public.documents
  for insert with check (
    owner_id = auth.uid()
    and (
      analysis_id is null
      or exists (
        select 1 from public.analyses a
        where a.id = analysis_id and a.owner_id = auth.uid()
      )
    )
    and (
      company_id is null
      or exists (
        select 1 from public.companies c
        where c.id = company_id and c.owner_id = auth.uid()
      )
    )
  );
