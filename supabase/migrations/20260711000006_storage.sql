-- ============================================================================
-- 0006 — Media storage bucket + object-level RLS
--
-- All uploaded media lives in a single PRIVATE bucket. There is no public,
-- guessable URL: a viewer obtains media only via a signed URL, minted through
-- api-client's getSignedMediaUrl, which itself gates on media_items_visible.
--
-- This migration is the storage-tier backstop (enforcement layer, third leg of
-- visibility-model §6): even a client that calls createSignedUrl directly can
-- only mint a URL for an object whose media_items row is visible AND unfiltered
-- for them — because storage.objects.name == media_items.storage_path, and the
-- SELECT policy joins to media_items_visible (whose storage_path is NULL for
-- filtered viewers, so the join drops it).
--
-- NB: on a hosted Supabase project, storage.objects is owned by
-- supabase_storage_admin; if a direct `alter ... enable row level security`
-- is rejected there, manage these policies via the Storage API/dashboard with
-- the same predicates. Locally (PGlite / supabase start) this applies as-is.
-- ============================================================================

insert into storage.buckets (id, name, public)
  values ('media', 'media', false)
  on conflict (id) do nothing;

-- NB: storage.objects already has RLS ENABLED by the Supabase platform (it is
-- owned by supabase_storage_admin, so a `postgres`-run migration may neither
-- own nor `alter` it). We therefore only add policies here. The Docker-free
-- harness reproduces that platform state by enabling RLS in its shim.

-- Upload: only into the media bucket, owning the object you create.
create policy media_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and owner = auth.uid());

-- Read (mint signed URL): only for an object whose corresponding media_items
-- row is visible AND unfiltered for the caller. media_items_visible.storage_path
-- is NULL when withheld, so filtered/blocked/out-of-audience media never match.
create policy media_objects_select on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.media_items_visible v
      where v.storage_path = storage.objects.name
    )
  );

-- Delete: your own objects only.
create policy media_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner = auth.uid());
