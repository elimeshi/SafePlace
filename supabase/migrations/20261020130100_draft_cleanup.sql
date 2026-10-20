-- Abandoned-draft cleanup (ADR 0015).
--
-- 1. Orphaned storage objects. Deleting a media_items row (a removed
--    attachment, a discarded draft, the purge below, an account deletion)
--    leaves its object in the bucket. A trigger queues the paths and the
--    moderation worker sweeps them with the service client (ADR 0009: the
--    worker is the only runtime with the service role and Storage API access;
--    SQL cannot delete bucket objects).
-- 2. purge_abandoned_drafts is scheduled with pg_cron when the extension is
--    available (hosted Supabase). PGlite / CI do not have it and skip it.

create table moderation.orphaned_objects (
  storage_path text primary key,
  queued_at timestamptz not null default now()
);
alter table moderation.orphaned_objects enable row level security;
grant select, insert, delete on moderation.orphaned_objects to service_role;

-- Runs as the table owner so a client deleting its own media row (or the
-- cascade from a draft) can queue the path without any right on the queue.
create function moderation.queue_orphaned_objects() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into moderation.orphaned_objects (storage_path)
  select p from unnest(array[old.storage_path, old.blurred_storage_path]) as p
  where p is not null
  on conflict do nothing;
  return old;
end;
$$;

create trigger media_items_queue_orphans
  after delete on public.media_items
  for each row execute function moderation.queue_orphaned_objects();

-- The worker reads a batch, deletes the objects, then acknowledges. Removal is
-- idempotent (a missing object is already gone), so no claim lock is needed.
create function moderation.claim_orphaned_objects(p_limit integer default 100)
  returns setof text language sql stable set search_path = '' as $$
  select storage_path from moderation.orphaned_objects order by queued_at limit p_limit;
$$;

create function moderation.ack_orphaned_objects(p_paths text[]) returns integer
  language plpgsql set search_path = '' as $$
declare
  n integer;
begin
  delete from moderation.orphaned_objects where storage_path = any (p_paths);
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function
  moderation.claim_orphaned_objects(integer),
  moderation.ack_orphaned_objects(text[])
  to service_role;

-- Hourly purge of drafts older than the function's default (24h). Guarded:
-- a missing extension, or a role that may not create it, must not fail the
-- migration (the purge then has to be called by hand, as before).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'purge-abandoned-drafts',
      '17 * * * *',
      'select public.purge_abandoned_drafts()'
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end;
$$;
