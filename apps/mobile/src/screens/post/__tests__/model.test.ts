import { describe, expect, it } from "vitest";
import type { Comment, CommentThread, MediaView } from "@safeplace/api-client";
import {
  commentsReducer,
  emptyComments,
  formatRelativeTime,
  hasUnsettledMedia,
  mentionFor,
  ownMediaStrip,
  presentMedia,
  rootOf,
  toggleLiked,
} from "../model";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

const cm = (id: string, over: Partial<Comment> = {}): Comment => ({
  id,
  postId: "p",
  authorId: "a-" + id,
  parentCommentId: null,
  replyToUserId: null,
  text: id,
  createdAt: minsAgo(1),
  editedAt: null,
  likeCount: 0,
  viewerLiked: false,
  media: [],
  ...over,
});

const mv = (id: string, classification: MediaView["classification"], over: Partial<MediaView> = {}): MediaView => ({
  id,
  classification,
  filtered: false,
  redacted: false,
  storagePath: null,
  url: "u",
  ...over,
});

describe("formatRelativeTime", () => {
  it("matches the lab wording", () => {
    expect(formatRelativeTime(minsAgo(0.2), NOW)).toBe("עכשיו");
    expect(formatRelativeTime(minsAgo(40), NOW)).toBe("לפני 40 דק׳");
    expect(formatRelativeTime(minsAgo(65), NOW)).toBe("לפני שעה");
    expect(formatRelativeTime(minsAgo(125), NOW)).toBe("לפני שעתיים");
    expect(formatRelativeTime(minsAgo(4 * 60 + 5), NOW)).toBe("לפני 4 שעות");
    expect(formatRelativeTime(minsAgo(26 * 60), NOW)).toBe("אתמול");
    expect(formatRelativeTime(minsAgo(3 * 24 * 60), NOW)).toBe("לפני 3 ימים");
    expect(formatRelativeTime(null, NOW)).toBe("");
  });
});

describe("toggleLiked", () => {
  it("is a number and a flag, never below zero", () => {
    expect(toggleLiked({ liked: false, likes: 0 })).toEqual({ liked: true, likes: 1 });
    expect(toggleLiked({ liked: true, likes: 1 })).toEqual({ liked: false, likes: 0 });
    expect(toggleLiked({ liked: true, likes: 0 }).likes).toBe(0);
  });
});

describe("commentsReducer", () => {
  const root = cm("c1");
  const reply = cm("r1", { parentCommentId: "c1" });
  const seeded = commentsReducer(emptyComments, {
    type: "page",
    threads: [{ comment: root, replies: [reply] }],
    nextCursor: { createdAt: "x", id: "c1" },
  });

  it("appends pages without duplicating a thread", () => {
    const next = commentsReducer(seeded, {
      type: "page",
      threads: [{ comment: root, replies: [] }, { comment: cm("c2"), replies: [] }],
      nextCursor: null,
    });
    expect(next.threads.map((t) => t.comment.id)).toEqual(["c1", "c2"]);
    expect(next.nextCursor).toBeNull();
  });

  it("adds a top-level comment at the bottom and a reply inside its thread", () => {
    const a = commentsReducer(seeded, { type: "added", comment: cm("c3") });
    expect(a.threads.at(-1)?.comment.id).toBe("c3");
    const b = commentsReducer(seeded, { type: "added", comment: cm("r2", { parentCommentId: "c1" }) });
    expect(b.threads[0]?.replies.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("toggles a comment like on a reply", () => {
    const n = commentsReducer(seeded, { type: "liked", commentId: "r1" });
    expect(n.threads[0]?.replies[0]).toMatchObject({ viewerLiked: true, likeCount: 1 });
  });

  it("hides a muted author's comments and replies", () => {
    const n = commentsReducer(seeded, { type: "hideAuthor", userId: "a-r1" });
    expect(n.threads[0]?.replies).toHaveLength(0);
    expect(commentsReducer(seeded, { type: "hideAuthor", userId: "a-c1" }).threads).toHaveLength(0);
  });

  it("swaps a comment's media as classification resolves", () => {
    const n = commentsReducer(seeded, { type: "media", commentId: "c1", media: [mv("m", "general")] });
    expect(n.threads[0]?.comment.media[0]?.classification).toBe("general");
  });
});

describe("thread helpers", () => {
  const threads: CommentThread[] = [{ comment: cm("c1"), replies: [cm("r1", { parentCommentId: "c1", replyToUserId: "someone" })] }];
  it("a reply to a reply lands under the thread root (two levels)", () => {
    expect(rootOf(threads, "r1")).toBe("c1");
    expect(rootOf(threads, "c1")).toBe("c1");
    expect(rootOf(threads, "zzz")).toBeNull();
  });
  it("the @ mention is the replied-to user, else the root's author", () => {
    const names = { someone: "דני", "a-c1": "שרה" };
    const [t] = threads;
    expect(mentionFor(t!.replies[0]!, t!.comment, names)).toBe("דני");
    expect(mentionFor(cm("r2", { parentCommentId: "c1" }), t!.comment, names)).toBe("שרה");
  });
});

describe("ownMediaStrip (three-tier outcome, through visibility-policy)", () => {
  it("unclassified -> processing", () => {
    expect(ownMediaStrip([mv("1", "unclassified")], "male").kind).toBe("processing");
  });
  it("pending_review -> under review", () => {
    expect(ownMediaStrip([mv("1", "pending_review")], "female").kind).toBe("review");
  });
  it("general -> nothing", () => {
    expect(ownMediaStrip([mv("1", "general")], "male").kind).toBe("none");
  });
  it("contains_women -> the notice for a male uploader, with its media id", () => {
    expect(ownMediaStrip([mv("1", "contains_women")], "male")).toEqual({ kind: "notice", mediaId: "1" });
  });
  it("contains_women -> no notice for a female uploader (an open question, not answered in code)", () => {
    expect(ownMediaStrip([mv("1", "contains_women")], "female").kind).toBe("none");
  });
  it("an acknowledged notice is not shown again", () => {
    expect(ownMediaStrip([mv("1", "contains_women")], "male", new Set(["1"])).kind).toBe("none");
  });
  it("the most important state across several items wins", () => {
    expect(ownMediaStrip([mv("1", "unclassified"), mv("2", "contains_women")], "male").kind).toBe("notice");
  });
});

describe("media presentation", () => {
  it("shows an image when the API served a URL", () => {
    expect(presentMedia([mv("1", "general")], false)).toEqual({ kind: "image", url: "u" });
  });
  it("never shows a withheld item: filtered / no path -> placeholder", () => {
    expect(presentMedia([mv("1", "contains_women", { filtered: true, url: null })], false).kind).toBe("filtered");
    expect(presentMedia([mv("1", "general", { url: null })], false).kind).toBe("filtered");
  });
  it("another viewer's unclassified media reads as processing, the author's does not", () => {
    const m = mv("1", "unclassified", { filtered: true, url: null });
    expect(presentMedia([m], false).processing).toBe(true);
    expect(presentMedia([m], true).processing).toBe(false);
  });
  it("tracks unsettled media for polling", () => {
    expect(hasUnsettledMedia([mv("1", "unclassified")])).toBe(true);
    expect(hasUnsettledMedia([mv("1", "general")])).toBe(false);
  });
});
