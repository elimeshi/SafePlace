import { describe, expect, it } from "vitest";
import type { FeedItem, UploaderMediaView } from "@safeplace/api-client";
import { feedReducer, initialFeedState, visibleEntries, type FeedState } from "../reducer";
import { COLLAPSE_AT, nextCollapsed, shouldShowFollowRail } from "../scroll";
import { relativeTime } from "../time";
import { primaryMedia, sourceProps, stripKindOf, toCardProps } from "../viewModel";
import type { FeedEntry } from "../types";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

function entry(id: string, over: Partial<FeedItem> = {}, e: Partial<FeedEntry> = {}): FeedEntry {
  const item: FeedItem = {
    id,
    authorId: "a1",
    text: "שלום",
    sourceKind: "profile",
    sourceGroupId: null,
    sourceSpaceId: null,
    locationTag: null,
    quotedPostId: null,
    createdAt: minsAgo(5),
    publishedAt: minsAgo(5),
    audiences: [{ kind: "public" }],
    media: [],
    stats: { likeCount: 2, commentCount: 1, viewerLiked: false, viewerSaved: false },
    placement: "followed",
    sortKey: id,
    ...over,
  };
  return { item, authorName: "משה", label: { kind: "public" }, quote: null, uploaderMedia: null, ...e };
}

const ready = (entries: FeedEntry[]): FeedState => ({ ...initialFeedState("s1"), phase: "ready", entries });
const isIcon = (s: string): s is "home" => s === "home";

describe("feedReducer", () => {
  it("loads, paginates without duplicates, and treats a null cursor as the end", () => {
    let s = feedReducer(initialFeedState("s1"), { type: "loaded", seed: "s1", entries: [entry("1"), entry("2")], cursor: { key: "k", id: "2" } });
    expect(s.phase).toBe("ready");
    expect(s.end).toBe(false);
    s = feedReducer(s, { type: "moreLoaded", entries: [entry("2"), entry("3")], cursor: null });
    expect(s.entries.map((e) => e.item.id)).toEqual(["1", "2", "3"]);
    expect(s.end).toBe(true);
  });

  it("a failed first load is the error state, a failed refresh keeps the feed, retry returns to the skeleton", () => {
    const failed = feedReducer(initialFeedState("s1"), { type: "failed" });
    expect(failed.phase).toBe("error");
    expect(feedReducer(failed, { type: "refreshStart", seed: "s2" }).phase).toBe("loading");
    const kept = feedReducer(ready([entry("1")]), { type: "failed" });
    expect(kept.phase).toBe("ready");
  });

  it("refresh swaps in the new seed's page wholesale", () => {
    const s = feedReducer(ready([entry("1")]), { type: "refreshStart", seed: "s2" });
    expect(s.seed).toBe("s2");
    const r = feedReducer(s, { type: "loaded", seed: "s2", entries: [entry("9")], cursor: null });
    expect(r.entries.map((e) => e.item.id)).toEqual(["9"]);
    expect(r.refreshing).toBe(false);
  });

  it("like toggles optimistically and is its own inverse (number only, never below 0)", () => {
    const s0 = ready([entry("1")]);
    const s1 = feedReducer(s0, { type: "toggleLike", postId: "1" });
    expect(s1.entries[0]!.item.stats).toMatchObject({ viewerLiked: true, likeCount: 3 });
    expect(feedReducer(s1, { type: "toggleLike", postId: "1" })).toEqual(s0);
    const zero = ready([entry("1", { stats: { likeCount: 0, commentCount: 0, viewerLiked: true, viewerSaved: false } })]);
    expect(feedReducer(zero, { type: "toggleLike", postId: "1" }).entries[0]!.item.stats!.likeCount).toBe(0);
  });

  it("save toggles", () => {
    const s = feedReducer(ready([entry("1")]), { type: "toggleSave", postId: "1" });
    expect(s.entries[0]!.item.stats!.viewerSaved).toBe(true);
  });

  it("mute removes every post of the author; dont-suggest / less-like-this only their suggested ones", () => {
    const base = ready([entry("1"), entry("2", { placement: "suggested" }), entry("3", { authorId: "a2" })]);
    expect(feedReducer(base, { type: "removeAuthor", authorId: "a1", onlySuggested: false }).entries.map((e) => e.item.id)).toEqual(["3"]);
    expect(feedReducer(base, { type: "removeAuthor", authorId: "a1", onlySuggested: true }).entries.map((e) => e.item.id)).toEqual(["1", "3"]);
  });

  it("turning suggestions off drops suggested posts", () => {
    const s = feedReducer(ready([entry("1"), entry("2", { placement: "suggested" })]), { type: "dropSuggested" });
    expect(s.entries.map((e) => e.item.id)).toEqual(["1"]);
  });

  it("pins a just-published post above the random order, once", () => {
    let s = ready([entry("1"), entry("2")]);
    s = feedReducer(s, { type: "pin", entries: [entry("2")] });
    s = feedReducer(s, { type: "pin", entries: [entry("2")] });
    expect(s.pinned).toHaveLength(1);
    expect(visibleEntries(s).map((e) => e.item.id)).toEqual(["2", "1"]);
  });

  it("removing media clears it and its uploader state", () => {
    const um: UploaderMediaView[] = [{ id: "m1", classification: "general", state: "published", foundGroups: [] }];
    const e = entry("1", { media: [{ id: "m1", classification: "general", filtered: false, redacted: false, levels: null, storagePath: "p", url: "u" }] }, { uploaderMedia: um });
    const s = feedReducer(ready([e]), { type: "mediaRemoved", postId: "1", mediaId: "m1" });
    expect(s.entries[0]!.item.media).toEqual([]);
    expect(s.entries[0]!.uploaderMedia).toEqual([]);
  });
});

describe("scroll rules", () => {
  it("collapses once scrolling clearly starts and only expands at the top", () => {
    expect(nextCollapsed(false, COLLAPSE_AT + 1)).toBe(true);
    expect(nextCollapsed(true, 10)).toBe(true);
    expect(nextCollapsed(false, 10)).toBe(false);
    expect(nextCollapsed(true, 0)).toBe(false);
    expect(nextCollapsed(true, -30)).toBe(false);
  });

  it("shows the follow rail within 3 posts of the end, unless dismissed or empty", () => {
    const base = { count: 10, dismissed: false, hasSuggestions: true };
    expect(shouldShowFollowRail({ ...base, lastVisibleIndex: 6 })).toBe(false);
    expect(shouldShowFollowRail({ ...base, lastVisibleIndex: 7 })).toBe(true);
    expect(shouldShowFollowRail({ ...base, lastVisibleIndex: 9, dismissed: true })).toBe(false);
    expect(shouldShowFollowRail({ ...base, lastVisibleIndex: 9, hasSuggestions: false })).toBe(false);
    expect(shouldShowFollowRail({ ...base, count: 0, lastVisibleIndex: 0 })).toBe(false);
  });
});

describe("relativeTime", () => {
  it("formats like the lab", () => {
    expect(relativeTime(minsAgo(0.1), NOW)).toBe("עכשיו");
    expect(relativeTime(minsAgo(20.5), NOW)).toBe("לפני 20 דק׳");
    expect(relativeTime(minsAgo(61), NOW)).toBe("לפני שעה");
    expect(relativeTime(minsAgo(121), NOW)).toBe("לפני שעתיים");
    expect(relativeTime(minsAgo(241), NOW)).toBe("לפני 4 שעות");
    expect(relativeTime(minsAgo(25 * 60), NOW)).toBe("אתמול");
    expect(relativeTime(minsAgo(72 * 60), NOW)).toBe("לפני 3 ימים");
    expect(relativeTime(null, NOW)).toBe("");
  });
});

describe("view model", () => {
  const filteredMedia = { id: "m", classification: "contains_women" as const, filtered: true, redacted: false, levels: null, storagePath: null, url: null };
  const okMedia = { id: "m", classification: "general" as const, filtered: false, redacted: false, levels: null, storagePath: "p", url: "https://x/y.jpg" };

  it("a filtered media view yields the placeholder and never a url", () => {
    expect(primaryMedia([filteredMedia])).toEqual({ filtered: true, url: null, hasMedia: true });
    expect(primaryMedia([okMedia])).toEqual({ filtered: false, url: "https://x/y.jpg", hasMedia: true });
    expect(primaryMedia([])).toEqual({ filtered: false, url: null, hasMedia: false });
  });

  it("maps a card: counts, flags, time, source", () => {
    const e = entry("1", { media: [filteredMedia], locationTag: "נחל שורק" }, { label: { kind: "group", name: "רמות", color: "#2E3A8C", icon: "home", targetId: "g" } });
    const c = toCardProps(e, [], { now: NOW, isIcon });
    expect(c.filtered).toBe(true);
    expect(c.data).toMatchObject({ likes: 2, comments: 1, liked: false, location: "נחל שורק", time: "לפני 5 דק׳" });
    expect(c.data.source).toMatchObject({ kind: "group", name: "רמות", icon: "home" });
    expect(c.data.media).toBeUndefined();
  });

  it("unknown group icons fall back to the component default", () => {
    expect(sourceProps({ kind: "group", name: "x", color: null, icon: "zzz", targetId: "g" }, { now: NOW, isIcon }).icon).toBeUndefined();
  });

  it("folds long posts only", () => {
    expect(toCardProps(entry("1", { text: "א".repeat(301) }), [], { now: NOW, isIcon }).foldable).toBe(true);
    expect(toCardProps(entry("1"), [], { now: NOW, isIcon }).foldable).toBe(false);
  });

  it("state strips: processing > review > notice; dismissed notice and others' posts show none", () => {
    const own = (states: UploaderMediaView["state"][]) =>
      entry("1", {}, { uploaderMedia: states.map((state, i) => ({ id: `m${i}`, classification: "general", state, foundGroups: [] })) });
    expect(stripKindOf(own(["published", "processing"]), [])).toBe("processing");
    expect(stripKindOf(own(["under_review"]), [])).toBe("review");
    expect(stripKindOf(own(["filtered_for_some_viewers"]), [])).toBe("notice");
    expect(stripKindOf(own(["filtered_for_some_viewers"]), ["1"])).toBeNull();
    expect(stripKindOf(own(["published"]), [])).toBeNull();
    expect(stripKindOf(entry("2"), [])).toBeNull();
  });
});
