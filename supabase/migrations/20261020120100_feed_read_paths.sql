-- ============================================================================
-- Phase 4 data tier, part 2 — read paths
--
--  * post_stats / comment_stats: counts WITHOUT lists (invariant #5). SECURITY
--    DEFINER because likes are private rows; every id is filtered through
--    visibility.post_visible / comment_visible first, so a count is never
--    served for something the caller cannot see.
--  * feed_page: THE ranking seam. Today's order is random, seeded once per feed
--    visit so pages are stable (keyset on md5(seed || id), id). The ranking
--    session replaces this ONE function; the client contract stays. SECURITY
--    INVOKER, so RLS decides which posts exist for the caller and media comes
--    through media_items_visible (a filtered viewer gets storage_path NULL and
--    is_filtered true, never a path).
--  * spaces_rail, follow_suggestions: random, same seam rule.
--
-- No weights, no signals beyond explicit ones, no time-on-post.
-- ============================================================================

-- --- counts ----------------------------------------------------------------
create function public.post_stats(p_post_ids uuid[])
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
    (select count(*)::int from public.post_likes l where l.post_id = p.id),
    (select count(*)::int from public.comments c
       where c.post_id = p.id and visibility.comment_visible(c)),
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
    exists (select 1 from public.post_saves s where s.post_id = p.id and s.user_id = auth.uid())
  from public.posts p
  where p.id = any (p_post_ids[1:100])
    and p.status = 'published'
    and visibility.post_visible(p);
$$;

create function public.comment_stats(p_comment_ids uuid[])
  returns table (comment_id uuid, like_count integer, viewer_liked boolean)
  language sql stable security definer set search_path = '' as $$
  select
    c.id,
    (select count(*)::int from public.comment_likes l where l.comment_id = c.id),
    exists (select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = auth.uid())
  from public.comments c
  where c.id = any (p_comment_ids[1:100])
    and visibility.comment_visible(c);
$$;

grant execute on function
  public.post_stats(uuid[]),
  public.comment_stats(uuid[])
  to authenticated;

-- --- shared media shape ----------------------------------------------------
-- Always read through media_items_visible (invoker): the only place a media
-- reference is decided.
create function public.post_media_json(p_post uuid)
  returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'classification', m.classification,
      'storage_path', m.storage_path,
      'is_filtered', m.is_filtered,
      'is_redacted', m.is_redacted
    ) order by m.created_at, m.id
  ), '[]'::jsonb)
  from public.media_items_visible m
  where m.post_id = p_post;
$$;

-- --- the feed (ranking seam) -----------------------------------------------
-- p_seed:           drawn once per feed visit; pull-to-refresh draws a new one.
-- p_after_key/_id:  the sort_key and id of the last row of the previous page.
-- p_suggested_percent: share of suggested candidates admitted (the "at most 1
--   in 5" cap, as an inclusion rate while ordering is random).
-- audiences:        only the audiences the caller satisfies (the author sees
--   all of theirs), in pick order — enough for the source label, without
--   naming a private group the viewer is not in.
create function public.feed_page(
  p_seed text,
  p_limit integer default 20,
  p_after_key text default null,
  p_after_id uuid default null,
  p_suggested_percent integer default 20
) returns table (
  id uuid,
  author_id uuid,
  text text,
  source_kind public.post_source_kind,
  source_group_id uuid,
  source_space_id uuid,
  location_tag text,
  quoted_post_id uuid,
  created_at timestamptz,
  published_at timestamptz,
  placement text,
  sort_key text,
  audiences jsonb,
  media jsonb
) language sql stable security invoker set search_path = '' as $$
  with ranked as (
    select p.*, visibility.feed_placement(p) as placement, md5(p_seed || p.id::text) as sort_key
    from public.posts p
    where p.status = 'published'
  )
  select
    r.id, r.author_id, r.text, r.source_kind, r.source_group_id, r.source_space_id,
    r.location_tag, r.quoted_post_id, r.created_at, r.published_at, r.placement, r.sort_key,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('kind', a.kind, 'group_id', a.group_id, 'space_id', a.space_id)
        order by a.position, a.created_at
      )
      from public.post_audiences a where a.post_id = r.id
    ), '[]'::jsonb),
    public.post_media_json(r.id)
  from ranked r
  where r.placement <> 'none'
    and (
      r.placement = 'followed'
      or get_byte(decode(substr(r.sort_key, 1, 2), 'hex'), 0) < (p_suggested_percent * 256 / 100)
    )
    and (p_after_key is null or (r.sort_key, r.id) > (p_after_key, p_after_id))
  order by r.sort_key, r.id
  limit least(coalesce(p_limit, 20), 50);
$$;

-- --- spaces rail -----------------------------------------------------------
-- One card per group / Family Space the caller belongs to, with the latest
-- post as a preview. The Family Space carve-out applies to the preview's media
-- because it is read through media_items_visible; Family Space posts are
-- otherwise absent from every other feed surface.
create function public.spaces_rail(p_seed text, p_limit integer default 20)
  returns table (
    space_kind text,
    space_id uuid,
    name text,
    color text,
    icon text,
    latest_post_id uuid,
    latest_text text,
    latest_author_id uuid,
    latest_published_at timestamptz,
    latest_media jsonb,
    sort_key text
  ) language sql stable security invoker set search_path = '' as $$
  with spaces as (
    select 'group'::text as kind, g.id as sid, g.name, g.color, g.icon
    from public.groups g where visibility.viewer_in_group(g.id)
    union all
    select 'family_space'::text, f.id, f.name, null::text, 'family'::text
    from public.family_spaces f where visibility.viewer_in_family_space(f.id)
  )
  select
    s.kind, s.sid, s.name, s.color, s.icon,
    lp.id, lp.text, lp.author_id, lp.published_at,
    case when lp.id is null then null else public.post_media_json(lp.id) end,
    md5(p_seed || s.sid::text)
  from spaces s
  left join lateral (
    select p.id, p.text, p.author_id, p.published_at
    from public.posts p
    join public.post_audiences a on a.post_id = p.id
    where p.status = 'published'
      and (a.group_id = s.sid or a.space_id = s.sid)
      and not visibility.viewer_muted(p.author_id)
    order by p.published_at desc, p.id
    limit 1
  ) lp on true
  order by md5(p_seed || s.sid::text), s.sid
  limit least(coalesce(p_limit, 20), 50);
$$;

-- --- follow suggestions ----------------------------------------------------
-- Candidates: authors whose posts the caller liked or commented on, plus
-- active public posters. Never drawn from the follow graph or group
-- co-membership (the "why" text would leak edges). SECURITY INVOKER: the
-- caller's own likes/comments/profile reads are all RLS-visible to them.
create function public.follow_suggestions(p_seed text, p_limit integer default 10)
  returns table (
    user_id uuid,
    display_name text,
    avatar_media_id uuid,
    reason text,
    sort_key text
  ) language sql stable security invoker set search_path = '' as $$
  with candidates as (
    select p.author_id as uid, true as engaged
    from public.post_likes l join public.posts p on p.id = l.post_id
    where l.user_id = auth.uid()
    union all
    select p.author_id, true
    from public.comments c join public.posts p on p.id = c.post_id
    where c.author_id = auth.uid()
    union all
    select p.author_id, false
    from public.posts p
    where p.status = 'published'
      and p.source_kind = 'profile'
      and p.published_at > now() - interval '30 days'
      and exists (select 1 from public.post_audiences a where a.post_id = p.id and a.kind = 'public')
  ), per_user as (
    select uid, bool_or(engaged) as engaged from candidates group by uid
  )
  select
    pr.id,
    pv.display_name,
    pv.avatar_media_id,
    case when u.engaged then 'engaged' else 'active_poster' end,
    md5(p_seed || pr.id::text)
  from per_user u
  join public.profiles pr on pr.id = u.uid
  join public.profiles_visible pv on pv.id = pr.id
  where visibility.can_suggest_user(pr)
    and pr.account_status = 'active'
  order by md5(p_seed || pr.id::text), pr.id
  limit least(coalesce(p_limit, 10), 30);
$$;

grant execute on function
  public.post_media_json(uuid),
  public.feed_page(text, integer, text, uuid, integer),
  public.spaces_rail(text, integer),
  public.follow_suggestions(text, integer)
  to authenticated;
