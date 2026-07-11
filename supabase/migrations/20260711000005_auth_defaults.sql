-- ============================================================================
-- 0005 — Signup: profile bootstrap + gender-conditioned filter DEFAULTS
--
-- When a user signs up they declare a gender (passed in the auth signUp
-- metadata → auth.users.raw_user_meta_data). This trigger creates their 1:1
-- profile + filter_settings, seeding the gender-conditioned defaults.
--
-- These are DEFAULTS, not rules (invariant #3): every seeded flag stays
-- independently user-editable via filter_settings (0003 grants the owner
-- UPDATE). The male/female values MIRROR DEFAULT_FILTER_SETTINGS in
-- packages/visibility-policy/src/types.ts — a parity test in db-testing asserts
-- this trigger and resolveDefaultFilterSettings() never drift.
--
-- SECURITY DEFINER: runs as owner so it can insert the rows at signup time
-- (before the new user has an auth context of their own).
-- ============================================================================

create function public.handle_new_user()
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
  --   male   → hide/hide/avatars-filtered = true
  --   female → all three = false
  -- (show_suggested_posts / gender_separation_* use their column defaults,
  --  which already match DEFAULT_FILTER_SETTINGS.)
  insert into public.filter_settings (
    user_id,
    hide_content_with_women,
    hide_women_accounts,
    filter_applies_to_avatars
  ) values (
    new.id,
    declared_gender = 'male',
    declared_gender = 'male',
    declared_gender = 'male'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
