import {
  buildViewerContext,
  type SupabaseClient,
  fetchGroupSummaries,
  getFamilySpaceMemberCount,
  getGroupMemberCount,
  type DraftSource,
} from "@safeplace/api-client";
import type { ContentAudience, Gender } from "@safeplace/visibility-policy";
import type { IconName, SpaceOption } from "@safeplace/ui";
import { seedAudiences } from "./composeState";

/** Where compose was opened from (route params, plan §2: only the feed "+" is wired in Phase 4). */
export type ComposeEntry =
  | { kind: "profile" }
  | { kind: "group"; groupId: string }
  | { kind: "family_space"; spaceId: string };

export interface ComposeContext {
  userId: string;
  name: string;
  gender: Gender;
  entry: ComposeEntry;
  /** The initial selection: the account default, or the one locked space. */
  initialAudiences: ContentAudience[];
  /** Locked entry: the chip is fixed on this space (02 §4.3). */
  locked: { name: string; icon: IconName } | null;
  groups: SpaceOption[];
  familySpaces: SpaceOption[];
}

export const entryToSource = (e: ComposeEntry): DraftSource =>
  e.kind === "group"
    ? { kind: "group", groupId: e.groupId }
    : e.kind === "family_space"
      ? { kind: "family_space", spaceId: e.spaceId }
      : { kind: "profile" };

export function parseEntry(params: { group?: string; space?: string }): ComposeEntry {
  if (params.group) return { kind: "group", groupId: params.group };
  if (params.space) return { kind: "family_space", spaceId: params.space };
  return { kind: "profile" };
}

/**
 * Everything the screen needs before first paint. Membership lists come from
 * the viewer's own rows (RLS), and only groups/spaces the author belongs to
 * are offered; the database re-checks membership at publish.
 */
export async function loadComposeContext(
  supabase: SupabaseClient,
  userId: string,
  entry: ComposeEntry
): Promise<ComposeContext> {
  const [viewer, profileRes] = await Promise.all([
    buildViewerContext(supabase, userId),
    supabase.from("profiles").select("display_name, default_post_exposure").eq("id", userId).single(),
  ]);
  if (profileRes.error || !profileRes.data) {
    throw new Error(`loadComposeContext: ${profileRes.error?.message ?? "no profile"}`);
  }
  const profile = profileRes.data as { display_name: string; default_post_exposure: string };

  const groupIds = [...viewer.groupMemberships];
  const spaceIds = [...viewer.familySpaceMemberships];
  const [summaries, counts, spaces] = await Promise.all([
    fetchGroupSummaries(supabase, groupIds),
    Promise.all(groupIds.map((id) => getGroupMemberCount(supabase, id).catch(() => 0))),
    spaceIds.length
      ? supabase.from("family_spaces").select("id, name").in("id", spaceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (spaces.error) throw new Error(`loadComposeContext: ${spaces.error.message}`);

  const groups: SpaceOption[] = groupIds.flatMap((id, i) => {
    const g = summaries.get(id);
    return g ? [{ id, name: g.name, color: g.color ?? undefined, icon: (g.icon ?? undefined) as IconName | undefined, members: counts[i] ?? 0 }] : [];
  });
  const familyRows = (spaces.data ?? []) as Array<{ id: string; name: string }>;
  const familyCounts = await Promise.all(
    familyRows.map((f) => getFamilySpaceMemberCount(supabase, f.id).catch(() => null))
  );
  const familySpaces: SpaceOption[] = familyRows.map((f, i) => ({ id: f.id, name: f.name, members: familyCounts[i] ?? 0 }));

  let initialAudiences: ContentAudience[];
  let locked: ComposeContext["locked"] = null;
  if (entry.kind === "group") {
    const g = groups.find((x) => x.id === entry.groupId);
    if (!g) throw new Error("loadComposeContext: not a member of this group");
    initialAudiences = [{ kind: "group", groupId: entry.groupId }];
    locked = { name: g.name, icon: "users" };
  } else if (entry.kind === "family_space") {
    const f = familySpaces.find((x) => x.id === entry.spaceId);
    if (!f) throw new Error("loadComposeContext: not a member of this Family Space");
    initialAudiences = [{ kind: "family_space", spaceId: entry.spaceId }];
    locked = { name: f.name, icon: "family" };
  } else {
    initialAudiences = seedAudiences(profile.default_post_exposure, userId);
  }

  return {
    userId,
    name: profile.display_name,
    gender: viewer.gender,
    entry,
    initialAudiences,
    locked,
    groups,
    familySpaces,
  };
}
