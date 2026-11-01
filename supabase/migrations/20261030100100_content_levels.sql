-- ============================================================================
-- Content levels (ADR 0018) + dedupe hashes (ADR 0019)
--
-- The lifecycle enum stays. Four nullable level columns sit beside it; a
-- resolved row (general / contains_women) always carries all four, and a row
-- never carries a 3 (prohibited content is a review-queue matter, never a
-- published level). Viewer maxima live on filter_settings, 0..2.
-- hide_content_with_women becomes GENERATED from max_sex_level so every SQL
-- reader of it (viewer_hides_women, the parity suite) keeps working unchanged.
-- See docs/architecture/content-categories.md §5.
-- ============================================================================

-- --- media_items ------------------------------------------------------------
alter table public.media_items
  add column sex_level        smallint check (sex_level        between 0 and 2),
  add column violence_level   smallint check (violence_level   between 0 and 2),
  add column religion_level   smallint check (religion_level   between 0 and 2),
  add column addictions_level smallint check (addictions_level between 0 and 2),
  add column content_sha256   text,
  add column content_dhash    text;

-- Legacy resolved rows: the only thing known about them is the women axis.
update public.media_items
   set sex_level = case classification when 'contains_women' then 1 else 0 end,
       violence_level = 0, religion_level = 0, addictions_level = 0
 where classification in ('general', 'contains_women');

alter table public.media_items add constraint media_levels_match_lifecycle check (
  (classification in ('general', 'contains_women'))
    = (sex_level is not null and violence_level is not null
       and religion_level is not null and addictions_level is not null)
  and (classification <> 'contains_women' or sex_level >= 1)
  and (classification <> 'general' or sex_level = 0)
);

create index idx_media_sha256 on public.media_items (content_sha256) where content_sha256 is not null;
create index idx_media_dhash  on public.media_items (content_dhash)  where content_dhash  is not null;

comment on column public.media_items.sex_level is
  'Resolved level per docs/architecture/content-categories.md; NULL until classified. Never 3.';

-- --- filter_settings --------------------------------------------------------
alter table public.filter_settings
  add column max_sex_level        smallint not null default 0 check (max_sex_level        between 0 and 2),
  add column max_violence_level   smallint not null default 0 check (max_violence_level   between 0 and 2),
  add column max_religion_level   smallint not null default 0 check (max_religion_level   between 0 and 2),
  add column max_addictions_level smallint not null default 0 check (max_addictions_level between 0 and 2);

update public.filter_settings
   set max_sex_level = case when hide_content_with_women then 0 else 1 end;

-- No view or policy depends on hide_content_with_women (checked across every
-- migration up to 20261021100000): its readers are SQL/plpgsql functions
-- (viewer_hides_women, handle_new_user), which resolve the name at call time.
alter table public.filter_settings drop column hide_content_with_women;
alter table public.filter_settings
  add column hide_content_with_women boolean generated always as (max_sex_level = 0) stored;

-- Signup defaults: body of 20260711000005_auth_defaults.sql (the only
-- definition) verbatim, with only the filter_settings insert changed. Mirror of
-- DEFAULT_FILTER_SETTINGS.contentLevels; parity test in db-testing/auth-defaults.
create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = '' as $$
declare
  declared_gender public.gender;
  declared_name text;
begin
  begin
    declared_gender := (new.raw_user_meta_data ->> 'gender')::public.gender;
  exception when others then
    declared_gender := null;
  end;

  if declared_gender is null then
    raise exception 'signup requires a declared gender (male|female) in user metadata';
  end if;

  declared_name := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'New member');

  insert into public.profiles (id, display_name, gender)
    values (new.id, declared_name, declared_gender);

  -- Gender-conditioned defaults. Source of truth: DEFAULT_FILTER_SETTINGS.
  --   male   → max_sex_level 0, hide women accounts, avatars filtered
  --   female → max_sex_level 1, neither
  -- (the three other max_*_level columns take their default 0 for everyone —
  --  decision (b); show_suggested_posts / gender_separation_* use their column
  --  defaults, which already match DEFAULT_FILTER_SETTINGS.)
  insert into public.filter_settings (
    user_id,
    max_sex_level,
    hide_women_accounts,
    filter_applies_to_avatars
  ) values (
    new.id,
    case when declared_gender = 'male' then 0 else 1 end,
    declared_gender = 'male',
    declared_gender = 'male'
  );

  return new;
end;
$$;

-- --- pipeline config --------------------------------------------------------
alter table moderation.pipeline_config
  alter column model_id set default 'claude-haiku-5-5',
  add column escalation_model_id text;  -- NULL = escalation off (ADR 0018 §6)
update moderation.pipeline_config set model_id = 'claude-haiku-5-5' where model_id = 'claude-haiku-4-5';

-- --- scores + review queue --------------------------------------------------
alter table moderation.classification_scores add column levels jsonb;
alter table moderation.review_queue add column ai_levels jsonb;
comment on column moderation.review_queue.ai_levels is
  'The model''s per-group answer for an AI-raised item, so a moderator sees what was found and where.';

-- At most one open AI-raised item per media, now across the new AI reasons too.
drop index moderation.uq_review_open_ai_item;
create unique index uq_review_open_ai_item
  on moderation.review_queue (media_item_id, reason)
  where status <> 'resolved'
    and reason in ('ai_medium_confidence', 'classification_failed', 'ai_prohibited_content', 'ai_refusal');

-- ============================================================================
-- Completion, now per group. Body of 20260922000002_moderation_pipeline.sql
-- (the only definition) with levels, hashes, review reason and ai_levels
-- merged in. Still idempotent by the job's state transition: a replay finds
-- the job done and changes nothing.
-- ============================================================================
drop function moderation.complete_classification_job(uuid, public.media_classification, text, text, text, numeric, numeric);

create function moderation.complete_classification_job(
  p_media_item_id uuid,
  p_classification public.media_classification,
  p_provider text,
  p_model_id text,
  p_verdict text,
  p_confidence numeric,
  p_woman_probability numeric,
  p_levels jsonb,                                   -- resolved levels, or NULL when pending
  p_review_reason moderation.review_reason default null,
  p_ai_levels jsonb default null,                   -- the raw per-group answer, for the queue
  p_content_sha256 text default null,
  p_content_dhash text default null
) returns void language plpgsql set search_path = '' as $$
declare
  v_transitioned integer;
begin
  update moderation.classification_jobs
     set state = 'done',
         locked_at = null,
         locked_by = null,
         last_error = null,
         updated_at = now()
   where media_item_id = p_media_item_id
     and state <> 'done';
  get diagnostics v_transitioned = row_count;
  if v_transitioned = 0 then
    return;  -- already completed; a replay must not re-decide anything
  end if;

  if p_classification in ('general', 'contains_women') and p_levels is null then
    raise exception 'a resolved classification must carry levels';
  end if;

  -- Only ever moves an item OUT of 'unclassified'. The pipeline does not
  -- overwrite a moderator's decision.
  update public.media_items
     set classification   = p_classification,
         classified_at    = now(),
         sex_level        = (p_levels->>'sex')::smallint,
         violence_level   = (p_levels->>'violence')::smallint,
         religion_level   = (p_levels->>'religion')::smallint,
         addictions_level = (p_levels->>'addictions')::smallint,
         content_sha256   = coalesce(p_content_sha256, content_sha256),
         content_dhash    = coalesce(p_content_dhash, content_dhash)
   where id = p_media_item_id
     and classification = 'unclassified';

  insert into moderation.classification_scores (
    media_item_id, provider, model_id, verdict, confidence,
    woman_probability, resolved_classification, levels
  ) values (
    p_media_item_id, p_provider, p_model_id, p_verdict, p_confidence,
    p_woman_probability, p_classification, coalesce(p_levels, p_ai_levels)
  );

  if p_classification = 'pending_review' then
    insert into moderation.review_queue (media_item_id, reason, ai_levels, post_id, comment_id, message_id, subject_user_id)
    select p_media_item_id, coalesce(p_review_reason, 'ai_medium_confidence'), p_ai_levels,
           m.post_id, m.comment_id, m.message_id, m.uploader_id
      from public.media_items m
     where m.id = p_media_item_id
    on conflict do nothing;
  end if;
end;
$$;

-- --- dedupe lookup (ADR 0019): equality only, resolved rows only --------------
create function moderation.find_resolved_by_hash(p_sha256 text, p_dhash text, p_exclude uuid)
  returns table (media_item_id uuid, classification public.media_classification,
                 sex_level smallint, violence_level smallint, religion_level smallint, addictions_level smallint)
  language sql stable set search_path = '' as $$
  select m.id, m.classification, m.sex_level, m.violence_level, m.religion_level, m.addictions_level
    from public.media_items m
   where m.id <> p_exclude
     and m.classification in ('general', 'contains_women')
     and ((p_sha256 is not null and m.content_sha256 = p_sha256)
       or (p_dhash  is not null and m.content_dhash  = p_dhash))
   order by m.classified_at desc
   limit 1;
$$;

-- Pipeline-only: closed to every client role, like the rest of moderation.
revoke all on function
  moderation.complete_classification_job(uuid, public.media_classification, text, text, text, numeric, numeric, jsonb, moderation.review_reason, jsonb, text, text),
  moderation.find_resolved_by_hash(text, text, uuid)
  from public, anon, authenticated;
grant execute on function
  moderation.complete_classification_job(uuid, public.media_classification, text, text, text, numeric, numeric, jsonb, moderation.review_reason, jsonb, text, text),
  moderation.find_resolved_by_hash(text, text, uuid)
  to service_role;

-- --- visibility: the SQL mirror of viewerSatisfiesClassification ------------
-- Replaces classification_visible(cls, fs). Takes the row, because the decision
-- now needs four columns of it. Fail closed on every unresolved state (even
-- inside a Family Space) and on missing levels or missing settings; a Family
-- Space lifts sex only (invariant #6, content-categories.md §4). The old
-- functions are dropped at the end, once media_items_visible no longer uses them.

create function visibility.levels_visible(m public.media_items, is_within_family_space boolean)
  returns boolean language sql stable security definer set search_path = '' as $$
  select case
    -- NULL classification: a dangling avatar id (no row). Withheld, never guessed.
    when m.classification is null or m.classification in ('unclassified', 'pending_review') then false
    when m.sex_level is null or m.violence_level is null
      or m.religion_level is null or m.addictions_level is null then false
    else coalesce((
      select (is_within_family_space or m.sex_level <= fs.max_sex_level)
         and m.violence_level   <= fs.max_violence_level
         and m.religion_level   <= fs.max_religion_level
         and m.addictions_level <= fs.max_addictions_level
        from public.filter_settings fs
       where fs.user_id = auth.uid()
    ), false)
  end;
$$;

-- Whether the ORIGINAL media reference may be served. The uploader ALWAYS sees
-- their own content — mirror of canViewMedia's uploader short-circuit.
create function visibility.media_url_permitted(m public.media_items, is_within_family_space boolean, is_uploader boolean)
  returns boolean language sql stable set search_path = '' as $$
  select is_uploader or visibility.levels_visible(m, is_within_family_space);
$$;

revoke all on function
  visibility.levels_visible(public.media_items, boolean),
  visibility.media_url_permitted(public.media_items, boolean, boolean)
  from public, anon;
grant execute on function
  visibility.levels_visible(public.media_items, boolean),
  visibility.media_url_permitted(public.media_items, boolean, boolean)
  to authenticated, service_role;

-- Mirror of canViewProfilePhoto: owner always; otherwise the levels check, where
-- levels_visible's second argument means "skip the sex check".
-- avatar opt-out lifts the sex group only (Eli, 2026-11-02), mirror of canViewProfilePhoto
create or replace function visibility.avatar_permitted(avatar_media uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when avatar_media is null then true
    when (select mi.uploader_id from public.media_items mi where mi.id = avatar_media) = auth.uid() then true
    else visibility.levels_visible(
      (select mi from public.media_items mi where mi.id = avatar_media),
      not visibility.viewer_filters_avatars()
    )
  end;
$$;

-- media_items_visible: body of 20260922000007_region_blur.sql (the latest
-- definition) with the media_url_permitted call changed to pass the row, plus
-- the uploader's own levels appended (other viewers get NULLs — levels of
-- media you are filtered from are not yours to read).
--
-- The derivative only obscures women, so it is served only when the sex group
-- is the sole reason the original is withheld: levels_visible with the sex
-- check lifted must pass. A viewer withheld for violence/religion/addictions
-- gets nothing, never a women-blurred copy of the same image.
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
  redact.ok as is_redacted,
  case when m.uploader_id = auth.uid() then m.sex_level        end as sex_level,
  case when m.uploader_id = auth.uid() then m.violence_level   end as violence_level,
  case when m.uploader_id = auth.uid() then m.religion_level   end as religion_level,
  case when m.uploader_id = auth.uid() then m.addictions_level end as addictions_level
from public.media_items m
cross join lateral (
  select visibility.media_url_permitted(
    m,
    visibility.media_in_viewers_family_space(m),
    m.uploader_id = auth.uid()
  ) as url_ok
) perm
cross join lateral (
  select
    not perm.url_ok
    and m.classification = 'contains_women'
    and m.blurred_storage_path is not null
    and visibility.region_blur_enabled()
    and visibility.levels_visible(m, true) as ok
) redact;

grant select on media_items_visible to authenticated;

drop function visibility.media_url_permitted(public.media_classification, boolean, boolean);
drop function visibility.classification_visible(public.media_classification, boolean);

-- storage.objects media_objects_select (20260711000006) reads only
-- media_items_visible.storage_path, never media_url_permitted directly, so it
-- follows this view unchanged and needs no re-creation.
