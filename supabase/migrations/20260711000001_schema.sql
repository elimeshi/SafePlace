-- ============================================================================
-- 0001 — Core schema
--
-- Derived from docs/architecture/data-model.md and packages/shared-types.
-- Full schema (all entities), per the Phase 1 "go full-schema" decision; RLS
-- DEPTH is proportional — rich on the read-path crux (profiles, posts,
-- comments, media_items, follows, blocks, groups, family spaces), baseline
-- owner-scoping for messages/reports/moderation (their feature depth lands in
-- later phases).
--
-- Enums mirror the string unions in @safeplace/visibility-policy and
-- @safeplace/shared-types 1:1 — keep them in lockstep.
--
-- This migration only creates structure and ENABLES row-level security (with no
-- policies yet → deny-by-default for every non-service role). Policies land in
-- 0003; until then the database is closed, which is the correct baseline.
-- ============================================================================

-- --- Enums ------------------------------------------------------------------
create type gender as enum ('male', 'female');

create type media_classification as enum (
  'unclassified',   -- queued, not yet scored
  'general',        -- low probability — unfiltered
  'pending_review', -- medium probability — frozen pending human review
  'contains_women'  -- high probability — subject to viewer filtering
);

create type account_status as enum (
  'active', 'suspended', 'frozen', 'pending_deletion', 'deleted'
);

create type exposure_kind as enum (
  'public', 'followers_only', 'group', 'family_space'
);

create type post_source_kind as enum ('profile', 'group', 'family_space');

create type group_visibility as enum (
  'public', 'private_visible', 'private_hidden'
);

create type group_posting_policy as enum ('open', 'approval_required', 'admin_only');

create type who_can_follow as enum ('everyone', 'approval_required');

create type discoverable_in_search as enum ('everyone', 'followers_only', 'nobody');

create type message_request_status as enum ('pending', 'accepted', 'declined', 'reported');

create type report_target_type as enum ('post', 'comment', 'message', 'user');

create type report_status as enum ('pending_review', 'resolved');

create type moderation_penalty_type as enum (
  'warning', 'suspension_24h', 'suspension_7d', 'permanent_ban', 'content_removed'
);

create type appeal_status as enum ('none', 'pending', 'upheld', 'overturned');

-- --- profiles (1:1 with auth.users) ----------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  bio text,
  -- Resolved after media_items exists (avatars are real, classified media).
  avatar_media_id uuid,
  gender gender not null,
  gender_changed_at timestamptz,
  gender_change_effective_at timestamptz,
  -- Privacy settings (shared-types PrivacySettings) — inlined; not part of the
  -- classification read-path crux.
  default_post_exposure exposure_kind not null default 'public',
  who_can_follow who_can_follow not null default 'everyone',
  discoverable_in_search discoverable_in_search not null default 'everyone',
  show_read_receipts boolean not null default true,
  show_online_status boolean not null default true,
  account_status account_status not null default 'active',
  created_at timestamptz not null default now()
);

-- --- filter_settings (1:1 with profiles) -----------------------------------
-- Its own table (typed booleans) rather than a jsonb blob: RLS predicates read
-- individual flags directly, and each flag stays independently user-editable
-- (defaults-are-not-rules). Exactly one row per user; never denormalized.
-- The gender-conditioned columns are intentionally NOT defaulted here — the
-- signup path (0005 handle_new_user, or an explicit seed) must set them from
-- the declared gender, so a row can never exist without a deliberate value.
create table filter_settings (
  user_id uuid primary key references profiles (id) on delete cascade,
  hide_content_with_women boolean not null,
  hide_women_accounts boolean not null,
  filter_applies_to_avatars boolean not null,
  show_suggested_posts boolean not null default true,
  gender_separation_in_messages boolean not null default false,
  gender_separation_in_search boolean not null default false
);

-- --- groups ----------------------------------------------------------------
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  color text not null,
  icon text not null,
  visibility group_visibility not null default 'public',
  posting_policy group_posting_policy not null default 'open',
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- --- family spaces ---------------------------------------------------------
create table family_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table family_space_members (
  space_id uuid not null references family_spaces (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

-- --- social graph ----------------------------------------------------------
create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followed_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint no_self_follow check (follower_id <> followed_id)
);

create table blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

-- --- messaging (baseline; feature depth is Phase 7) ------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references profiles (id) on delete cascade,
  participant_b uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversation_distinct_participants check (participant_a <> participant_b)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  text text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_for_everyone boolean not null default false
);

create table message_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles (id) on delete cascade,
  recipient_id uuid not null references profiles (id) on delete cascade,
  text text not null,
  status message_request_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- --- posts + comments ------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  text text not null default '',
  exposure_kind exposure_kind not null,
  exposure_group_id uuid references groups (id) on delete cascade,
  exposure_space_id uuid references family_spaces (id) on delete cascade,
  source_kind post_source_kind not null default 'profile',
  source_group_id uuid references groups (id) on delete set null,
  source_space_id uuid references family_spaces (id) on delete set null,
  location_tag text, -- place name only, never coordinates
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  -- The exposure target column must be present iff the kind needs it.
  constraint post_exposure_target check (
    (exposure_kind = 'group') = (exposure_group_id is not null)
    and (exposure_kind = 'family_space') = (exposure_space_id is not null)
  )
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  parent_comment_id uuid references comments (id) on delete cascade,
  text text not null default '',
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

-- --- media items (polymorphic; every surface goes through classification) ---
create table media_items (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts (id) on delete cascade,
  comment_id uuid references comments (id) on delete cascade,
  message_id uuid references messages (id) on delete cascade,
  profile_id uuid references profiles (id) on delete cascade, -- avatar/profile photo
  -- Denormalized author of the parent surface: immutable, and the "uploader
  -- always sees their own media (even while pending/under review)" rule keys
  -- off it without a parent join.
  uploader_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null,
  -- Only the RESOLVED classification lives here. Raw model confidence is owned
  -- by the pipeline (Phase 3), never on this row, never exposed to clients.
  classification media_classification not null default 'unclassified',
  classified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint media_exactly_one_parent check (
    num_nonnulls(post_id, comment_id, message_id, profile_id) = 1
  )
);

-- Avatars are real, classified media_items; resolve the cross-reference now.
alter table profiles
  add constraint profiles_avatar_media_fk
  foreign key (avatar_media_id) references media_items (id) on delete set null;

-- --- polls + tags ----------------------------------------------------------
create table polls (
  post_id uuid primary key references posts (id) on delete cascade,
  question text not null
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references polls (post_id) on delete cascade,
  text text not null,
  image_media_id uuid references media_items (id) on delete set null,
  position int not null default 0
);

create table post_tags (
  post_id uuid not null references posts (id) on delete cascade,
  tagged_user_id uuid not null references profiles (id) on delete cascade,
  primary key (post_id, tagged_user_id)
);

-- --- moderation ------------------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  category text not null,
  free_text_explanation text,
  status report_status not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references profiles (id) on delete cascade,
  decided_by_moderator_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  rule_violated text not null,
  penalty_type moderation_penalty_type not null,
  penalty_duration interval,
  appealable boolean not null default true,
  appeal_status appeal_status not null default 'none',
  -- "Two pairs of eyes": an appeal must be decided by a different moderator.
  appeal_decided_by_moderator_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint appeal_different_moderator check (
    appeal_decided_by_moderator_id is null
    or appeal_decided_by_moderator_id <> decided_by_moderator_id
  )
);

-- --- indexes (read-path hot columns) ---------------------------------------
create index idx_posts_author on posts (author_id);
create index idx_posts_exposure_group on posts (exposure_group_id);
create index idx_posts_exposure_space on posts (exposure_space_id);
create index idx_comments_post on comments (post_id);
create index idx_comments_author on comments (author_id);
create index idx_media_post on media_items (post_id);
create index idx_media_comment on media_items (comment_id);
create index idx_media_uploader on media_items (uploader_id);
create index idx_media_classification on media_items (classification);
create index idx_follows_followed on follows (followed_id);
create index idx_group_members_user on group_members (user_id);
create index idx_family_space_members_user on family_space_members (user_id);
create index idx_messages_conversation on messages (conversation_id);

-- --- enable RLS everywhere (deny-by-default until 0003 adds policies) -------
alter table profiles              enable row level security;
alter table filter_settings       enable row level security;
alter table groups                enable row level security;
alter table group_members         enable row level security;
alter table family_spaces         enable row level security;
alter table family_space_members  enable row level security;
alter table follows               enable row level security;
alter table blocks                enable row level security;
alter table conversations         enable row level security;
alter table messages              enable row level security;
alter table message_requests      enable row level security;
alter table posts                 enable row level security;
alter table comments              enable row level security;
alter table media_items           enable row level security;
alter table polls                 enable row level security;
alter table poll_options          enable row level security;
alter table post_tags             enable row level security;
alter table reports               enable row level security;
alter table moderation_actions    enable row level security;

-- --- grants ----------------------------------------------------------------
-- RLS is the gate; grants just make the tables reachable. With RLS enabled an
-- operation still needs a matching policy (0003), so a broad grant here cannot
-- by itself expose a row. service_role additionally bypasses RLS.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
