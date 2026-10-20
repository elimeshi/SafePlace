-- Family Space member count: a number without a list (invariant #5), and only
-- for members. Unlike group_member_count (a public group's size is public), a
-- Family Space is private by construction, so a non-member gets NULL, never a
-- number. Mirrors visibility-policy `canViewFamilySpaceMemberCount`.
create function public.family_space_member_count(target uuid)
  returns integer language sql stable security definer set search_path = '' as $$
  select case
    when visibility.viewer_in_family_space(target)
      then (select count(*)::int from public.family_space_members m where m.space_id = target)
  end;
$$;

revoke all on function public.family_space_member_count(uuid) from public, anon;
grant execute on function public.family_space_member_count(uuid) to authenticated;
