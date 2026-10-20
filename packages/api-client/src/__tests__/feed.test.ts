import { describe, expect, it } from "vitest";
import {
  fetchFeedPage,
  fetchFollowSuggestions,
  fetchPost,
  fetchQuotedPost,
  fetchSpacesRail,
  newFeedSeed,
  postContextOf,
  resolveMediaUrls,
  resolveSourceLabel,
  toMediaView,
  type PostItem,
} from "../feed";
import { mockClient, rpcArgs } from "./mock-client";

const row = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  author_id: "a1",
  text: "t",
  source_kind: "profile",
  source_group_id: null,
  source_space_id: null,
  location_tag: null,
  quoted_post_id: null,
  created_at: "2026-01-01",
  published_at: "2026-01-01",
  placement: "followed",
  sort_key: `k${id}`,
  audiences: [{ kind: "public", group_id: null, space_id: null }],
  media: [
    { id: "m1", classification: "contains_women", storage_path: null, is_filtered: true },
    { id: "m2", classification: "general", storage_path: "u/x", is_filtered: false },
  ],
  ...extra,
});

describe("feed", () => {
  it("newFeedSeed differs per call", () => {
    expect(newFeedSeed()).not.toBe(newFeedSeed());
  });

  it("fetchFeedPage passes the seed + cursor, merges stats, and never exposes a filtered path", async () => {
    const { client, calls } = mockClient((c) =>
      c.target === "rpc:feed_page"
        ? { data: [row("p1"), row("p2", { placement: "suggested" })] }
        : { data: [{ post_id: "p1", like_count: 3, comment_count: 2, viewer_liked: true, viewer_saved: false }] }
    );
    const page = await fetchFeedPage(client, { seed: "s", cursor: { key: "k0", id: "p0" }, limit: 2 });
    expect(rpcArgs(calls[0])).toMatchObject({ p_seed: "s", p_after_key: "k0", p_after_id: "p0", p_limit: 2 });
    expect(page.items.map((i) => i.placement)).toEqual(["followed", "suggested"]);
    expect(page.items[0]!.stats).toEqual({ likeCount: 3, commentCount: 2, viewerLiked: true, viewerSaved: false });
    expect(page.items[1]!.stats).toBeNull();
    expect(page.items[0]!.media[0]).toMatchObject({ filtered: true, storagePath: null });
    expect(page.items[0]!.media[1]).toMatchObject({ filtered: false, storagePath: "u/x" });
    expect(page.nextCursor).toEqual({ key: "kp2", id: "p2" });
  });

  it("a short page ends the feed", async () => {
    const { client } = mockClient((c) => (c.target === "rpc:feed_page" ? { data: [row("p1")] } : { data: [] }));
    expect((await fetchFeedPage(client, { seed: "s" })).nextCursor).toBeNull();
  });

  it("surfaces rpc errors", async () => {
    const { client } = mockClient(() => ({ error: { message: "boom" } }));
    await expect(fetchFeedPage(client, { seed: "s" })).rejects.toThrow("fetchFeedPage: boom");
  });

  it("toMediaView drops a path that arrives with is_filtered", () => {
    expect(
      toMediaView({ id: "m", classification: "contains_women", storage_path: "leak", is_filtered: true }).storagePath
    ).toBeNull();
  });

  it("resolveMediaUrls signs only unfiltered media", async () => {
    const { client } = mockClient();
    const views = [
      toMediaView({ id: "m1", classification: "contains_women", storage_path: null, is_filtered: true }),
      toMediaView({ id: "m2", classification: "general", storage_path: "u/x", is_filtered: false }),
    ];
    const out = await resolveMediaUrls(client, views);
    expect(out.map((v) => v.url)).toEqual([null, "signed://u/x"]);
  });

  it("fetchSpacesRail and fetchFollowSuggestions map rows", async () => {
    const rail = mockClient(() => ({
      data: [
        { space_kind: "group", space_id: "g", name: "n", color: "#fff", icon: "i", latest_post_id: "p", latest_text: "x", latest_author_id: "a", latest_published_at: "d", latest_media: [] },
        { space_kind: "family_space", space_id: "f", name: "n", color: null, icon: "family", latest_post_id: null, latest_text: null, latest_author_id: null, latest_published_at: null, latest_media: null },
      ],
    }));
    const cards = await fetchSpacesRail(rail.client, { seed: "s" });
    expect(rpcArgs(rail.calls[0])).toEqual({ p_seed: "s", p_limit: 20 });
    expect(cards[0]!.latestPost?.id).toBe("p");
    expect(cards[1]!.latestPost).toBeNull();

    const sug = mockClient(() => ({ data: [{ user_id: "u", display_name: "D", avatar_media_id: null, reason: "engaged" }] }));
    expect(await fetchFollowSuggestions(sug.client, { seed: "s" })).toEqual([
      { userId: "u", displayName: "D", avatarMediaId: null, reason: "engaged" },
    ]);
  });

  it("fetchPost returns null when RLS hides the post; fetchQuotedPost reads 'unavailable'", async () => {
    const { client } = mockClient(() => ({ data: null }));
    expect(await fetchPost(client, "p")).toBeNull();
    expect(await fetchQuotedPost(client, "p")).toEqual({ state: "unavailable" });
    expect(await fetchQuotedPost(client, null)).toEqual({ state: "unavailable" });
  });

  it("fetchPost assembles audiences, media and stats; fetchQuotedPost is available", async () => {
    const { client } = mockClient((c) => {
      if (c.target === "from:posts") return { data: { ...row("p"), audiences: undefined, media: undefined } };
      if (c.target === "from:post_audiences") return { data: [{ kind: "group", group_id: "g", space_id: null }] };
      if (c.target === "rpc:post_media_json") return { data: [{ id: "m", classification: "general", storage_path: "x", is_filtered: false }] };
      return { data: [{ post_id: "p", like_count: 1, comment_count: 0, viewer_liked: false, viewer_saved: true }] };
    });
    const q = await fetchQuotedPost(client, "p");
    expect(q.state).toBe("available");
    if (q.state === "available") {
      expect(q.post.audiences).toEqual([{ kind: "group", groupId: "g" }]);
      expect(q.post.media).toHaveLength(1);
      expect(q.post.stats?.viewerSaved).toBe(true);
    }
  });
});

describe("resolveSourceLabel", () => {
  const base: Pick<PostItem, "authorId" | "sourceKind" | "sourceGroupId" | "sourceSpaceId" | "audiences"> = {
    authorId: "a",
    sourceKind: "profile",
    sourceGroupId: null,
    sourceSpaceId: null,
    audiences: [],
  };
  it("entry point wins", () => {
    expect(resolveSourceLabel(base, "v", { kind: "group", groupId: "g" })).toEqual({ kind: "group", groupId: "g" });
    expect(resolveSourceLabel(base, "v", { kind: "family_space", spaceId: "f" })).toEqual({ kind: "family_space", spaceId: "f" });
  });
  it("source group / space", () => {
    expect(resolveSourceLabel({ ...base, sourceKind: "group", sourceGroupId: "g" }, "v")).toEqual({ kind: "group", groupId: "g" });
    expect(resolveSourceLabel({ ...base, sourceKind: "family_space", sourceSpaceId: "f" }, "v")).toEqual({ kind: "family_space", spaceId: "f" });
  });
  it("profile: public, first group, else followers", () => {
    expect(resolveSourceLabel({ ...base, audiences: [{ kind: "public" }] }, "v")).toEqual({ kind: "public" });
    expect(
      resolveSourceLabel({ ...base, audiences: [{ kind: "followers_only" }, { kind: "group", groupId: "g1" }, { kind: "group", groupId: "g2" }] }, "v")
    ).toEqual({ kind: "group", groupId: "g1" });
    expect(resolveSourceLabel({ ...base, audiences: [{ kind: "followers_only" }] }, "v")).toEqual({ kind: "followers" });
  });
  it("the author sees the first audience they picked", () => {
    expect(
      resolveSourceLabel({ ...base, audiences: [{ kind: "group", groupId: "g1" }, { kind: "followers_only" }] }, "a")
    ).toEqual({ kind: "group", groupId: "g1" });
    expect(
      resolveSourceLabel({ ...base, audiences: [{ kind: "followers_only" }, { kind: "group", groupId: "g1" }] }, "a")
    ).toEqual({ kind: "followers" });
  });
});

describe("postContextOf", () => {
  it("fails closed on no audiences and fills authorId for followers_only", () => {
    const item = { id: "p", authorId: "a", sourceKind: "profile", audiences: [] } as unknown as PostItem;
    expect(postContextOf(item)).toBeNull();
    expect(postContextOf({ ...item, audiences: [{ kind: "followers_only" }] })?.exposure[0]).toEqual({
      kind: "followers_only",
      authorId: "a",
    });
  });
});
