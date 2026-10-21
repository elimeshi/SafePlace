-- Visibility audit fixes (2026-10-21). Safe on existing rows: only new inserts are
-- checked; the unique index would fail loudly on pre-existing
-- duplicate paths (none on the hosted DB, which holds no users yet).

-- 1. media_items.storage_path ownership --------------------------------------
-- A client may only point a row at an object under its own uploader prefix
-- (api-client uploadMedia builds `${uploaderId}/${key}`), so it can neither
-- claim a victim's object (orphan-queue deletion, signed-URL minting through
-- the storage select policy) nor collide with one. service_role (the pipeline,
-- which sets blurred_storage_path) is exempt, like posts_guard.
drop policy media_insert_own_unclassified on public.media_items;
create policy media_insert_own_unclassified on public.media_items for insert to authenticated
  with check (
    uploader_id = auth.uid()
    and classification = 'unclassified'
    and left(storage_path, length(auth.uid()::text) + 1) = auth.uid()::text || '/'
    and (blurred_storage_path is null
         or left(blurred_storage_path, length(auth.uid()::text) + 1) = auth.uid()::text || '/')
    and (
      (post_id is not null and exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()))
      or (comment_id is not null and exists (select 1 from comments c where c.id = comment_id and c.author_id = auth.uid()))
      or (profile_id is not null and profile_id = auth.uid())
      or (message_id is not null and exists (select 1 from messages m where m.id = message_id and m.sender_id = auth.uid()))
    )
  );

create unique index media_items_storage_path_key on public.media_items (storage_path);

-- Never queue an object another row still references.
create or replace function moderation.queue_orphaned_objects() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into moderation.orphaned_objects (storage_path)
  select p from unnest(array[old.storage_path, old.blurred_storage_path]) as p
  where p is not null
    and not exists (
      select 1 from public.media_items m
      where m.id <> old.id and (m.storage_path = p or m.blurred_storage_path = p)
    )
  on conflict do nothing;
  return old;
end;
$$;

-- 2. own recent published posts, feed-eligible only ---------------------------
-- The feed's "just published" pin. Same row shape as feed_page; placement is
-- decided by visibility.feed_placement so a Family Space post never pins.
create function public.own_recent_posts(p_since timestamptz, p_limit integer default 5)
  returns table (
    id uuid, author_id uuid, text text, source_kind public.post_source_kind,
    source_group_id uuid, source_space_id uuid, location_tag text, quoted_post_id uuid,
    created_at timestamptz, published_at timestamptz, placement text, sort_key text,
    audiences jsonb, media jsonb
  ) language sql stable security invoker set search_path = '' as $$
  with mine as (
    select p.*, visibility.feed_placement(p) as placement
    from public.posts p
    where p.author_id = auth.uid() and p.status = 'published' and p.published_at >= p_since
  )
  select
    r.id, r.author_id, r.text, r.source_kind, r.source_group_id, r.source_space_id,
    r.location_tag, r.quoted_post_id, r.created_at, r.published_at, r.placement, ''::text,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('kind', a.kind, 'group_id', a.group_id, 'space_id', a.space_id)
        order by a.position, a.created_at
      )
      from public.post_audiences a where a.post_id = r.id
    ), '[]'::jsonb),
    public.post_media_json(r.id)
  from mine r
  where r.placement <> 'none'
  order by r.published_at desc, r.id
  limit least(coalesce(p_limit, 5), 20);
$$;

-- 3. default PUBLIC execute: close it on every Phase 4 function ----------------
revoke all on function
  public.post_stats(uuid[]),
  public.comment_stats(uuid[]),
  public.post_media_json(uuid),
  public.feed_page(text, integer, text, uuid, integer),
  public.spaces_rail(text, integer),
  public.follow_suggestions(text, integer),
  public.own_recent_posts(timestamptz, integer),
  public.posts_guard(),
  public.post_audiences_guard(),
  public.comments_normalize_reply(),
  visibility.viewer_muted(uuid),
  visibility.viewer_suppressed(uuid),
  visibility.viewer_shows_suggested(),
  visibility.audience_satisfied(public.post_audiences, uuid),
  visibility.post_visible(public.posts),
  visibility.comment_visible(public.comments),
  visibility.audience_set_valid(uuid),
  visibility.can_share_internally(uuid, uuid),
  visibility.can_copy_external_link(uuid),
  visibility.feed_placement(public.posts),
  visibility.can_suggest_user(public.profiles),
  visibility.post_publish_problem(public.posts),
  visibility.media_in_viewers_family_space(public.media_items)
  from public, anon;
grant execute on function
  public.post_stats(uuid[]),
  public.comment_stats(uuid[]),
  public.post_media_json(uuid),
  public.feed_page(text, integer, text, uuid, integer),
  public.spaces_rail(text, integer),
  public.follow_suggestions(text, integer),
  public.own_recent_posts(timestamptz, integer),
  visibility.viewer_muted(uuid),
  visibility.viewer_suppressed(uuid),
  visibility.viewer_shows_suggested(),
  visibility.audience_satisfied(public.post_audiences, uuid),
  visibility.post_visible(public.posts),
  visibility.comment_visible(public.comments),
  visibility.audience_set_valid(uuid),
  visibility.can_share_internally(uuid, uuid),
  visibility.can_copy_external_link(uuid),
  visibility.feed_placement(public.posts),
  visibility.can_suggest_user(public.profiles),
  visibility.post_publish_problem(public.posts),
  visibility.media_in_viewers_family_space(public.media_items)
  to authenticated, service_role;

-- 4. posts_guard: published_at is server-set at the publish transition ---------
create or replace function public.posts_guard()
  returns trigger language plpgsql set search_path = '' as $$
declare
  problem text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      new.published_at := now();
    end if;
    return new;
  end if;

  if old.status = 'published' then
    if new.status <> 'published' then
      raise exception 'a published post cannot return to draft';
    end if;
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
    new.published_at := now();
  end if;
  return new;
end;
$$;
