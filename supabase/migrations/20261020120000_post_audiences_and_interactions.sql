-- ============================================================================
-- Phase 4 data tier, part 1 — audiences, drafts, interactions, RLS gap fixes
--
-- Spec: docs/plans/phase-4-feed.md §2a (multi-audience) and §3.
--
-- 1. posts.exposure_* is replaced by post_audiences (one or more rows per
--    post). A post is visible when the viewer satisfies ANY audience, there is
--    no block, and (for drafts) the viewer is the author.
-- 2. posts.status / published_at: a draft is author-only, which is what lets
--    classification run while the author is still composing.
-- 3. likes, saves, mutes, suggestion feedback: every row is private to its
--    owner (invariant #5: numbers without lists). Counts are served by the
--    SECURITY DEFINER functions in part 2.
-- 4. comments.reply_to_user_id + a trigger that keeps threads two levels deep.
-- 5. Fixes for two RLS gaps in 0003: posts_update_own let an author widen a
--    published post's audience or move it into a group they are not in.
--
-- Every audience rule lives in ONE SQL function (visibility.audience_set_valid)
-- mirroring ONE TS function (isAudienceSetValid in visibility-policy).
-- ============================================================================

-- --- enums -----------------------------------------------------------------
create type post_status as enum ('draft', 'published');
create type suggestion_feedback_kind as enum ('less_like_this', 'dont_suggest');

-- --- posts: draft state, quote ---------------------------------------------
alter table posts
  add column status post_status not null default 'published',
  add column published_at timestamptz,
  add column quoted_post_id uuid references posts (id) on delete set null;

update posts set published_at = created_at;

create index idx_posts_published_at on posts (published_at desc, id) where status = 'published';
create index idx_posts_drafts on posts (created_at) where status = 'draft';
create index idx_posts_quoted on posts (quoted_post_id) where quoted_post_id is not null;

-- --- post_audiences --------------------------------------------------------
create table post_audiences (
  post_id uuid not null references posts (id) on delete cascade,
  kind exposure_kind not null,
  group_id uuid references groups (id) on delete cascade,
  space_id uuid references family_spaces (id) on delete cascade,
  -- Pick order. The author's own source label uses the first audience they
  -- picked; kept as data so no client has to guess.
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint audience_target check (
    (kind = 'group') = (group_id is not null)
    and (kind = 'family_space') = (space_id is not null)
  )
);
create unique index uq_post_audience on post_audiences (
  post_id, kind, coalesce(group_id, space_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create index idx_post_audiences_group on post_audiences (group_id) where group_id is not null;
create index idx_post_audiences_space on post_audiences (space_id) where space_id is not null;

alter table post_audiences enable row level security;
grant select, insert, delete on post_audiences to authenticated;
grant select, insert, update, delete on post_audiences to service_role;

-- Carry the existing single-exposure rows across (hosted DB has none; the
-- PGlite seed does).
insert into post_audiences (post_id, kind, group_id, space_id)
select id, exposure_kind, exposure_group_id, exposure_space_id from posts;

-- The old single-exposure policies reference the columns about to go.
drop policy posts_select_exposure on posts;
drop policy posts_insert_own on posts;
drop policy posts_update_own on posts;
alter table posts drop constraint post_exposure_target;
alter table posts
  drop column exposure_kind,
  drop column exposure_group_id,
  drop column exposure_space_id;

-- --- comments: reply target ------------------------------------------------
alter table comments
  add column reply_to_user_id uuid references profiles (id) on delete set null;
create index idx_comments_parent on comments (parent_comment_id) where parent_comment_id is not null;

-- --- interaction tables ----------------------------------------------------
create table post_likes (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index idx_post_likes_user on post_likes (user_id);

create table comment_likes (
  comment_id uuid not null references comments (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index idx_comment_likes_user on comment_likes (user_id);

create table post_saves (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index idx_post_saves_user on post_saves (user_id, created_at desc);

create table user_mutes (
  muter_id uuid not null references profiles (id) on delete cascade,
  muted_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  constraint no_self_mute check (muter_id <> muted_id)
);

create table suggestion_feedback (
  viewer_id uuid not null references profiles (id) on delete cascade,
  target_user_id uuid not null references profiles (id) on delete cascade,
  kind suggestion_feedback_kind not null,
  created_at timestamptz not null default now(),
  primary key (viewer_id, target_user_id, kind),
  constraint no_self_feedback check (viewer_id <> target_user_id)
);

alter table post_likes          enable row level security;
alter table comment_likes       enable row level security;
alter table post_saves          enable row level security;
alter table user_mutes          enable row level security;
alter table suggestion_feedback enable row level security;

grant select, insert, delete on post_likes, comment_likes, post_saves, user_mutes, suggestion_feedback to authenticated;
grant select, insert, update, delete on post_likes, comment_likes, post_saves, user_mutes, suggestion_feedback to service_role;

-- --- SQL mirror of the new visibility-policy rules -------------------------
-- Caller-scoped helpers (SECURITY DEFINER, read only the caller's own rows).

create function visibility.viewer_muted(target uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_mutes m where m.muter_id = auth.uid() and m.muted_id = target
  );
$$;

create function visibility.viewer_suppressed(target uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.suggestion_feedback f
    where f.viewer_id = auth.uid() and f.target_user_id = target
  );
$$;

-- Fail closed when the settings row is absent.
create function visibility.viewer_shows_suggested()
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select fs.show_suggested_posts from public.filter_settings fs where fs.user_id = auth.uid()),
    false
  );
$$;

-- Mirror of viewerSatisfiesAudience, for ONE post_audiences row.
create function visibility.audience_satisfied(a public.post_audiences, p_author uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(case a.kind
    when 'public' then true
    when 'followers_only' then (auth.uid() = p_author or visibility.viewer_follows(p_author))
    when 'group' then visibility.viewer_in_group(a.group_id)
    when 'family_space' then visibility.viewer_in_family_space(a.space_id)
  end, false);
$$;

-- Mirror of canViewPost: drafts are author-only; otherwise ANY audience
-- satisfied and no block either way. SECURITY DEFINER so it can read audience
-- rows the caller may not otherwise enumerate; it returns only a boolean.
-- posts_select_exposure, post_stats and every other read path call THIS.
create function visibility.post_visible(p public.posts)
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    case
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

-- Mirror of canViewComment: the post is visible, and the author is neither
-- blocked nor muted.
create function visibility.comment_visible(c public.comments)
  returns boolean language sql stable security definer set search_path = '' as $$
  select not visibility.is_blocked_with(c.author_id)
     and not visibility.viewer_muted(c.author_id)
     and exists (
       select 1 from public.posts p where p.id = c.post_id and visibility.post_visible(p)
     );
$$;

-- THE audience-combination rule (mirror of isAudienceSetValid). Nothing else
-- may restate it: at least one audience; public is exclusive; a Family Space
-- never mixes with a non-Family-Space audience.
create function visibility.audience_set_valid(p_post uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select count(*) > 0
     and (count(*) filter (where a.kind = 'public') = 0 or count(*) = 1)
     and (count(*) filter (where a.kind = 'family_space') in (0, count(*)))
  from public.post_audiences a where a.post_id = p_post;
$$;

-- Mirror of canSharePostInternally (viewer = caller).
create function visibility.can_share_internally(p_post uuid, p_group uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p.status = 'published'
       and visibility.post_visible(p)
       and visibility.viewer_in_group(p_group)
       and not exists (select 1 from public.post_audiences a where a.post_id = p.id and a.kind = 'family_space')
       and (
         exists (select 1 from public.post_audiences a where a.post_id = p.id and a.kind = 'public')
         or exists (select 1 from public.post_audiences a where a.post_id = p.id and a.group_id = p_group)
         or not exists (
           select 1 from public.post_audiences a
           where a.post_id = p.id
             and not (a.kind = 'group' and exists (
               select 1 from public.groups g where g.id = a.group_id and g.visibility = 'public'
             ))
         )
       )
    from public.posts p where p.id = p_post
  ), false);
$$;

-- Mirror of canCopyExternalLink (viewer = caller).
create function visibility.can_copy_external_link(p_post uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p.status = 'published'
       and visibility.post_visible(p)
       and (select count(*) from public.post_audiences a where a.post_id = p.id) = 1
       and exists (select 1 from public.post_audiences a where a.post_id = p.id and a.kind = 'public')
    from public.posts p where p.id = p_post
  ), false);
$$;

-- Mirror of postFeedPlacement: 'followed' | 'suggested' | 'none'.
create function visibility.feed_placement(p public.posts)
  returns text language sql stable security definer set search_path = '' as $$
  select case
    when p.status <> 'published' or not visibility.post_visible(p) then 'none'
    when exists (select 1 from public.post_audiences a where a.post_id = p.id and a.kind = 'family_space') then 'none'
    when visibility.viewer_muted(p.author_id) then 'none'
    when p.author_id = auth.uid()
      or visibility.viewer_follows(p.author_id)
      or exists (
        select 1 from public.post_audiences a
        where a.post_id = p.id and a.kind = 'group' and visibility.viewer_in_group(a.group_id)
      ) then 'followed'
    when p.source_kind = 'profile'
      and exists (select 1 from public.post_audiences a where a.post_id = p.id and a.kind = 'public')
      and visibility.viewer_shows_suggested()
      and not visibility.viewer_suppressed(p.author_id) then 'suggested'
    else 'none'
  end;
$$;

-- Mirror of canSuggestUserToFollow (viewer = caller).
create function visibility.can_suggest_user(t public.profiles)
  returns boolean language sql stable security definer set search_path = '' as $$
  select t.id <> auth.uid()
     and not visibility.viewer_follows(t.id)
     and not visibility.is_blocked_with(t.id)
     and not visibility.viewer_muted(t.id)
     and not visibility.viewer_suppressed(t.id)
     and t.discoverable_in_search = 'everyone'
     -- canDiscoverUserInSearch
     and (
       not coalesce((select fs.gender_separation_in_search from public.filter_settings fs where fs.user_id = auth.uid()), false)
       or t.gender = (select me.gender from public.profiles me where me.id = auth.uid())
     );
$$;

-- Everything that must be true before a draft may become visible to anyone.
-- Returns a short reason, or NULL when publishable. One function so the
-- membership / consistency / quote rules cannot drift apart.
create function visibility.post_publish_problem(p public.posts)
  returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if not visibility.audience_set_valid(p.id) then
    return 'invalid audience set';
  end if;

  -- Re-check membership at publish time (the author may have left since
  -- picking the audience).
  if exists (
    select 1 from public.post_audiences a
    where a.post_id = p.id and a.kind = 'group'
      and not exists (select 1 from public.group_members m where m.group_id = a.group_id and m.user_id = p.author_id)
  ) or exists (
    select 1 from public.post_audiences a
    where a.post_id = p.id and a.kind = 'family_space'
      and not exists (select 1 from public.family_space_members m where m.space_id = a.space_id and m.user_id = p.author_id)
  ) then
    return 'author is not a member of every targeted group or space';
  end if;

  -- Source <-> audience consistency.
  if p.source_kind = 'group' then
    if p.source_group_id is null
       or (select count(*) from public.post_audiences a where a.post_id = p.id) <> 1
       or not exists (select 1 from public.post_audiences a where a.post_id = p.id and a.group_id = p.source_group_id) then
      return 'a group post must target exactly its own group';
    end if;
  elsif p.source_kind = 'family_space' then
    if p.source_space_id is null
       or (select count(*) from public.post_audiences a where a.post_id = p.id) <> 1
       or not exists (select 1 from public.post_audiences a where a.post_id = p.id and a.space_id = p.source_space_id) then
      return 'a family space post must target exactly its own space';
    end if;
  elsif p.source_group_id is not null or p.source_space_id is not null then
    return 'a profile post cannot name a source group or space';
  end if;

  -- A quote post is a share-to-group: exactly one group audience, and the
  -- share must be allowed (media is never copied; each viewer's filter still
  -- applies to the original).
  if p.quoted_post_id is not null then
    if (select count(*) from public.post_audiences a where a.post_id = p.id) <> 1
       or not exists (select 1 from public.post_audiences a where a.post_id = p.id and a.kind = 'group')
       or not visibility.can_share_internally(
            p.quoted_post_id,
            (select a.group_id from public.post_audiences a where a.post_id = p.id)
          ) then
      return 'quote posts may only be shared into one permitted group';
    end if;
  end if;

  return null;
end;
$$;

-- --- posts: write guards ---------------------------------------------------
-- SECURITY INVOKER on purpose: current_user must be the caller's role.
create function public.posts_guard()
  returns trigger language plpgsql set search_path = '' as $$
declare
  problem text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
    return new;
  end if;

  if old.status = 'published' then
    if new.status <> 'published' then
      raise exception 'a published post cannot return to draft';
    end if;
    -- Client roles may not move a published post. System FK actions (set null
    -- when a group or the quoted post is deleted) run as the table owner.
    if current_user in ('authenticated', 'anon') and (
         new.author_id <> old.author_id
      or new.source_kind <> old.source_kind
      or new.source_group_id is distinct from old.source_group_id
      or new.source_space_id is distinct from old.source_space_id
      or new.quoted_post_id is distinct from old.quoted_post_id
      or new.published_at is distinct from old.published_at
    ) then
      raise exception 'audience, source and quote of a published post are locked';
    end if;
  elsif new.status = 'published' then
    problem := visibility.post_publish_problem(new);
    if problem is not null then
      raise exception 'cannot publish: %', problem;
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger posts_guard
  before insert or update on posts
  for each row execute function public.posts_guard();

-- Audiences may change only while the post is a draft; every insert re-checks
-- the combination rule so a bad set fails at the point it is created.
create function public.post_audiences_guard()
  returns trigger language plpgsql set search_path = '' as $$
begin
  if not visibility.audience_set_valid(new.post_id) then
    raise exception 'invalid audience combination';
  end if;
  return null;
end;
$$;

create trigger post_audiences_guard
  after insert on post_audiences
  for each row execute function public.post_audiences_guard();

-- --- posts: policies -------------------------------------------------------
create policy posts_select_exposure on posts for select to authenticated
  using (visibility.post_visible(posts));

-- Clients always create a DRAFT (audiences are separate rows, added next);
-- publishing is the draft -> published update, validated by posts_guard.
create policy posts_insert_own on posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'draft'
    and (source_group_id is null or visibility.viewer_in_group(source_group_id))
    and (source_space_id is null or visibility.viewer_in_family_space(source_space_id))
    and (quoted_post_id is null or exists (select 1 from posts q where q.id = quoted_post_id))
  );

create policy posts_update_own on posts for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (source_group_id is null or visibility.viewer_in_group(source_group_id))
    and (source_space_id is null or visibility.viewer_in_family_space(source_space_id))
    and (quoted_post_id is null or exists (select 1 from posts q where q.id = quoted_post_id))
  );

-- --- post_audiences policies -----------------------------------------------
-- A viewer sees the audiences of a visible post that THEY satisfy (so a
-- private group's id is never leaked to someone outside it); the author sees
-- all of theirs.
create policy post_audiences_select on post_audiences for select to authenticated
  using (exists (
    select 1 from posts p
    where p.id = post_audiences.post_id
      and (p.author_id = auth.uid() or visibility.audience_satisfied(post_audiences, p.author_id))
  ));
create policy post_audiences_insert_own_draft on post_audiences for insert to authenticated
  with check (
    exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid() and p.status = 'draft')
    and (kind <> 'group' or visibility.viewer_in_group(group_id))
    and (kind <> 'family_space' or visibility.viewer_in_family_space(space_id))
  );
create policy post_audiences_delete_own_draft on post_audiences for delete to authenticated
  using (exists (
    select 1 from posts p where p.id = post_id and p.author_id = auth.uid() and p.status = 'draft'
  ));

-- --- comments: policies + reply normalisation ------------------------------
drop policy comments_select_via_post on comments;
drop policy comments_insert_own on comments;

create policy comments_select_via_post on comments for select to authenticated
  using (visibility.comment_visible(comments));
-- Comments need a visible, PUBLISHED post (a draft has no audience yet).
create policy comments_insert_own on comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from posts p where p.id = post_id and p.status = 'published')
  );

-- Two levels, no third (03 §3.1): the parent must be on the same post and
-- visible to the replier; a reply to a reply lands on the level-1 root with
-- reply_to_user_id naming whom it answers. reply_to_user_id is always derived
-- here, never taken from the client. SECURITY INVOKER: the parent lookup runs
-- under the replier's RLS, so a hidden parent is "not found".
create function public.comments_normalize_reply()
  returns trigger language plpgsql set search_path = '' as $$
declare
  parent public.comments;
begin
  if new.parent_comment_id is null then
    new.reply_to_user_id := null;
    return new;
  end if;
  select * into parent from public.comments where id = new.parent_comment_id;
  if not found then
    raise exception 'parent comment not found';
  end if;
  if parent.post_id <> new.post_id then
    raise exception 'parent comment belongs to a different post';
  end if;
  if parent.parent_comment_id is not null then
    new.parent_comment_id := parent.parent_comment_id;
    new.reply_to_user_id := parent.author_id;
  else
    new.reply_to_user_id := null;
  end if;
  return new;
end;
$$;

create trigger comments_normalize_reply
  before insert on comments
  for each row execute function public.comments_normalize_reply();

-- --- interaction policies --------------------------------------------------
create policy post_likes_select_own on post_likes for select to authenticated
  using (user_id = auth.uid());
create policy post_likes_insert_own on post_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from posts p where p.id = post_id and p.status = 'published')
  );
create policy post_likes_delete_own on post_likes for delete to authenticated
  using (user_id = auth.uid());

create policy comment_likes_select_own on comment_likes for select to authenticated
  using (user_id = auth.uid());
create policy comment_likes_insert_own on comment_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from comments c join posts p on p.id = c.post_id
      where c.id = comment_id and p.status = 'published'
    )
  );
create policy comment_likes_delete_own on comment_likes for delete to authenticated
  using (user_id = auth.uid());

create policy post_saves_select_own on post_saves for select to authenticated
  using (user_id = auth.uid());
create policy post_saves_insert_own on post_saves for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from posts p where p.id = post_id and p.status = 'published')
  );
create policy post_saves_delete_own on post_saves for delete to authenticated
  using (user_id = auth.uid());

create policy user_mutes_select_own on user_mutes for select to authenticated
  using (muter_id = auth.uid());
create policy user_mutes_insert_own on user_mutes for insert to authenticated
  with check (muter_id = auth.uid());
create policy user_mutes_delete_own on user_mutes for delete to authenticated
  using (muter_id = auth.uid());

create policy suggestion_feedback_select_own on suggestion_feedback for select to authenticated
  using (viewer_id = auth.uid());
create policy suggestion_feedback_insert_own on suggestion_feedback for insert to authenticated
  with check (viewer_id = auth.uid());
create policy suggestion_feedback_delete_own on suggestion_feedback for delete to authenticated
  using (viewer_id = auth.uid());

-- --- the Family Space carve-out, now over audiences ------------------------
-- Safe only because a Family Space never mixes with another audience kind
-- (audience_set_valid): lifting classification for "any family space audience
-- the viewer is in" can never expose a non-family audience's media.
create or replace function visibility.media_in_viewers_family_space(m public.media_items)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.post_audiences a
    where a.kind = 'family_space'
      and visibility.viewer_in_family_space(a.space_id)
      and (
        a.post_id = m.post_id
        or a.post_id = (select c.post_id from public.comments c where c.id = m.comment_id)
      )
  );
$$;

-- --- abandoned drafts ------------------------------------------------------
-- Classify-while-composing leaves author-only drafts behind when a user walks
-- away. Unscheduled (like the score sweep): something calls it. Media rows go
-- with the draft (cascade); the storage objects are the caller's to sweep.
create function public.purge_abandoned_drafts(p_older_than interval default interval '24 hours')
  returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  with gone as (
    delete from public.posts
    where status = 'draft' and created_at < now() - p_older_than
    returning 1
  )
  select count(*)::int into n from gone;
  return n;
end;
$$;

revoke all on function public.purge_abandoned_drafts(interval) from public, anon, authenticated;
grant execute on function public.purge_abandoned_drafts(interval) to service_role;
