-- ============================================================================
-- 0004 — Visibility read models (the API-tier "placeholder, not leak")
--
-- RLS (0003) decides whether a viewer KNOWS a media item / profile exists.
-- These views add the classification axis on top: for a viewer the filter
-- applies to, the row is still returned (so the UI renders a neutral
-- placeholder / generic avatar) but the underlying reference is withheld and
-- an is_filtered / avatar_filtered flag is set. This is enforcement layer #2
-- (server/API) from visibility-model §6 — clients read these views, never the
-- base tables' storage_path / avatar directly.
--
-- security_invoker = on ⇒ the base table's RLS still applies, so the view can
-- never widen row visibility; it only narrows column exposure.
-- ============================================================================

create view media_items_visible with (security_invoker = on) as
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
  -- Original reference is served only when classification permits it (or the
  -- uploader is viewing their own frozen media). Otherwise NULL → placeholder.
  case when perm.url_ok then m.storage_path else null end as storage_path,
  not perm.url_ok as is_filtered
from public.media_items m
cross join lateral (
  select visibility.media_url_permitted(
    m.classification,
    visibility.media_in_viewers_family_space(m),
    m.uploader_id = auth.uid()
  ) as url_ok
) perm;

grant select on media_items_visible to authenticated;

create view profiles_visible with (security_invoker = on) as
select
  p.id,
  p.display_name,
  p.bio,
  p.gender,
  p.account_status,
  p.created_at,
  -- Real avatar reference only when canViewProfilePhoto permits; else NULL →
  -- generic avatar (presented identically to any other neutral avatar).
  case when av.ok then p.avatar_media_id else null end as avatar_media_id,
  not av.ok as avatar_filtered
from public.profiles p
cross join lateral (select visibility.avatar_permitted(p.avatar_media_id) as ok) av;

grant select on profiles_visible to authenticated;

-- --- "Number without list" (invariant #5) ----------------------------------
-- Counts are public; the underlying edges/memberships are not. SECURITY
-- DEFINER so the count can be taken over rows the caller cannot enumerate,
-- while only ever returning an integer.
create function public.follower_count(target uuid)
  returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.follows f where f.followed_id = target;
$$;

create function public.following_count(target uuid)
  returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.follows f where f.follower_id = target;
$$;

create function public.group_member_count(target uuid)
  returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.group_members m where m.group_id = target;
$$;

grant execute on function
  public.follower_count(uuid),
  public.following_count(uuid),
  public.group_member_count(uuid)
  to authenticated;
