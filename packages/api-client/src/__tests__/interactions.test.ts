import { describe, expect, it } from "vitest";
import { resolveDefaultFilterSettings, type Viewer } from "@safeplace/visibility-policy";
import {
  buildPostLink,
  dismissFollowSuggestion,
  getCopyLink,
  likeComment,
  likePost,
  muteUser,
  savePost,
  sendSuggestionFeedback,
  unlikeComment,
  unlikePost,
  unmuteUser,
  unsavePost,
} from "../interactions";
import type { PostItem } from "../feed";
import { mockClient, opsOf } from "./mock-client";
import type { SupabaseClient } from "@supabase/supabase-js";

type Fn = (c: SupabaseClient) => Promise<void>;

describe("interactions", () => {
  const adds: Array<[string, Fn, string, Record<string, unknown>]> = [
    ["likePost", (c) => likePost(c, "u", "p"), "post_likes", { post_id: "p", user_id: "u" }],
    ["likeComment", (c) => likeComment(c, "u", "c"), "comment_likes", { comment_id: "c", user_id: "u" }],
    ["savePost", (c) => savePost(c, "u", "p"), "post_saves", { post_id: "p", user_id: "u" }],
    ["muteUser", (c) => muteUser(c, "u", "t"), "user_mutes", { muter_id: "u", muted_id: "t" }],
    ["less_like_this", (c) => sendSuggestionFeedback(c, "u", "t", "less_like_this"), "suggestion_feedback", { viewer_id: "u", target_user_id: "t", kind: "less_like_this" }],
    ["dismiss", (c) => dismissFollowSuggestion(c, "u", "t"), "suggestion_feedback", { viewer_id: "u", target_user_id: "t", kind: "dont_suggest" }],
  ];
  it.each(adds)("%s inserts the owner row and tolerates a duplicate", async (_n, fn, table, row) => {
    const { client, calls } = mockClient();
    await fn(client);
    expect(calls[0].target).toBe(`from:${table}`);
    expect(opsOf(calls[0], "insert")[0][0]).toEqual(row);
    const dup = mockClient(() => ({ error: { message: "dup", code: "23505" } }));
    await expect(fn(dup.client)).resolves.toBeUndefined();
    const bad = mockClient(() => ({ error: { message: "rls", code: "42501" } }));
    await expect(fn(bad.client)).rejects.toThrow("rls");
  });

  const removes: Array<[string, Fn, string, unknown[][]]> = [
    ["unlikePost", (c) => unlikePost(c, "u", "p"), "post_likes", [["post_id", "p"], ["user_id", "u"]]],
    ["unlikeComment", (c) => unlikeComment(c, "u", "c"), "comment_likes", [["comment_id", "c"], ["user_id", "u"]]],
    ["unsavePost", (c) => unsavePost(c, "u", "p"), "post_saves", [["post_id", "p"], ["user_id", "u"]]],
    ["unmuteUser", (c) => unmuteUser(c, "u", "t"), "user_mutes", [["muter_id", "u"], ["muted_id", "t"]]],
  ];
  it.each(removes)("%s deletes by key and surfaces errors", async (_n, fn, table, eqs) => {
    const { client, calls } = mockClient();
    await fn(client);
    expect(calls[0].target).toBe(`from:${table}`);
    expect(opsOf(calls[0], "delete")).toHaveLength(1);
    expect(opsOf(calls[0], "eq")).toEqual(eqs);
    const bad = mockClient(() => ({ error: { message: "nope" } }));
    await expect(fn(bad.client)).rejects.toThrow("nope");
  });
});

describe("copy link", () => {
  const viewer = {
    userId: "v",
    gender: "male",
    filterSettings: resolveDefaultFilterSettings("male"),
    following: new Set(),
    blockedUsers: new Set(),
    blockedByUsers: new Set(),
    mutedUsers: new Set(),
    suppressedUsers: new Set(),
    suppressedSuggestions: new Set(),
    groupMemberships: new Set(),
    familySpaceMemberships: new Set(),
  } as unknown as Viewer;
  const post = (audiences: PostItem["audiences"]) =>
    ({ id: "p 1", authorId: "a", sourceKind: "profile", audiences }) as unknown as PostItem;

  it("buildPostLink trims slashes and encodes", () => {
    expect(buildPostLink("https://x.app//", "p 1")).toBe("https://x.app/post/p%201");
  });
  it("only public posts get a link", () => {
    expect(getCopyLink(viewer, post([{ kind: "public" }]), "https://x.app")).toBe("https://x.app/post/p%201");
    expect(getCopyLink(viewer, post([{ kind: "group", groupId: "g" }]), "https://x.app")).toBeNull();
    expect(getCopyLink(viewer, post([]), "https://x.app")).toBeNull();
  });
});
