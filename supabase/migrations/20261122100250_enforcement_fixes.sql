-- ============================================================================
-- Phase 8a — enforcement follow-ups
--
-- 1. Removed media rows are hidden from everyone but the uploader, exactly as
--    pending_review rows are (plan §2 fork 22). Without this a removed item
--    looked like filtered media, which suggests a setting could reveal it. The
--    uploader keeps the row (storage_path NULL via media_items_visible) for the
--    "the media was removed" placeholder. Mirror of isMediaRowVisible.
-- 2. profiles_account_guard binds client roles only (current_user is
--    authenticated/anon), as the account-state and removed_at locks already
--    do, so console SECURITY DEFINER RPCs may edit a profile.
-- 3. moderation_actions deciders: ON DELETE RESTRICT. Staff are deactivated,
--    never deleted, and their decisions (strikes, appeals) must survive.
-- 4. Counts exclude banned users while the ban stands: their follow edges,
--    memberships and likes stop counting (a banned profile is hidden from
--    everyone, so counting it would count a ghost). Comment counts already go
--    through comment_visible, which excludes banned authors.
-- ============================================================================

-- --- 1. media_items row visibility ------------------------------------------
-- 20260711000003_rls_policies.sql body (the only definition) plus 'removed'.
drop policy media_select on public.media_items;
create policy media_select on public.media_items for select to authenticated
  using (
    not visibility.is_blocked_with(uploader_id)
    and (classification not in ('pending_review', 'removed') or uploader_id = auth.uid())
    and (
      uploader_id = auth.uid()
      or (post_id is not null and exists (select 1 from public.posts p where p.id = post_id))
      or (comment_id is not null and exists (select 1 from public.comments c where c.id = comment_id))
      or (profile_id is not null and exists (select 1 from public.profiles pr where pr.id = profile_id))
      or (message_id is not null and exists (select 1 from public.messages m where m.id = message_id))
    )
  );

-- --- 2. profile column guard: client roles only -------------------------------
create or replace function public.profiles_account_guard()
  returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;  -- service_role, or SECURITY DEFINER code (console RPCs)
  end if;
  if new.account_status is distinct from old.account_status
     or new.suspended_until is distinct from old.suspended_until then
    raise exception 'account state is not client-writable' using errcode = '42501';
  end if;
  if (new.display_name, new.bio, new.avatar_media_id)
       is distinct from (old.display_name, old.bio, old.avatar_media_id)
     and not visibility.account_write_allowed('profile_edit') then
    raise exception 'account restricted: profile_edit' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- --- 3. decider FKs ------------------------------------------------------------
alter table public.moderation_actions
  drop constraint moderation_actions_decided_by_moderator_id_fkey,
  drop constraint moderation_actions_appeal_decided_by_moderator_id_fkey,
  add constraint moderation_actions_decided_by_moderator_id_fkey
    foreign key (decided_by_moderator_id) references auth.users (id) on delete restrict,
  add constraint moderation_actions_appeal_decided_by_moderator_id_fkey
    foreign key (appeal_decided_by_moderator_id) references auth.users (id) on delete restrict;

-- --- 4. counts without banned users -----------------------------------------------
-- Bodies of 20260711000004_visibility_views.sql, 20261020130000 and
-- 20261020120100_feed_read_paths.sql (the only definitions) plus the ban
-- filter. create or replace keeps their grants.
create or replace function public.follower_count(target uuid)
  returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.follows f
   where f.followed_id = target and not visibility.is_banned(f.follower_id);
$$;

create or replace function public.following_count(target uuid)
  returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.follows f
   where f.follower_id = target and not visibility.is_banned(f.followed_id);
$$;

create or replace function public.group_member_count(target uuid)
  returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.group_members m
   where m.group_id = target and not visibility.is_banned(m.user_id);
$$;

create or replace function public.family_space_member_count(target uuid)
  returns integer language sql stable security definer set search_path = '' as $$
  select case
    when visibility.viewer_in_family_space(target)
      then (select count(*)::int from public.family_space_members m
             where m.space_id = target and not visibility.is_banned(m.user_id))
  end;
$$;

create or replace function public.post_stats(p_post_ids uuid[])
  returns table (
    post_id uuid,
    like_count integer,
    comment_count integer,
    viewer_liked boolean,
    viewer_saved boolean
  )
  language sql stable security definer set search_path = '' as $$
  select
    p.id,
    (select count(*)::int from public.post_likes l
       where l.post_id = p.id and not visibility.is_banned(l.user_id)),
    (select count(*)::int from public.comments c
       where c.post_id = p.id and visibility.comment_visible(c)),
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
    exists (select 1 from public.post_saves s where s.post_id = p.id and s.user_id = auth.uid())
  from public.posts p
  where p.id = any (p_post_ids[1:100])
    and p.status = 'published'
    and visibility.post_visible(p);
$$;

create or replace function public.comment_stats(p_comment_ids uuid[])
  returns table (comment_id uuid, like_count integer, viewer_liked boolean)
  language sql stable security definer set search_path = '' as $$
  select
    c.id,
    (select count(*)::int from public.comment_likes l
       where l.comment_id = c.id and not visibility.is_banned(l.user_id)),
    exists (select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = auth.uid())
  from public.comments c
  where c.id = any (p_comment_ids[1:100])
    and visibility.comment_visible(c);
$$;
