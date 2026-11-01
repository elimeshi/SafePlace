/**
 * @safeplace/api-client wrappers run against the real migrations (PGlite) as
 * real users: the compose flow (draft -> audiences -> media -> poll -> publish),
 * the feed read path (filtered media never carries a path, seeded keyset paging,
 * muted authors), and likes/comments merged into stats.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addComment,
  addReply,
  attachMedia,
  createDraft,
  fetchComments,
  fetchFeedPage,
  fetchPost,
  likePost,
  newFeedSeed,
  pollUploaderMedia,
  publishDraft,
  setAudiences,
  shareToGroup,
  type FeedCursor,
} from "@safeplace/api-client";
import { createTestDb, type TestDb } from "../harness";
import { GROUP2_ID, USER, seedFixtures, setMediaClassification } from "../seed";
import { pgliteClient } from "../supabase-adapter";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

const author = () => pgliteClient(db, USER.author.id);
const follower = () => pgliteClient(db, USER.follower.id); // male, filter ON, follows author

async function composePublic(text: string, classify?: "contains_women" | "general") {
  const c = author();
  const { postId } = await createDraft(c, { authorId: USER.author.id, text });
  await setAudiences(c, postId, [{ kind: "public" }]);
  const { mediaIds } = await attachMedia(c, {
    postId,
    uploaderId: USER.author.id,
    media: [{ storagePath: `${USER.author.id}/${postId}`, contentType: "image/png" }],
  });
  if (classify) {
    await setMediaClassification(db.raw, mediaIds[0]!, classify);
  }
  return { postId, mediaIds };
}

describe("compose flow", () => {
  it("a draft is author-only and publishing makes it reachable", async () => {
    const { postId } = await composePublic("flow");
    expect(await fetchPost(follower(), postId)).toBeNull();
    const own = await fetchPost(author(), postId);
    expect(own?.audiences).toEqual([{ kind: "public" }]);

    // The result has not arrived: the author is told it is still processing.
    const poll = await pollUploaderMedia(author(), postId, "male");
    expect(poll.settled).toBe(false);
    expect(poll.views).toHaveLength(1);

    await publishDraft(author(), postId);
    expect((await fetchPost(follower(), postId))?.id).toBe(postId);
  });

  it("pollUploaderMedia settles once the pipeline has classified", async () => {
    const { postId, mediaIds } = await composePublic("poll", "contains_women");
    const poll = await pollUploaderMedia(author(), postId, "male");
    expect(poll.settled).toBe(true);
    expect(poll.views[0]).toMatchObject({ id: mediaIds[0], classification: "contains_women" });
  });

  it("the database refuses an invalid publish and the client refuses a bad audience set", async () => {
    const c = author();
    const { postId } = await createDraft(c, { authorId: USER.author.id });
    await expect(publishDraft(c, postId)).rejects.toThrow(/cannot publish/);
    await expect(setAudiences(c, postId, [{ kind: "public" }, { kind: "followers_only", authorId: USER.author.id }])).rejects.toThrow(
      /invalid audience/
    );
  });

  it("shareToGroup posts a quote into a group; an unavailable original reads as unavailable", async () => {
    const { postId } = await composePublic("orig");
    await publishDraft(author(), postId);
    const { postId: quoteId } = await shareToGroup(author(), {
      authorId: USER.author.id,
      quotedPostId: postId,
      groupId: GROUP2_ID,
      text: "look",
    });
    const quote = await fetchPost(pgliteClient(db, USER.group2Member.id), quoteId);
    expect(quote?.quotedPostId).toBe(postId);
    // Not a member of the target group: refused, and no draft is left behind.
    await expect(
      shareToGroup(pgliteClient(db, USER.maleFiltered.id), {
        authorId: USER.maleFiltered.id,
        quotedPostId: postId,
        groupId: GROUP2_ID,
      })
    ).rejects.toThrow();
    const { rows } = await db.raw.query(`select count(*)::int as n from public.posts where author_id = $1`, [USER.maleFiltered.id]);
    expect((rows[0] as { n: number }).n).toBe(0);
  });
});

describe("feed", () => {
  it("a filtered viewer gets the filtered flag and never a path; an unfiltered viewer gets the path", async () => {
    const { postId } = await composePublic("women", "contains_women");
    await publishDraft(author(), postId);

    const page = await fetchFeedPage(follower(), { seed: "s1", limit: 50 });
    const item = page.items.find((i) => i.id === postId);
    expect(item?.placement).toBe("followed");
    expect(item?.media[0]).toMatchObject({ filtered: true, storagePath: null });
    expect(JSON.stringify(item)).not.toContain(`${USER.author.id}/${postId}`);

    const open = await fetchPost(pgliteClient(db, USER.maleUnfiltered.id), postId);
    expect(open?.media[0]).toMatchObject({ filtered: false, storagePath: `${USER.author.id}/${postId}` });
  });

  it("seeded keyset paging is complete and duplicate-free", async () => {
    for (let i = 0; i < 4; i++) {
      const { postId } = await composePublic(`page${i}`, "general");
      await publishDraft(author(), postId);
    }
    const all = await fetchFeedPage(follower(), { seed: "stable", limit: 50 });
    const ids: string[] = [];
    let cursor: FeedCursor | null = null;
    do {
      const page: Awaited<ReturnType<typeof fetchFeedPage>> = await fetchFeedPage(follower(), { seed: "stable", limit: 2, cursor });
      ids.push(...page.items.map((i) => i.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    expect(ids.filter((id) => all.items.some((i) => i.id === id))).toHaveLength(all.items.length);
    expect(newFeedSeed()).not.toBe("stable");
  });

  it("a muted author is dropped from the feed", async () => {
    const page = await fetchFeedPage(pgliteClient(db, USER.muter.id), { seed: "m", limit: 50 });
    expect(page.items.filter((i) => i.authorId === USER.author.id)).toHaveLength(0);
  });
});

describe("interactions and comments", () => {
  it("like counts and comment counts are numbers merged into the feed; likes are idempotent", async () => {
    const { postId } = await composePublic("stats", "general");
    await publishDraft(author(), postId);
    const f = follower();
    await likePost(f, USER.follower.id, postId);
    await likePost(f, USER.follower.id, postId);
    const { commentId } = await addComment(f, { authorId: USER.follower.id, postId, text: "first" });
    const page = await fetchFeedPage(f, { seed: "x", limit: 50 });
    expect(page.items.find((i) => i.id === postId)?.stats).toEqual({
      likeCount: 1,
      commentCount: 1,
      viewerLiked: true,
      viewerSaved: false,
    });

    // Reply to a reply lands on the level-1 root.
    const { commentId: r1 } = await addReply(author(), { authorId: USER.author.id, postId, text: "r1", parentCommentId: commentId });
    await addReply(f, { authorId: USER.follower.id, postId, text: "r2", parentCommentId: r1 });
    const threads = (await fetchComments(f, postId)).threads;
    expect(threads).toHaveLength(1);
    expect(threads[0]!.replies.map((r) => r.text)).toEqual(["r1", "r2"]);
    expect(threads[0]!.replies[1]!.replyToUserId).toBe(USER.author.id);
  });

  it("comment media: withheld from a filtered viewer at every state, visible to the uploader, text always shown", async () => {
    const { postId } = await composePublic("comment media", "general");
    await publishDraft(author(), postId);
    const commenter = pgliteClient(db, USER.maleUnfiltered.id);
    const path = `${USER.maleUnfiltered.id}/pic`;
    const { commentId, mediaIds } = await addComment(commenter, {
      authorId: USER.maleUnfiltered.id,
      postId,
      text: "a picture",
      media: [{ storagePath: path, contentType: "image/png" }],
    });
    const read = async (viewer: ReturnType<typeof author>) =>
      (await fetchComments(viewer, postId)).threads.find((t) => t.comment.id === commentId)!.comment;

    // In flight (unclassified): the uploader sees it, a filtered viewer does not (fail closed).
    expect((await read(commenter)).media[0]).toMatchObject({ classification: "unclassified", filtered: false, storagePath: path });
    const waiting = await read(follower());
    expect(waiting.text).toBe("a picture");
    expect(waiting.media[0]).toMatchObject({ filtered: true, storagePath: null });

    // Classified as containing women: still withheld from the filtered viewer, served to the unfiltered one.
    await setMediaClassification(db.raw, mediaIds[0]!, "contains_women");
    const hidden = await read(follower());
    expect(hidden.media[0]).toMatchObject({ classification: "contains_women", filtered: true, storagePath: null });
    expect(JSON.stringify(hidden)).not.toContain(path);
    expect((await read(commenter)).media[0]).toMatchObject({ filtered: false, storagePath: path });

    // Frozen for review: nothing at all reaches anyone but the uploader.
    await setMediaClassification(db.raw, mediaIds[0]!, "pending_review");
    expect((await read(follower())).media).toEqual([]); // not even a row: the view hides frozen media from others
    expect((await read(commenter)).media[0]).toMatchObject({ filtered: false, storagePath: path });
  });
});
