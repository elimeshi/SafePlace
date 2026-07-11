-- ============================================================================
-- 0002 — Visibility helper functions (the SQL mirror of visibility-policy)
--
-- These functions are the database's translation of
-- packages/visibility-policy/src/rules.ts. They are the ONLY place the two
-- orthogonal axes (exposure, classification) are encoded in SQL — policies
-- (0003) and views (0004) compose them, never re-deriving the logic inline.
-- The RLS parity suite (packages/db-testing) asserts these agree with the TS
-- decision functions over the full fixture matrix; a drift fails CI.
--
-- Membership/settings/block helpers are SECURITY DEFINER: they read ONLY data
-- scoped to the calling user (auth.uid()), so bypassing RLS is safe and avoids
-- RLS-within-policy evaluation subtleties. `search_path = ''` + fully-qualified
-- names hardens them against search_path hijacking (SECURITY DEFINER hygiene).
-- ============================================================================

create schema if not exists visibility;
grant usage on schema visibility to anon, authenticated, service_role;

-- --- caller-scoped predicates (SECURITY DEFINER) ---------------------------

-- Does the caller follow `author`? (mirrors the followers_only branch of
-- viewerSatisfiesExposure — the author-sees-own case is handled by callers.)
create function visibility.viewer_follows(author uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.follows f
    where f.follower_id = auth.uid() and f.followed_id = author
  );
$$;

-- Is the caller a member of `g`?
create function visibility.viewer_in_group(g uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select g is not null and exists (
    select 1 from public.group_members m
    where m.group_id = g and m.user_id = auth.uid()
  );
$$;

-- Is the caller a confirmed member of family space `s`?
create function visibility.viewer_in_family_space(s uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select s is not null and exists (
    select 1 from public.family_space_members m
    where m.space_id = s and m.user_id = auth.uid()
  );
$$;

-- Mutual invisibility: is there a block in EITHER direction between the caller
-- and `other`? (docs/architecture/data-model.md Block.)
create function visibility.is_blocked_with(other uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = auth.uid())
  );
$$;

-- The caller's own content filter. Fail CLOSED (hide) if a settings row is
-- somehow absent — the conservative default for a modesty filter.
create function visibility.viewer_hides_women()
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select fs.hide_content_with_women from public.filter_settings fs
      where fs.user_id = auth.uid()),
    true
  );
$$;

create function visibility.viewer_filters_avatars()
  returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select fs.filter_applies_to_avatars from public.filter_settings fs
      where fs.user_id = auth.uid()),
    true
  );
$$;

-- --- classification axis (mirror of viewerSatisfiesClassification) ---------

-- Pure mirror of viewerSatisfiesClassification(viewer, classification,
-- isWithinViewersFamilySpace). No uploader carve-out here — that is the
-- caller's separate concern, exactly as rules.ts documents.
create function visibility.classification_visible(
  cls public.media_classification,
  is_within_family_space boolean
) returns boolean language sql stable set search_path = '' as $$
  select case
    when is_within_family_space then true
    when cls in ('general', 'unclassified') then true
    when cls = 'pending_review' then false
    when cls = 'contains_women' then not visibility.viewer_hides_women()
  end;
$$;

-- Whether the ORIGINAL media reference (storage_path / signed URL) may be
-- served. The uploader ALWAYS sees their own content (any classification,
-- including frozen/contains_women) — mirror of canViewMedia's uploader
-- short-circuit. Everyone else is strict classification parity.
create function visibility.media_url_permitted(
  cls public.media_classification,
  is_within_family_space boolean,
  is_uploader boolean
) returns boolean language sql stable set search_path = '' as $$
  select is_uploader
      or visibility.classification_visible(cls, is_within_family_space);
$$;

-- Is this media item being viewed inside a family space the caller belongs to?
-- (The exception is scoped to the content's own family-space exposure — never
-- inferred from the caller's memberships alone.) SECURITY DEFINER so it can
-- read the parent's exposure kind/target; the caller-membership check still
-- routes through viewer_in_family_space.
create function visibility.media_in_viewers_family_space(m public.media_items)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.posts p
    where p.exposure_kind = 'family_space'
      and visibility.viewer_in_family_space(p.exposure_space_id)
      and (
        p.id = m.post_id
        or p.id = (select c.post_id from public.comments c where c.id = m.comment_id)
      )
  );
$$;

-- Whether the caller may see a user's REAL avatar vs a generic one. Mirror of
-- canViewProfilePhoto: the owner always sees their own photo; otherwise opt-out
-- via filterAppliesToAvatars, else the pure classification check (no
-- family-space lift).
create function visibility.avatar_permitted(avatar_media uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when avatar_media is null then true
    when (select mi.uploader_id from public.media_items mi where mi.id = avatar_media) = auth.uid() then true
    when not visibility.viewer_filters_avatars() then true
    else visibility.classification_visible(
      (select mi.classification from public.media_items mi where mi.id = avatar_media),
      false
    )
  end;
$$;
