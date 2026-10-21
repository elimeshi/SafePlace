import {
  appealClassification,
  buildViewerContext,
  fetchFeedPage,
  fetchFollowSuggestions,
  fetchGroupSummaries,
  fetchOwnRecentPosts,
  fetchPost,
  fetchQuotedPost,
  fetchSpacesRail,
  getCopyLink,
  likePost,
  muteUser,
  postContextOf,
  removeMedia,
  reportContent,
  resolveMediaUrls,
  resolveSourceLabel,
  resolveUploaderMediaViews,
  savePost,
  sendSuggestionFeedback,
  shareToGroup,
  unlikePost,
  unsavePost,
  updateFilterSettings,
  type FeedCursor,
  type SupabaseClient,
  type FeedItem,
  type MediaView,
  type PostItem,
  type SuggestionFeedbackKind,
} from "@safeplace/api-client";
import { canSharePostInternally, type GroupVisibility, type Viewer } from "@safeplace/visibility-policy";
import { feedScreenCopy, REPORT_CATEGORY_ORDER } from "./copy";
import type { EntryLabel, EntryQuote, FeedEntry, FollowItemVM, SpaceCardVM } from "./types";

/**
 * The feed's data seam. The screen talks only to this interface; production
 * is built on @safeplace/api-client (every visibility decision made by RLS and
 * visibility-policy), and the dev-only fixture mode swaps in canned data.
 */
export interface FeedApi {
  viewer: Viewer;
  loadPage(seed: string, cursor: FeedCursor | null): Promise<{ entries: FeedEntry[]; cursor: FeedCursor | null }>;
  loadSpaces(seed: string): Promise<SpaceCardVM[]>;
  loadSuggestions(seed: string): Promise<FollowItemVM[]>;
  /** The viewer's own posts published since `sinceIso` (pinned locally, plan §2 Defaults). */
  loadPinned(sinceIso: string): Promise<FeedEntry[]>;
  setLiked(postId: string, liked: boolean): Promise<void>;
  setSaved(postId: string, saved: boolean): Promise<void>;
  mute(authorId: string): Promise<void>;
  feedback(authorId: string, kind: SuggestionFeedbackKind): Promise<void>;
  report(postId: string, categoryIndex: number, details: string): Promise<void>;
  follow(userId: string): Promise<void>;
  /** The "show only people and groups I follow" toggle (01 §7.1). */
  setFollowedOnly(on: boolean): Promise<void>;
  /** null when visibility-policy forbids an external link for this post. */
  copyLinkFor(item: PostItem): string | null;
  /** The group a share would go to, null when canSharePostInternally allows none. */
  shareTargetFor(item: PostItem): Promise<{ groupId: string; name: string } | null>;
  shareToGroup(item: PostItem, groupId: string): Promise<void>;
  removeMedia(mediaId: string): Promise<void>;
  appeal(mediaId: string): Promise<void>;
}

const UNIQUE_VIOLATION = "23505";

async function namesOf(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const uniq = [...new Set(ids)];
  if (uniq.length === 0) return out;
  const { data, error } = await supabase.from("profiles").select("id, display_name").in("id", uniq);
  if (error) throw new Error(`namesOf: ${error.message}`);
  for (const r of (data ?? []) as Array<{ id: string; display_name: string }>) out.set(r.id, r.display_name);
  return out;
}

async function familyNames(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const { data, error } = await supabase.from("family_spaces").select("id, name").in("id", ids);
  if (error) throw new Error(`familyNames: ${error.message}`);
  for (const r of (data ?? []) as Array<{ id: string; name: string }>) out.set(r.id, r.name);
  return out;
}

/** Sign every unfiltered media url in one batch and hand the views back by id. */
async function signed(supabase: SupabaseClient, views: MediaView[]): Promise<Map<string, MediaView>> {
  const out = await resolveMediaUrls(supabase, views);
  return new Map(out.map((v) => [v.id, v]));
}

/** Turn raw feed items into render-ready entries: names, source labels, quote originals, signed media. */
export async function hydrateEntries(supabase: SupabaseClient, viewer: Viewer, items: FeedItem[]): Promise<FeedEntry[]> {
  const quotes = await Promise.all(items.map((i) => (i.quotedPostId ? fetchQuotedPost(supabase, i.quotedPostId) : null)));
  const quotedPosts = quotes.flatMap((q) => (q && q.state === "available" ? [q.post] : []));

  const byId = await signed(supabase, [...items, ...quotedPosts].flatMap((p) => p.media));
  const sign = <T extends PostItem>(p: T): T => ({ ...p, media: p.media.map((m) => byId.get(m.id) ?? m) });

  const labels = items.map((i) => resolveSourceLabel(i, viewer.userId));
  const [names, groups, families] = await Promise.all([
    namesOf(supabase, [...items.map((i) => i.authorId), ...quotedPosts.map((p) => p.authorId)]),
    fetchGroupSummaries(supabase, labels.flatMap((l) => (l.kind === "group" ? [l.groupId] : []))),
    familyNames(supabase, labels.flatMap((l) => (l.kind === "family_space" ? [l.spaceId] : []))),
  ]);
  const unknown = feedScreenCopy.unknownAuthor;

  return items.map((raw, i) => {
    const item = sign(raw);
    const l = labels[i]!;
    let label: EntryLabel;
    if (item.placement === "suggested") label = { kind: "suggested" };
    else if (l.kind === "group" && groups.get(l.groupId)) {
      const g = groups.get(l.groupId)!;
      label = { kind: "group", name: g.name, color: g.color, icon: g.icon, targetId: l.groupId };
    } else if (l.kind === "family_space" && families.get(l.spaceId)) {
      label = { kind: "family_space", name: families.get(l.spaceId)!, color: null, icon: null, targetId: l.spaceId };
    } else label = l.kind === "public" ? { kind: "public" } : { kind: "followers" };

    const q = quotes[i];
    const quote: EntryQuote | null = !q
      ? null
      : q.state === "available"
        ? { state: "available", post: sign(q.post), authorName: names.get(q.post.authorId) ?? unknown }
        : { state: "unavailable" };

    return {
      item,
      authorName: names.get(item.authorId) ?? unknown,
      label,
      quote,
      uploaderMedia:
        item.authorId === viewer.userId
          ? resolveUploaderMediaViews(
              item.media.map((m) => ({ id: m.id, classification: m.classification })),
              viewer.gender
            )
          : null,
    };
  });
}

export async function createFeedApi(supabase: SupabaseClient, userId: string, linkBaseUrl: string): Promise<FeedApi> {
  const viewer = await buildViewerContext(supabase, userId);
  let groupRows: Promise<Array<{ id: string; name: string; visibility: GroupVisibility }>> | null = null;
  const myGroups = () =>
    (groupRows ??= (async () => {
      const ids = [...viewer.groupMemberships];
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("groups").select("id, name, visibility").in("id", ids);
      if (error) throw new Error(`myGroups: ${error.message}`);
      return (data ?? []) as Array<{ id: string; name: string; visibility: GroupVisibility }>;
    })());

  return {
    viewer,
    async loadPage(seed, cursor) {
      const page = await fetchFeedPage(supabase, { seed, cursor });
      return { entries: await hydrateEntries(supabase, viewer, page.items), cursor: page.nextCursor };
    },
    async loadSpaces(seed) {
      const cards = await fetchSpacesRail(supabase, { seed });
      const byId = await signed(supabase, cards.flatMap((c) => c.latestPost?.media ?? []));
      const names = await namesOf(supabase, cards.flatMap((c) => (c.latestPost ? [c.latestPost.authorId] : [])));
      return cards.map((c) => ({
        id: c.spaceId,
        kind: c.spaceKind,
        name: c.name,
        color: c.color,
        icon: c.icon,
        previewText: c.latestPost?.text ?? "",
        media: c.latestPost?.media[0] ? (byId.get(c.latestPost.media[0].id) ?? c.latestPost.media[0]) : null,
        lastAuthor: c.latestPost ? (names.get(c.latestPost.authorId) ?? feedScreenCopy.unknownAuthor) : "",
        publishedAt: c.latestPost?.publishedAt ?? null,
      }));
    },
    async loadSuggestions(seed) {
      return (await fetchFollowSuggestions(supabase, { seed })).map((s) => ({ userId: s.userId, name: s.displayName }));
    },
    async loadPinned(sinceIso) {
      const items = await fetchOwnRecentPosts(supabase, { since: sinceIso, limit: 5 });
      return hydrateEntries(supabase, viewer, items);
    },
    setLiked: (postId, liked) => (liked ? likePost(supabase, userId, postId) : unlikePost(supabase, userId, postId)),
    setSaved: (postId, saved) => (saved ? savePost(supabase, userId, postId) : unsavePost(supabase, userId, postId)),
    mute: (authorId) => muteUser(supabase, userId, authorId),
    feedback: (authorId, kind) => sendSuggestionFeedback(supabase, userId, authorId, kind),
    report: (postId, categoryIndex, details) =>
      reportContent(supabase, {
        reporterId: userId,
        targetType: "post",
        targetId: postId,
        category: REPORT_CATEGORY_ORDER[categoryIndex] ?? "other",
        explanation: details.trim() || null,
      }),
    async follow(followedId) {
      const { error } = await supabase.from("follows").insert({ follower_id: userId, followed_id: followedId });
      if (error && error.code !== UNIQUE_VIOLATION) throw new Error(`follow: ${error.message}`);
    },
    setFollowedOnly: (on) => updateFilterSettings(supabase, userId, { showSuggestedPosts: !on }),
    copyLinkFor: (item) => getCopyLink(viewer, item, linkBaseUrl),
    async shareTargetFor(item) {
      const ctx = postContextOf(item);
      if (!ctx) return null;
      const groups = await myGroups();
      const vis = new Map(groups.map((g) => [g.id, g.visibility]));
      // Prefer the post's own group, then the viewer's others, in the order the API returned them.
      const ordered = [...groups].sort((a, b) => Number(b.id === item.sourceGroupId) - Number(a.id === item.sourceGroupId));
      const hit = ordered.find((g) => canSharePostInternally(viewer, ctx, g.id, vis));
      return hit ? { groupId: hit.id, name: hit.name } : null;
    },
    async shareToGroup(item, groupId) {
      await shareToGroup(supabase, { authorId: userId, quotedPostId: item.id, groupId });
    },
    removeMedia: (mediaId) => removeMedia(supabase, mediaId),
    async appeal(mediaId) {
      await appealClassification(supabase, mediaId);
    },
  };
}
