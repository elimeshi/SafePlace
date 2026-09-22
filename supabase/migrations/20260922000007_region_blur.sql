-- ============================================================================
-- 0013 — Region blur: serving a redacted derivative instead of nothing
--
-- Today a viewer the filter applies to is served no image at all. This lets
-- the pipeline produce a second object with the women in the frame obscured,
-- and serve THAT to those viewers instead — so an incidental figure in a
-- street scene no longer costs the whole photograph.
--
-- The mechanism is the one that already exists, not a new one:
-- media_items_visible decides which path a viewer is served, and
-- storage.objects only signs a path that view returned (migration 0006). A
-- filtered viewer is handed the derivative's path and can sign that; the
-- original stays unreachable by exactly the rule that protected it before.
--
-- OFF BY DEFAULT. region_blur_enabled gates the read side, because whether a
-- blurred image reads as acceptable to this community — or as worse than no
-- image — is a product and community question, not an engineering one. The
-- code is finished; the switch is Eli's. See ADR 0012.
-- ============================================================================

alter table media_items add column blurred_storage_path text;

comment on column media_items.blurred_storage_path is
  'Object path of a derivative with the located regions irreversibly obscured. '
  'Served INSTEAD of the original to viewers the filter applies to, when '
  'region blur is enabled. NULL means no derivative exists and the original is '
  'withheld as before.';

alter table moderation.pipeline_config
  add column region_blur_enabled boolean not null default false;

-- What was done, never where anyone was. There is deliberately no column
-- holding the rectangles: "a woman is at these coordinates in this person's
-- photograph" is a more sensitive record than the verdict beside it, and once
-- the derivative exists nothing downstream needs it. Same reasoning as the
-- absent free-text column in classification_scores (ADR 0011).
create table moderation.redactions (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null unique
    references public.media_items (id) on delete cascade,
  region_count integer not null check (region_count > 0),
  coverage numeric(4, 3) not null check (coverage >= 0 and coverage <= 1),
  localizer text not null,
  model_id text not null,
  -- Whether the derivative was re-classified and came back clean. A false here
  -- means the derivative was discarded and the original withheld.
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table moderation.redactions enable row level security;
grant select, insert, update, delete on moderation.redactions to service_role;

-- The read side needs the flag, and the read side runs as the CALLER — who has
-- no rights in the moderation schema. SECURITY DEFINER exposes exactly one
-- boolean and nothing else about the configuration.
create function visibility.region_blur_enabled()
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select c.region_blur_enabled from moderation.pipeline_config c limit 1), false);
$$;

grant execute on function visibility.region_blur_enabled() to anon, authenticated, service_role;

-- --- the read model, extended ---------------------------------------------
-- Same contract as before with one branch added: when the original is withheld
-- AND a verified derivative exists AND the feature is on, serve the derivative.
--
-- Note which classifications reach that branch. 'pending_review' does not: it
-- is frozen because a human has not decided yet, and serving a machine-redacted
-- version of undecided content would pre-empt that decision. 'unclassified'
-- does not either: nothing is known about it, so there is nothing to have
-- redacted correctly.
create or replace view media_items_visible with (security_invoker = on) as
select
  m.id,
  m.post_id,
  m.comment_id,
  m.message_id,
  m.profile_id,
  m.uploader_id,
  m.classification,
  m.classified_at,
  m.created_at,
  case
    when perm.url_ok then m.storage_path
    when redact.ok then m.blurred_storage_path
    else null
  end as storage_path,
  not perm.url_ok as is_filtered,
  redact.ok as is_redacted
from public.media_items m
cross join lateral (
  select visibility.media_url_permitted(
    m.classification,
    visibility.media_in_viewers_family_space(m),
    m.uploader_id = auth.uid()
  ) as url_ok
) perm
cross join lateral (
  select
    not perm.url_ok
    and m.classification = 'contains_women'
    and m.blurred_storage_path is not null
    and visibility.region_blur_enabled() as ok
) redact;

grant select on media_items_visible to authenticated;

-- ============================================================================
-- Attaching a derivative. One function so the two writes cannot drift apart:
-- pointing the media row at an object that has no redaction record, or
-- recording a redaction for a row that does not point at it, would both be
-- states nothing else in the system knows how to read.
--
-- Only ever attaches to media the pipeline actually flagged, and only when the
-- derivative passed its re-classification gate.
-- ============================================================================
create function moderation.attach_redaction(
  p_media_item_id uuid,
  p_storage_path text,
  p_region_count integer,
  p_coverage numeric,
  p_localizer text,
  p_model_id text,
  p_verified boolean
) returns void language plpgsql set search_path = '' as $$
begin
  if not p_verified then
    raise exception 'refusing to attach an unverified redaction';
  end if;

  insert into moderation.redactions (
    media_item_id, region_count, coverage, localizer, model_id, verified
  ) values (
    p_media_item_id, p_region_count, p_coverage, p_localizer, p_model_id, true
  )
  on conflict (media_item_id) do update
    set region_count = excluded.region_count,
        coverage = excluded.coverage,
        localizer = excluded.localizer,
        model_id = excluded.model_id,
        verified = true,
        created_at = now();

  update public.media_items
     set blurred_storage_path = p_storage_path
   where id = p_media_item_id
     and classification = 'contains_women';
end;
$$;

grant execute on function moderation.attach_redaction(uuid, text, integer, numeric, text, text, boolean)
  to service_role;
