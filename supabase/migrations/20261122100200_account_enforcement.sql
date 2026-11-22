-- ============================================================================
-- Phase 8a — suspension and ban enforcement, removed content
--
-- Spec: docs/plans/phase-8-admin-portal.md §2 forks 16 and 22, §4.4, §10 q5;
-- ADR 0023. SQL mirror of accountWriteAllowed, canViewPost, canViewComment,
-- canViewMedia and canViewProfilePhoto in packages/visibility-policy.
--
-- WRITE SIDE. A suspension is derived from profiles.suspended_until against the
-- clock (no sweep). visibility.account_write_allowed(action) is the one SQL
-- statement of the rule; every guard below calls it. The guards are RESTRICTIVE
-- policies, ANDed with the existing permissive ones, so no existing policy is
-- rewritten. Table → WriteAction (insert / update; delete is always
-- 'interaction', so only a ban stops it — a suspended user may still delete
-- their own content):
--   posts, comments                                 → post / comment on insert AND update
--   post_audiences, polls, poll_options, post_tags  → post on insert (composing a post)
--   messages, conversations                         → message on insert
--   message_requests                                → message_request on insert
--   media_items, storage.objects                    → media_upload on insert
--   reports                                         → report
--   profiles                                        → interaction; the profile_edit
--     columns (display_name, bio, avatar_media_id) are checked by a trigger,
--     since RLS cannot see which columns changed
--   follows, blocks, post_likes, comment_likes, post_saves, user_mutes,
--   suggestion_feedback, filter_settings, group_members, family_space_members,
--   groups, family_spaces                           → interaction
-- Every other (table, command) uses 'interaction': only a ban stops it. A
-- suspended user may join groups and accept Family Space invites (§10 q5); by
-- the same mapping they may also create a group or a Family Space, which the
-- plan does not list as blocked.
-- Staff and anon have no profile, so account_write_allowed is false for them:
-- staff never write app tables directly.
--
-- Penalty state and removal are server-set: a client may never change
-- profiles.account_status / suspended_until, or any removed_at (triggers below;
-- current_user is the caller's role only outside SECURITY DEFINER code, the
-- posts_guard convention).
--
-- READ SIDE. A removed post or comment, and everything a banned author wrote,
-- is hidden from everyone, the author included. A banned profile is hidden from
-- everyone, its owner included (they read their state through an RPC, 8a later).
-- Removed media is never served, not even to the uploader; the row stays
-- readable to the uploader so the app can show "the media was removed".
-- moderation.find_resolved_by_hash already matches only general/contains_women
-- sources, so a removed copy never lends its verdict; it is not re-created.
-- ============================================================================

-- --- columns -----------------------------------------------------------------
alter table public.profiles add column suspended_until timestamptz;
alter table public.posts    add column removed_at timestamptz;
alter table public.comments add column removed_at timestamptz;
alter table public.messages add column removed_at timestamptz;

-- --- the rule ------------------------------------------------------------------
-- Mirror of accountWriteAllowed. No profile row (staff, anon) → false.
create function visibility.account_write_allowed(action text)
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when p.account_status = 'banned' then action = 'appeal'
      when p.suspended_until > now() then action not in
        ('post', 'comment', 'message', 'message_request', 'profile_edit', 'media_upload')
      else true
    end
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

create function visibility.is_banned(target uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = target and p.account_status = 'banned');
$$;

-- --- restrictive write guards -------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('posts', 'post', 'post'),
      ('comments', 'comment', 'comment'),
      ('post_audiences', 'post', 'interaction'),
      ('polls', 'post', 'interaction'),
      ('poll_options', 'post', 'interaction'),
      ('post_tags', 'post', 'interaction'),
      ('messages', 'message', 'interaction'),
      ('conversations', 'message', 'interaction'),
      ('message_requests', 'message_request', 'interaction'),
      ('media_items', 'media_upload', 'interaction'),
      ('reports', 'report', 'report'),
      ('profiles', 'interaction', 'interaction'),
      ('filter_settings', 'interaction', 'interaction'),
      ('follows', 'interaction', 'interaction'),
      ('blocks', 'interaction', 'interaction'),
      ('post_likes', 'interaction', 'interaction'),
      ('comment_likes', 'interaction', 'interaction'),
      ('post_saves', 'interaction', 'interaction'),
      ('user_mutes', 'interaction', 'interaction'),
      ('suggestion_feedback', 'interaction', 'interaction'),
      ('group_members', 'interaction', 'interaction'),
      ('family_space_members', 'interaction', 'interaction'),
      ('groups', 'interaction', 'interaction'),
      ('family_spaces', 'interaction', 'interaction')
    ) as m(tbl, on_insert, on_update)
  loop
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (visibility.account_write_allowed(%L))',
      t.tbl || '_account_insert', t.tbl, t.on_insert);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (visibility.account_write_allowed(%L))',
      t.tbl || '_account_update', t.tbl, t.on_update);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (visibility.account_write_allowed(''interaction''))',
      t.tbl || '_account_delete', t.tbl);
  end loop;
end;
$$;

create policy media_objects_account_insert on storage.objects as restrictive for insert to authenticated
  with check (visibility.account_write_allowed('media_upload'));

-- --- profiles: column guard -----------------------------------------------------
create function public.profiles_account_guard()
  returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.account_status is distinct from old.account_status
    or new.suspended_until is distinct from old.suspended_until
  ) then
    raise exception 'account state is not client-writable' using errcode = '42501';
  end if;
  if auth.uid() is not null
     and (new.display_name, new.bio, new.avatar_media_id)
         is distinct from (old.display_name, old.bio, old.avatar_media_id)
     and not visibility.account_write_allowed('profile_edit') then
    raise exception 'account restricted: profile_edit' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_account_guard
  before update on public.profiles
  for each row execute function public.profiles_account_guard();

-- --- removed_at is staff-set only -----------------------------------------------
create function public.removed_at_guard()
  returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.removed_at is not null then
        raise exception 'removed_at is not client-writable' using errcode = '42501';
      end if;
    elsif new.removed_at is distinct from old.removed_at then
      raise exception 'removed_at is not client-writable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_removed_at_guard before insert or update on public.posts
  for each row execute function public.removed_at_guard();
create trigger comments_removed_at_guard before insert or update on public.comments
  for each row execute function public.removed_at_guard();
create trigger messages_removed_at_guard before insert or update on public.messages
  for each row execute function public.removed_at_guard();

-- --- read side: posts and comments ----------------------------------------------
-- Body of 20261020120000_post_audiences_and_interactions.sql (the latest
-- definition) plus the removed / banned-author check, which applies to the
-- author too. create or replace keeps the grants of 20261021100000_audit_fixes.sql.
create or replace function visibility.post_visible(p public.posts)
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    p.removed_at is null
    and not visibility.is_banned(p.author_id)
    and case
      when p.status = 'draft' then p.author_id = auth.uid()
      else not visibility.is_blocked_with(p.author_id)
        and exists (
          select 1 from public.post_audiences a
          where a.post_id = p.id and visibility.audience_satisfied(a, p.author_id)
        )
    end,
    false
  );
$$;

create or replace function visibility.comment_visible(c public.comments)
  returns boolean language sql stable security definer set search_path = '' as $$
  select c.removed_at is null
     and not visibility.is_banned(c.author_id)
     and not visibility.is_blocked_with(c.author_id)
     and not visibility.viewer_muted(c.author_id)
     and exists (
       select 1 from public.posts p where p.id = c.post_id and visibility.post_visible(p)
     );
$$;

-- --- read side: profiles ----------------------------------------------------------
-- 20260711000003_rls_policies.sql body, plus: a banned profile is hidden from
-- everyone, its owner included. 'deleted' behaves as before.
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    account_status <> 'banned'
    and (
      id = auth.uid()
      or (account_status <> 'deleted' and not visibility.is_blocked_with(id))
    )
  );

-- --- read side: media -----------------------------------------------------------
-- Bodies of 20261030100100_content_levels.sql (the latest definitions) plus
-- 'removed'. media_items_visible calls media_url_permitted and levels_visible
-- by name, and storage's media_objects_select reads the view, so both follow
-- these replacements without being re-created.
create or replace function visibility.levels_visible(m public.media_items, is_within_family_space boolean)
  returns boolean language sql stable security definer set search_path = '' as $$
  select case
    -- NULL classification: a dangling avatar id (no row). Withheld, never guessed.
    -- 'removed': prohibited content; no setting or space reaches it.
    when m.classification is null or m.classification in ('unclassified', 'pending_review', 'removed') then false
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

-- The uploader always sees their own content, except removed media
-- (mirror of canViewMedia's uploader short-circuit).
create or replace function visibility.media_url_permitted(m public.media_items, is_within_family_space boolean, is_uploader boolean)
  returns boolean language sql stable set search_path = '' as $$
  select (is_uploader and m.classification <> 'removed') or visibility.levels_visible(m, is_within_family_space);
$$;

-- Mirror of canViewProfilePhoto: a banned owner → false for everyone; the owner
-- sees their own photo unless removed; otherwise the levels check, where
-- levels_visible's second argument means "skip the sex check".
create or replace function visibility.avatar_permitted(avatar_media uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when avatar_media is null then true
    when visibility.is_banned((select mi.uploader_id from public.media_items mi where mi.id = avatar_media)) then false
    when (select mi.uploader_id from public.media_items mi where mi.id = avatar_media) = auth.uid()
      then (select mi.classification from public.media_items mi where mi.id = avatar_media) <> 'removed'
    else visibility.levels_visible(
      (select mi from public.media_items mi where mi.id = avatar_media),
      not visibility.viewer_filters_avatars()
    )
  end;
$$;

-- 20261030100100_content_levels.sql constraint, plus: a removed row may keep the
-- levels it had (removed after classification) or have none (removed from the
-- queue), but never a partial set.
alter table public.media_items drop constraint media_levels_match_lifecycle;
alter table public.media_items add constraint media_levels_match_lifecycle check (
  case
    when classification = 'removed'
      then num_nonnulls(sex_level, violence_level, religion_level, addictions_level) in (0, 4)
    else (classification in ('general', 'contains_women'))
       = (sex_level is not null and violence_level is not null
          and religion_level is not null and addictions_level is not null)
  end
  and (classification <> 'contains_women' or sex_level >= 1)
  and (classification <> 'general' or sex_level = 0)
);

-- --- grants -----------------------------------------------------------------------
revoke all on function
  visibility.account_write_allowed(text),
  visibility.is_banned(uuid),
  public.profiles_account_guard(),
  public.removed_at_guard()
  from public, anon;
grant execute on function
  visibility.account_write_allowed(text),
  visibility.is_banned(uuid)
  to authenticated, service_role;
