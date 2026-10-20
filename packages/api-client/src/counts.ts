import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Number without list" (invariant #5): these return aggregate counts via
 * SECURITY DEFINER RPCs. The underlying follow edges / memberships are never
 * enumerable by anyone but their owner — only the number is public.
 */

async function count(
  supabase: SupabaseClient,
  fn: string,
  target: string
): Promise<number> {
  const { data, error } = await supabase.rpc(fn, { target });
  if (error) throw new Error(`${fn}: ${error.message}`);
  return Number(data ?? 0);
}

export const getFollowerCount = (supabase: SupabaseClient, userId: string) =>
  count(supabase, "follower_count", userId);

export const getFollowingCount = (supabase: SupabaseClient, userId: string) =>
  count(supabase, "following_count", userId);

export const getGroupMemberCount = (supabase: SupabaseClient, groupId: string) =>
  count(supabase, "group_member_count", groupId);

/** Members of a Family Space, or null when the caller is not a member (the database withholds even the number). */
export async function getFamilySpaceMemberCount(
  supabase: SupabaseClient,
  spaceId: string
): Promise<number | null> {
  const { data, error } = await supabase.rpc("family_space_member_count", { target: spaceId });
  if (error) throw new Error(`family_space_member_count: ${error.message}`);
  return data == null ? null : Number(data);
}
