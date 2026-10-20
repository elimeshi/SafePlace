import { describe, expect, it } from "vitest";
import { addComment, addReply, fetchComments } from "../comments";
import { mockClient, opsOf } from "./mock-client";

const c = (id: string, parent: string | null = null) => ({
  id,
  post_id: "p",
  author_id: "a",
  parent_comment_id: parent,
  reply_to_user_id: parent ? "b" : null,
  text: id,
  created_at: `2026-01-0${id.length}`,
  edited_at: null,
});

describe("fetchComments", () => {
  it("builds two-level threads with stats and filtered media", async () => {
    const { client, calls } = mockClient((call) => {
      if (call.target === "from:comments") {
        return opsOf(call, "is").length > 0 ? { data: [c("t1"), c("t2")] } : { data: [c("r1", "t1"), c("r2", "t1")] };
      }
      if (call.target === "rpc:comment_stats") return { data: [{ comment_id: "t1", like_count: 4, viewer_liked: true }] };
      return { data: [{ id: "m", comment_id: "r1", classification: "contains_women", storage_path: null, is_filtered: true }] };
    });
    const page = await fetchComments(client, "p", { limit: 2, cursor: { createdAt: "2026-01-01", id: "x" } });
    expect(opsOf(calls[0], "limit")[0]).toEqual([2]);
    expect(String(opsOf(calls[0], "or")[0][0])).toContain("created_at.gt.2026-01-01");
    expect(page.threads.map((t) => t.comment.id)).toEqual(["t1", "t2"]);
    expect(page.threads[0]!.replies.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(page.threads[0]!.comment).toMatchObject({ likeCount: 4, viewerLiked: true });
    expect(page.threads[0]!.replies[0]!.media[0]).toMatchObject({ filtered: true, storagePath: null });
    expect(page.threads[1]!.replies).toEqual([]);
    expect(page.nextCursor).toEqual({ createdAt: "2026-01-02", id: "t2" });
  });

  it("an empty page has no cursor and skips the extra queries", async () => {
    const { client, calls } = mockClient(() => ({ data: [] }));
    expect(await fetchComments(client, "p")).toEqual({ threads: [], nextCursor: null });
    expect(calls).toHaveLength(1);
  });

  it("surfaces errors", async () => {
    const { client } = mockClient(() => ({ error: { message: "x" } }));
    await expect(fetchComments(client, "p")).rejects.toThrow("fetchComments: x");
  });
});

describe("addComment / addReply", () => {
  it("inserts without reply_to_user_id (derived by the DB) and attaches media unclassified", async () => {
    const { client, calls } = mockClient((call) =>
      call.target === "from:comments" ? { data: { id: "c1" } } : { data: [{ id: "m1" }] }
    );
    const out = await addReply(client, {
      authorId: "u",
      postId: "p",
      text: "hi",
      parentCommentId: "c0",
      media: [{ storagePath: "u/x", contentType: "image/jpeg" }],
    });
    expect(out).toEqual({ commentId: "c1", mediaIds: ["m1"] });
    expect(opsOf(calls[0], "insert")[0][0]).toEqual({ author_id: "u", post_id: "p", parent_comment_id: "c0", text: "hi" });
    const media = (opsOf(calls[1], "insert")[0][0] as Array<Record<string, unknown>>)[0];
    expect(media).toMatchObject({ comment_id: "c1", uploader_id: "u", storage_path: "u/x" });
    expect(media).not.toHaveProperty("classification");
  });

  it("rejects an empty comment and surfaces insert errors", async () => {
    const { client } = mockClient();
    await expect(addComment(client, { authorId: "u", postId: "p", text: "  " })).rejects.toThrow("needs text or media");
    const bad = mockClient(() => ({ error: { message: "rls" } }));
    await expect(addComment(bad.client, { authorId: "u", postId: "p", text: "x" })).rejects.toThrow("addComment: rls");
  });
});
