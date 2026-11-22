-- ============================================================================
-- Phase 8a — staff identity, roles and the aal2 guard
--
-- Spec: docs/plans/phase-8-admin-portal.md §4.1; ADR 0020.
--
-- Staff are dedicated Supabase Auth accounts flagged app_metadata.staff = true.
-- They are not app users: handle_new_user gives them no profile and no filter
-- settings, so they are invisible in the app and can never write app tables
-- (visibility.account_write_allowed is false without a profile).
--
-- The staff schema is closed to every client role. Console RPCs (SECURITY
-- DEFINER) read it through staff.current_role() / staff.require(), which honour
-- a role only for an ACTIVE member whose JWT is aal2 (TOTP) — mirror of
-- staffAllowed in packages/visibility-policy/src/staff.ts.
--
-- moderation_actions deciders are staff now, so their FKs move from profiles to
-- auth.users, and appeal_different_moderator is dropped: two pairs of eyes
-- applies to reviewers only (plan §2 fork 7); admin appeals may go to the
-- original decider.
-- ============================================================================

create schema staff;
revoke all on schema staff from public;
grant usage on schema staff to service_role;

create type staff.staff_role as enum ('reviewer', 'admin', 'senior_admin');

create table staff.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role staff.staff_role not null,
  active boolean not null default true,
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  deactivated_at timestamptz
);

-- An admin's per-session acknowledgement of the "possibly improper media"
-- warning before entering the review area (plan §2 fork 1). session_id is the
-- JWT session_id claim.
create table staff.review_entries (
  user_id uuid not null references staff.members (user_id) on delete cascade,
  session_id text not null,
  acknowledged_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

-- No policies: no client role ever reads these tables directly.
alter table staff.members enable row level security;
alter table staff.review_entries enable row level security;
revoke all on all tables in schema staff from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema staff to service_role;

-- --- guards ------------------------------------------------------------------
create function staff.current_role()
  returns staff.staff_role language sql stable security definer set search_path = '' as $$
  select m.role
    from staff.members m
   where m.user_id = auth.uid()
     and m.active
     and auth.jwt() ->> 'aal' = 'aal2';
$$;

-- Enum order is the rank: reviewer < admin < senior_admin.
create function staff.require(min staff.staff_role)
  returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(staff.current_role() >= min, false) then
    return;
  end if;
  raise exception 'staff access denied' using errcode = '42501';
end;
$$;

-- Any staff row, active or not: app-facing RPCs treat a staff caller as no user.
create function visibility.is_staff()
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from staff.members m where m.user_id = auth.uid());
$$;

revoke all on function staff.current_role(), staff.require(staff.staff_role), visibility.is_staff()
  from public, anon;
grant execute on function staff.current_role(), staff.require(staff.staff_role), visibility.is_staff()
  to authenticated, service_role;
-- The guards are callable by name, so clients need usage on the schema; its
-- tables stay ungranted (above), so usage exposes nothing but the guards.
grant usage on schema staff to authenticated;

-- --- signup: staff get no profile -------------------------------------------
-- Body of 20261030100100_content_levels.sql (the latest definition) verbatim,
-- plus the early return for staff accounts.
create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = '' as $$
declare
  declared_gender public.gender;
  declared_name text;
begin
  -- Staff accounts are not app users (plan §4.1): no profile, no filter settings.
  if new.raw_app_meta_data ->> 'staff' = 'true' then
    return new;
  end if;

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

-- --- moderation_actions: deciders are staff ---------------------------------
-- Same on-delete behaviour as 20260711000001_schema.sql; only the target moves.
alter table public.moderation_actions
  drop constraint moderation_actions_decided_by_moderator_id_fkey,
  drop constraint moderation_actions_appeal_decided_by_moderator_id_fkey,
  drop constraint appeal_different_moderator,
  add constraint moderation_actions_decided_by_moderator_id_fkey
    foreign key (decided_by_moderator_id) references auth.users (id) on delete cascade,
  add constraint moderation_actions_appeal_decided_by_moderator_id_fkey
    foreign key (appeal_decided_by_moderator_id) references auth.users (id) on delete set null;
