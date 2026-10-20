import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentAudience,
  ContentExposure,
  FeedPlacement,
  MediaClassification,
  PostContext,
  PostSourceKind,
} from "@safeplace/visibility-policy";
import { MEDIA_BUCKET } from "./media";

/**
 * Feed read paths. Ordering is random, seeded once per feed visit (plan §2);
 * the ranking session replaces the ONE SQL function behind fetchFeedPage and
 * this contract stays. All visibility is decided by RLS / the SQL functions —
 * nothing here re-implements a rule (CLAUDE.md invariant #2).
 */

/** Draw a new seed: once per feed visit, and again on pull-to-refresh. */
export function newFeedSeed(): string {
  // Not security-sensitive: a seed only has to differ between visits.
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Media as the UI sees it. A filtered item NEVER carries a path. */
export interface MediaView {
  id: string;
  classification: MediaClassification;
  filtered: boolean;
  redacted: boolean;
  storagePath: string | null;
  /** Filled in by resolveMediaUrls. */
  url: string | null;
}

export interface MediaRow {
  id: string;
  classification: MediaClassification;
  storage_path: string | null;
  is_filtered: boolean;
  is_redacted?: boolean;
}

export function toMediaView(row: MediaRow): MediaView {
  const filtered = row.is_filtered || !row.storage_path;
  return {
    id: row.id,
    classification: row.classification,
    filtered,
    redacted: Boolean(row.is_redacted),
    storagePath: filtered ? null : row.storage_path,
    url: null,
  };
}

/** Batch-sign the unfiltered media of the given views (filtered ones are skipped). */
export async function resolveMediaUrls(
  supabase: SupabaseClient,
  views: MediaView[],
  expiresInSeconds = 3600
): Promise<MediaView[]> {
  const paths = views.flatMap((v) => (v.filtered || !v.storagePath ? [] : [v.storagePath]));
  if (paths.length === 0) return views;
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);
  if (error || !data) throw new Error(`resolveMediaUrls: ${error?.message ?? "no data"}`);
  const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return views.map((v) => ({ ...v, url: v.storagePath ? (byPath.get(v.storagePath) ?? null) : null }));
}

export type FeedAudience =
  | { kind: "public" }
  | { kind: "followers_only" }
  | { kind: "group"; groupId: string }
  | { kind: "family_space"; spaceId: string };

interface AudienceJson {
  kind: FeedAudience["kind"];
  group_id: string | null;
  space_id: string | null;
}

const toAudience = (a: AudienceJson): FeedAudience =>
  a.kind === "group"
    ? { kind: "group", groupId: a.group_id as string }
    : a.kind === "family_space"
      ? { kind: "family_space", spaceId: a.space_id as string }
      : { kind: a.kind };

export interface PostStats {
  likeCount: number;
  commentCount: number;
  viewerLiked: boolean;
  viewerSaved: boolean;
}

export interface PostItem {
  id: string;
  authorId: string;
  text: string;
  sourceKind: PostSourceKind;
  sourceGroupId: string | null;
  sourceSpaceId: string | null;
  locationTag: string | null;
  quotedPostId: string | null;
  createdAt: string;
  publishedAt: string | null;
  /** Only the audiences the viewer satisfies (the author sees all), in pick order. */
  audiences: FeedAudience[];
  media: MediaView[];
  /** null if the post is not visible any more (stats are visibility-filtered). */
  stats: PostStats | null;
}

export interface FeedItem extends PostItem {
  placement: Exclude<FeedPlacement, "none">;
  sortKey: string;
}

export interface FeedCursor {
  key: string;
  id: string;
}

export interface FeedPage {
  items: FeedItem[];
  /** null when the feed is exhausted. */
  nextCursor: FeedCursor | null;
}

interface PostRow {
  id: string;
  author_id: string;
  text: string;
  source_kind: PostSourceKind;
  source_group_id: string | null;
  source_space_id: string | null;
  location_tag: string | null;
  quoted_post_id: string | null;
  created_at: string;
  published_at: string | null;
  audiences: AudienceJson[] | null;
  media: MediaRow[] | null;
}

interface StatsRow {
  post_id: string;
  like_count: number;
  comment_count: number;
  viewer_liked: boolean;
  viewer_saved: boolean;
}

/** Counts/viewer flags for posts, merged by id. Ids the caller cannot see are absent. */
export async function fetchPostStats(
  supabase: SupabaseClient,
  postIds: string[]
): Promise<Map<string, PostStats>> {
  const out = new Map<string, PostStats>();
  if (postIds.length === 0) return out;
  const { data, error } = await supabase.rpc("post_stats", { p_post_ids: postIds });
  if (error) throw new Error(`fetchPostStats: ${error.message}`);
  for (const r of (data ?? []) as StatsRow[]) {
    out.set(r.post_id, {
      likeCount: r.like_count,
      commentCount: r.comment_count,
      viewerLiked: r.viewer_liked,
      viewerSaved: r.viewer_saved,
    });
  }
  return out;
}

function toPostItem(r: PostRow, stats: PostStats | undefined): PostItem {
  return {
    id: r.id,
    authorId: r.author_id,
    text: r.text,
    sourceKind: r.source_kind,
    sourceGroupId: r.source_group_id,
    sourceSpaceId: r.source_space_id,
    locationTag: r.location_tag,
    quotedPostId: r.quoted_post_id,
    createdAt: r.created_at,
    publishedAt: r.published_at,
    audiences: (r.audiences ?? []).map(toAudience),
    media: (r.media ?? []).map(toMediaView),
    stats: stats ?? null,
  };
}

export interface FetchFeedPageParams {
  seed: string;
  cursor?: FeedCursor | null;
  /** Default 20, server cap 50. */
  limit?: number;
}

/** One page of the main feed: seeded keyset pagination + merged post_stats. */
export async function fetchFeedPage(
  supabase: SupabaseClient,
  params: FetchFeedPageParams
): Promise<FeedPage> {
  const limit = params.limit ?? 20;
  const { data, error } = await supabase.rpc("feed_page", {
    p_seed: params.seed,
    p_limit: limit,
    p_after_key: params.cursor?.key ?? null,
    p_after_id: params.cursor?.id ?? null,
  });
  if (error) throw new Error(`fetchFeedPage: ${error.message}`);
  const rows = (data ?? []) as Array<PostRow & { placement: string; sort_key: string }>;
  const stats = await fetchPostStats(supabase, rows.map((r) => r.id));
  const items = rows.map<FeedItem>((r) => ({
    ...toPostItem(r, stats.get(r.id)),
    placement: r.placement === "suggested" ? "suggested" : "followed",
    sortKey: r.sort_key,
  }));
  const last = items[items.length - 1];
  return {
    items,
    // shortcut: the suggested-inclusion filter can make a page short while more
    // rows exist; a short page therefore ends the feed. Revisit with ranking.
    nextCursor: last && items.length >= limit ? { key: last.sortKey, id: last.id } : null,
  };
}

/**
 * A single post (RLS-gated: a Family Space member reaches it via the carve-out
 * policy, anyone else gets null). Also the quoted-post lookup.
 */
export async function fetchPost(
  supabase: SupabaseClient,
  postId: string
): Promise<PostItem | null> {
  const { data: post, error } = await supabase
    .from("posts")
    .select(
      "id, author_id, text, source_kind, source_group_id, source_space_id, location_tag, quoted_post_id, created_at, published_at"
    )
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(`fetchPost: ${error.message}`);
  if (!post) return null;

  const [aud, media, stats] = await Promise.all([
    supabase
      .from("post_audiences")
      .select("kind, group_id, space_id, position")
      .eq("post_id", postId)
      .order("position"),
    supabase.rpc("post_media_json", { p_post: postId }),
    fetchPostStats(supabase, [postId]),
  ]);
  if (aud.error) throw new Error(`fetchPost audiences: ${aud.error.message}`);
  if (media.error) throw new Error(`fetchPost media: ${media.error.message}`);
  return toPostItem(
    {
      ...(post as Omit<PostRow, "audiences" | "media">),
      audiences: (aud.data ?? []) as AudienceJson[],
      media: (media.data ?? []) as MediaRow[],
    },
    stats.get(postId)
  );
}

export type QuotedPost = { state: "available"; post: PostItem } | { state: "unavailable" };

/** Resolve a quote post's original; deleted / hidden / blocked all read "unavailable". */
export async function fetchQuotedPost(
  supabase: SupabaseClient,
  quotedPostId: string | null
): Promise<QuotedPost> {
  if (!quotedPostId) return { state: "unavailable" };
  const post = await fetchPost(supabase, quotedPostId);
  return post ? { state: "available", post } : { state: "unavailable" };
}

// --- spaces rail ------------------------------------------------------------

export interface SpaceCard {
  spaceKind: "group" | "family_space";
  spaceId: string;
  name: string;
  color: string | null;
  icon: string | null;
  latestPost: {
    id: string;
    text: string;
    authorId: string;
    publishedAt: string | null;
    media: MediaView[];
  } | null;
}

interface RailRow {
  space_kind: "group" | "family_space";
  space_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  latest_post_id: string | null;
  latest_text: string | null;
  latest_author_id: string | null;
  latest_published_at: string | null;
  latest_media: MediaRow[] | null;
}

export async function fetchSpacesRail(
  supabase: SupabaseClient,
  params: { seed: string; limit?: number }
): Promise<SpaceCard[]> {
  const { data, error } = await supabase.rpc("spaces_rail", {
    p_seed: params.seed,
    p_limit: params.limit ?? 20,
  });
  if (error) throw new Error(`fetchSpacesRail: ${error.message}`);
  return ((data ?? []) as RailRow[]).map((r) => ({
    spaceKind: r.space_kind,
    spaceId: r.space_id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    latestPost: r.latest_post_id
      ? {
          id: r.latest_post_id,
          text: r.latest_text ?? "",
          authorId: r.latest_author_id as string,
          publishedAt: r.latest_published_at,
          media: (r.latest_media ?? []).map(toMediaView),
        }
      : null,
  }));
}

// --- follow suggestions -----------------------------------------------------

export interface FollowSuggestion {
  userId: string;
  displayName: string;
  avatarMediaId: string | null;
  reason: "engaged" | "active_poster";
}

export async function fetchFollowSuggestions(
  supabase: SupabaseClient,
  params: { seed: string; limit?: number }
): Promise<FollowSuggestion[]> {
  const { data, error } = await supabase.rpc("follow_suggestions", {
    p_seed: params.seed,
    p_limit: params.limit ?? 10,
  });
  if (error) throw new Error(`fetchFollowSuggestions: ${error.message}`);
  return (
    (data ?? []) as Array<{
      user_id: string;
      display_name: string;
      avatar_media_id: string | null;
      reason: FollowSuggestion["reason"];
    }>
  ).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    avatarMediaId: r.avatar_media_id,
    reason: r.reason,
  }));
}

// --- source label (plan §2a) -------------------------------------------------

export type SourceLabel =
  | { kind: "group"; groupId: string }
  | { kind: "family_space"; spaceId: string }
  | { kind: "public" }
  | { kind: "followers" };

export type FeedEntryContext =
  | { kind: "profile" }
  | { kind: "group"; groupId: string }
  | { kind: "family_space"; spaceId: string };

/**
 * Pure presentation mapping — no visibility decision. `audiences` is already
 * limited by RLS to those the viewer satisfies, so a group audience here is
 * one the viewer belongs to and naming it leaks nothing.
 *  - group / Family Space entry point -> that space;
 *  - a group/space-sourced post -> its source;
 *  - profile post: public -> "public"; else the first group audience; else
 *    "followers". The author sees the first audience they picked.
 */
export function resolveSourceLabel(
  item: Pick<PostItem, "authorId" | "sourceKind" | "sourceGroupId" | "sourceSpaceId" | "audiences">,
  viewerId: string,
  entry: FeedEntryContext = { kind: "profile" }
): SourceLabel {
  if (entry.kind === "group") return { kind: "group", groupId: entry.groupId };
  if (entry.kind === "family_space") return { kind: "family_space", spaceId: entry.spaceId };
  if (item.sourceKind === "group" && item.sourceGroupId) {
    return { kind: "group", groupId: item.sourceGroupId };
  }
  if (item.sourceKind === "family_space" && item.sourceSpaceId) {
    return { kind: "family_space", spaceId: item.sourceSpaceId };
  }

  const first = item.audiences[0];
  if (item.authorId === viewerId && first) return audienceLabel(first);
  if (item.audiences.some((a) => a.kind === "public")) return { kind: "public" };
  const group = item.audiences.find((a) => a.kind === "group");
  return group ? audienceLabel(group) : { kind: "followers" };
}

function audienceLabel(a: FeedAudience): SourceLabel {
  if (a.kind === "group") return { kind: "group", groupId: a.groupId };
  if (a.kind === "family_space") return { kind: "family_space", spaceId: a.spaceId };
  return a.kind === "public" ? { kind: "public" } : { kind: "followers" };
}

/** name/colour/icon for the groups a label names (RLS: only groups the viewer may see). */
export async function fetchGroupSummaries(
  supabase: SupabaseClient,
  groupIds: string[]
): Promise<Map<string, { name: string; color: string | null; icon: string | null }>> {
  const out = new Map<string, { name: string; color: string | null; icon: string | null }>();
  if (groupIds.length === 0) return out;
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, color, icon")
    .in("id", groupIds);
  if (error) throw new Error(`fetchGroupSummaries: ${error.message}`);
  for (const g of (data ?? []) as Array<{ id: string; name: string; color: string | null; icon: string | null }>) {
    out.set(g.id, { name: g.name, color: g.color, icon: g.icon });
  }
  return out;
}

// --- bridging to visibility-policy -------------------------------------------

/**
 * Build the PostContext that visibility-policy rules (canCopyExternalLink,
 * canSharePostInternally, ...) take. An empty audience list (cannot happen for
 * a visible post) yields null so callers fail closed.
 */
export function postContextOf(item: PostItem): PostContext | null {
  const audiences: ContentAudience[] = item.audiences.map((a) =>
    a.kind === "followers_only" ? { kind: "followers_only", authorId: item.authorId } : a
  );
  if (audiences.length === 0) return null;
  return {
    authorId: item.authorId,
    status: "published",
    exposure: audiences as unknown as ContentExposure,
    sourceKind: item.sourceKind,
  };
}
