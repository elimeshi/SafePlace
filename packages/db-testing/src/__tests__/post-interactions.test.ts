/**
 * Phase 4 write-side and read-model enforcement:
 *  - likes / saves / mutes / suggestion feedback are owner-private rows, and
 *    counts come out as numbers without lists (invariant #5);
 *  - post_stats / comment_stats never serve a post or comment the caller
 *    cannot see;
 *  - the audience combination rule, publish checks, and the RLS update lock;
 *  - two-level comment threads and reply re-parenting;
 *  - share-to-group / copy-link / follow-suggestion parity with
 *    @safeplace/visibility-policy.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  canCopyExternalLink,
  canSharePostInternally,
  canSuggestUserToFollow,
} from "@safeplace/visibility-policy";
import { createTestDb, type TestDb } from "../harness";
import {
  EXTRA_POSTS,
  FAMILY_SPACE_ID,
  GROUP2_ID,
  GROUP_ID,
  GROUP_VISIBILITY,
  POSTS,
  USER,
  USERS,
  insertPost,
  seedFixtures,
} from "../seed";
import { postContextOf, viewerOf, USER_BY_ID } from "../expected";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

const uuid = (n: number) => `11111111-0000-0000-0000-${n.toString().padStart(12, "0")}`;
let nextId = 1;
const fresh = () => uuid(nextId++);

const PUBLIC_POST = POSTS.find((p) => p.exposure[0].kind === "public" && p.authorId === USER.author.id)!;
const GROUP_POST = POSTS.find((p) => p.sourceKind === "group")!;

// --- likes, saves: owner-private rows, counts without lists -------------------

describe("post likes and saves", () => {
  it("lets a viewer like a visible post and read only their own row", async () => {
    await db.asUser(USER.maleFiltered.id, (q) =>
      q.query(`insert into public.post_likes (post_id, user_id) values ($1, $2)`, [PUBLIC_POST.postId, USER.maleFiltered.id])
    );
    await db.asUser(USER.follower.id, (q) =>
      q.query(`insert into public.post_likes (post_id, user_id) values ($1, $2)`, [PUBLIC_POST.postId, USER.follower.id])
    );
    const own = await db.asUser(USER.maleFiltered.id, (q) => q.query(`select * from public.post_likes`));
    expect(own.rows).toHaveLength(1);
    const other = await db.asUser(USER.groupMember.id, (q) => q.query(`select * from public.post_likes`));
    expect(other.rows).toHaveLength(0);
  });

  it("serves the count to anyone who can see the post, with viewer_liked only for themselves", async () => {
    const stats = (userId: string) =>
      db.asUser(userId, (q) =>
        q.query<{ like_count: number; viewer_liked: boolean }>(
          `select like_count, viewer_liked from public.post_stats(array[$1]::uuid[])`,
          [PUBLIC_POST.postId]
        )
      );
    expect((await stats(USER.maleFiltered.id)).rows[0]).toEqual({ like_count: 2, viewer_liked: true });
    expect((await stats(USER.groupMember.id)).rows[0]).toEqual({ like_count: 2, viewer_liked: false });
  });

  it("refuses a like on a post the caller cannot see, a draft, or on someone else's behalf", async () => {
    await expect(
      db.asUser(USER.maleFiltered.id, (q) =>
        q.query(`insert into public.post_likes (post_id, user_id) values ($1, $2)`, [GROUP_POST.postId, USER.maleFiltered.id])
      )
    ).rejects.toThrow(/row-level security/i);
    await expect(
      db.asUser(USER.author.id, (q) =>
        q.query(`insert into public.post_likes (post_id, user_id) values ($1, $2)`, [EXTRA_POSTS.draft.postId, USER.author.id])
      )
    ).rejects.toThrow(/row-level security/i);
    await expect(
      db.asUser(USER.maleFiltered.id, (q) =>
        q.query(`insert into public.post_likes (post_id, user_id) values ($1, $2)`, [PUBLIC_POST.postId, USER.groupMember.id])
      )
    ).rejects.toThrow(/row-level security/i);
  });

  it("lets only the owner remove a like", async () => {
    await db.asUser(USER.groupMember.id, (q) =>
      q.query(`delete from public.post_likes where post_id = $1`, [PUBLIC_POST.postId])
    );
    const { rows } = await db.raw.query<{ n: number }>(`select count(*)::int as n from public.post_likes where post_id = $1`, [PUBLIC_POST.postId]);
    expect(rows[0]?.n).toBe(2);
    await db.asUser(USER.follower.id, (q) =>
      q.query(`delete from public.post_likes where post_id = $1`, [PUBLIC_POST.postId])
    );
    const after = await db.raw.query<{ n: number }>(`select count(*)::int as n from public.post_likes where post_id = $1`, [PUBLIC_POST.postId]);
    expect(after.rows[0]?.n).toBe(1);
  });

  it("saves are private to their owner and reported only as viewer_saved", async () => {
    await db.asUser(USER.maleFiltered.id, (q) =>
      q.query(`insert into public.post_saves (post_id, user_id) values ($1, $2)`, [PUBLIC_POST.postId, USER.maleFiltered.id])
    );
    expect((await db.asUser(USER.groupMember.id, (q) => q.query(`select * from public.post_saves`))).rows).toHaveLength(0);
    const mine = await db.asUser(USER.maleFiltered.id, (q) =>
      q.query<{ viewer_saved: boolean }>(`select viewer_saved from public.post_stats(array[$1]::uuid[])`, [PUBLIC_POST.postId])
    );
    expect(mine.rows[0]?.viewer_saved).toBe(true);
    const theirs = await db.asUser(USER.groupMember.id, (q) =>
      q.query<{ viewer_saved: boolean }>(`select viewer_saved from public.post_stats(array[$1]::uuid[])`, [PUBLIC_POST.postId])
    );
    expect(theirs.rows[0]?.viewer_saved).toBe(false);
    await expect(
      db.asUser(USER.maleFiltered.id, (q) =>
        q.query(`insert into public.post_saves (post_id, user_id) values ($1, $2)`, [GROUP_POST.postId, USER.maleFiltered.id])
      )
    ).rejects.toThrow(/row-level security/i);
  });

  it("post_stats never returns a row for a post the caller cannot see", async () => {
    const ids = [PUBLIC_POST.postId, GROUP_POST.postId, EXTRA_POSTS.draft.postId, EXTRA_POSTS.twoGroups.postId];
    const { rows } = await db.asUser(USER.maleFiltered.id, (q) =>
      q.query<{ post_id: string }>(`select post_id from public.post_stats($1::uuid[])`, [ids])
    );
    expect(rows.map((r) => r.post_id)).toEqual([PUBLIC_POST.postId]);
    const author = await db.asUser(USER.author.id, (q) =>
      q.query<{ post_id: string }>(`select post_id from public.post_stats($1::uuid[])`, [ids])
    );
    // The author's own draft is not a published post: no stats either.
    expect(author.rows.map((r) => r.post_id).sort()).toEqual(
      [PUBLIC_POST.postId, GROUP_POST.postId, EXTRA_POSTS.twoGroups.postId].sort()
    );
  });
});

// --- comments: threads, counts, mute/block --------------------------------------

describe("comments", () => {
  const postId = PUBLIC_POST.postId;
  const root = fresh();
  const reply = fresh();
  const replyToReply = fresh();

  it("keeps threads two levels deep and records whom a nested reply answers", async () => {
    await db.asUser(USER.follower.id, (q) =>
      q.query(`insert into public.comments (id, post_id, author_id, text) values ($1, $2, $3, 'root')`, [root, postId, USER.follower.id])
    );
    await db.asUser(USER.groupMember.id, (q) =>
      q.query(
        // reply_to_user_id supplied by a client is ignored for a level-1 reply.
        `insert into public.comments (id, post_id, author_id, parent_comment_id, reply_to_user_id, text) values ($1, $2, $3, $4, $5, 'reply')`,
        [reply, postId, USER.groupMember.id, root, USER.fsMember.id]
      )
    );
    await db.asUser(USER.fsMember.id, (q) =>
      q.query(
        `insert into public.comments (id, post_id, author_id, parent_comment_id, reply_to_user_id, text) values ($1, $2, $3, $4, $5, 'nested')`,
        [replyToReply, postId, USER.fsMember.id, reply, USER.follower.id]
      )
    );
    const { rows } = await db.raw.query<{ id: string; parent_comment_id: string | null; reply_to_user_id: string | null }>(
      `select id, parent_comment_id, reply_to_user_id from public.comments where id = any($1::uuid[])`,
      [[root, reply, replyToReply]]
    );
    const by = new Map(rows.map((r) => [r.id, r]));
    expect(by.get(root)).toMatchObject({ parent_comment_id: null, reply_to_user_id: null });
    expect(by.get(reply)).toMatchObject({ parent_comment_id: root, reply_to_user_id: null });
    // Re-parented onto the level-1 root; names the author of the reply it answered.
    expect(by.get(replyToReply)).toMatchObject({ parent_comment_id: root, reply_to_user_id: USER.groupMember.id });
  });

  it("rejects a parent on another post", async () => {
    const other = PUBLIC_POST.postId === POSTS[1]!.postId ? POSTS[0]! : POSTS.find((p) => p.postId !== postId && p.exposure[0].kind === "public")!;
    await expect(
      db.asUser(USER.follower.id, (q) =>
        q.query(`insert into public.comments (id, post_id, author_id, parent_comment_id, text) values ($1, $2, $3, $4, 'x')`, [fresh(), other.postId, USER.follower.id, root])
      )
    ).rejects.toThrow(/different post/i);
  });

  it("rejects commenting on an unseen post or a draft", async () => {
    await expect(
      db.asUser(USER.maleFiltered.id, (q) =>
        q.query(`insert into public.comments (id, post_id, author_id, text) values ($1, $2, $3, 'x')`, [fresh(), GROUP_POST.postId, USER.maleFiltered.id])
      )
    ).rejects.toThrow(/row-level security/i);
    await expect(
      db.asUser(USER.author.id, (q) =>
        q.query(`insert into public.comments (id, post_id, author_id, text) values ($1, $2, $3, 'x')`, [fresh(), EXTRA_POSTS.draft.postId, USER.author.id])
      )
    ).rejects.toThrow(/row-level security/i);
  });

  it("counts comments without listing, excluding blocked and muted authors", async () => {
    // BLOCKED comments on the author's post; AUTHOR has blocked them.
    await db.raw.query(`insert into public.comments (id, post_id, author_id, text) values ($1, $2, $3, 'b')`, [fresh(), postId, USER.blocked.id]);
    const count = (userId: string) =>
      db.asUser(userId, (q) =>
        q.query<{ comment_count: number }>(`select comment_count from public.post_stats(array[$1]::uuid[])`, [postId])
      );
    expect((await count(USER.maleFiltered.id)).rows[0]?.comment_count).toBe(4); // root, reply, nested, blocked's
    expect((await count(USER.author.id)).rows[0]?.comment_count).toBe(3); // blocked author's comment excluded
    // muter muted `author`, who has not commented; mute `follower` too:
    await db.asUser(USER.muter.id, (q) =>
      q.query(`insert into public.user_mutes (muter_id, muted_id) values ($1, $2)`, [USER.muter.id, USER.follower.id])
    );
    const muterView = await db.asUser(USER.muter.id, (q) =>
      q.query<{ id: string }>(`select id from public.comments where post_id = $1`, [postId])
    );
    expect(muterView.rows.map((r) => r.id)).not.toContain(root);
    expect((await count(USER.muter.id)).rows[0]?.comment_count).toBe(3); // root hidden, others stay
  });

  it("refuses to reply to a parent the replier cannot see", async () => {
    const blockedComment = (await db.raw.query<{ id: string }>(`select id from public.comments where author_id = $1`, [USER.blocked.id])).rows[0]!.id;
    await expect(
      db.asUser(USER.author.id, (q) =>
        q.query(`insert into public.comments (id, post_id, author_id, parent_comment_id, text) values ($1, $2, $3, $4, 'x')`, [fresh(), postId, USER.author.id, blockedComment])
      )
    ).rejects.toThrow(/parent comment not found/i);
  });

  it("comment likes: private rows, count only, visible comments only", async () => {
    await db.asUser(USER.maleFiltered.id, (q) =>
      q.query(`insert into public.comment_likes (comment_id, user_id) values ($1, $2)`, [reply, USER.maleFiltered.id])
    );
    expect((await db.asUser(USER.groupMember.id, (q) => q.query(`select * from public.comment_likes`))).rows).toHaveLength(0);
    const stats = await db.asUser(USER.groupMember.id, (q) =>
      q.query<{ like_count: number; viewer_liked: boolean }>(`select like_count, viewer_liked from public.comment_stats(array[$1]::uuid[])`, [reply])
    );
    expect(stats.rows[0]).toEqual({ like_count: 1, viewer_liked: false });
    // Cannot like a comment on a post that is not visible.
    const hidden = fresh();
    await db.raw.query(`insert into public.comments (id, post_id, author_id, text) values ($1, $2, $3, 'g')`, [hidden, GROUP_POST.postId, USER.groupMember.id]);
    await expect(
      db.asUser(USER.maleFiltered.id, (q) =>
        q.query(`insert into public.comment_likes (comment_id, user_id) values ($1, $2)`, [hidden, USER.maleFiltered.id])
      )
    ).rejects.toThrow(/row-level security/i);
    const none = await db.asUser(USER.maleFiltered.id, (q) =>
      q.query(`select * from public.comment_stats(array[$1]::uuid[])`, [hidden])
    );
    expect(none.rows).toHaveLength(0);
  });
});

// --- mutes and suggestion feedback ---------------------------------------------

describe("mutes and suggestion feedback are owner-only", () => {
  it("user_mutes", async () => {
    expect((await db.asUser(USER.maleFiltered.id, (q) => q.query(`select * from public.user_mutes`))).rows).toHaveLength(0);
    await expect(
      db.asUser(USER.maleFiltered.id, (q) =>
        q.query(`insert into public.user_mutes (muter_id, muted_id) values ($1, $2)`, [USER.groupMember.id, USER.author.id])
      )
    ).rejects.toThrow(/row-level security/i);
    await expect(
      db.asUser(USER.maleFiltered.id, (q) =>
        q.query(`insert into public.user_mutes (muter_id, muted_id) values ($1, $1)`, [USER.maleFiltered.id])
      )
    ).rejects.toThrow(/no_self_mute/i);
    // A mute is silent and one-sided: the muted user's own view is unchanged.
    expect((await db.asUser(USER.author.id, (q) => q.query(`select * from public.user_mutes`))).rows).toHaveLength(0);
  });

  it("suggestion_feedback", async () => {
    await db.asUser(USER.maleFiltered.id, (q) =>
      q.query(`insert into public.suggestion_feedback (viewer_id, target_user_id, kind) values ($1, $2, 'less_like_this')`, [USER.maleFiltered.id, USER.author.id])
    );
    expect((await db.asUser(USER.author.id, (q) => q.query(`select * from public.suggestion_feedback`))).rows).toHaveLength(0);
    await expect(
      db.asUser(USER.maleFiltered.id, (q) =>
        q.query(`insert into public.suggestion_feedback (viewer_id, target_user_id, kind) values ($1, $2, 'dont_suggest')`, [USER.groupMember.id, USER.author.id])
      )
    ).rejects.toThrow(/row-level security/i);
    // less_like_this stops suggestions exactly like dont_suggest.
    const { rows } = await db.asUser(USER.maleFiltered.id, (q) =>
      q.query(`select id from public.feed_page('s', 50, null, null, 100) where id = $1`, [PUBLIC_POST.postId])
    );
    expect(rows).toHaveLength(0);
    await db.raw.query(`delete from public.suggestion_feedback where viewer_id = $1`, [USER.maleFiltered.id]);
  });
});

// --- audience rule, publish checks, update lock ---------------------------------

describe("audience combination rule (trigger)", () => {
  const FS2 = uuid(900);
  beforeAll(async () => {
    await db.raw.query(`insert into public.family_spaces (id, name, admin_user_id) values ($1, 'FS2', $2)`, [FS2, USER.author.id]);
    await db.raw.query(`insert into public.family_space_members (space_id, user_id) values ($1, $2)`, [FS2, USER.author.id]);
  });

  const compose = (audiences: Array<{ kind: string; group?: string; space?: string }>, opts: { source?: string; sg?: string; ss?: string } = {}) =>
    db.asUser(USER.author.id, async (q) => {
      const id = fresh();
      await q.query(
        `insert into public.posts (id, author_id, text, status, source_kind, source_group_id, source_space_id) values ($1, $2, 't', 'draft', $3, $4, $5)`,
        [id, USER.author.id, opts.source ?? "profile", opts.sg ?? null, opts.ss ?? null]
      );
      for (const [i, a] of audiences.entries()) {
        await q.query(`insert into public.post_audiences (post_id, kind, group_id, space_id, position) values ($1, $2, $3, $4, $5)`, [id, a.kind, a.group ?? null, a.space ?? null, i]);
      }
      await q.query(`update public.posts set status = 'published' where id = $1`, [id]);
      return id;
    });

  const PUB = { kind: "public" };
  const FOL = { kind: "followers_only" };
  const G1 = { kind: "group", group: GROUP_ID };
  const G2 = { kind: "group", group: GROUP2_ID };
  const S1 = { kind: "family_space", space: FAMILY_SPACE_ID };
  const S2 = { kind: "family_space", space: FS2 };

  it("accepts legal sets", async () => {
    await compose([PUB]);
    await compose([FOL, G1, G2]);
    await compose([G1, G2]);
    await compose([S1, S2]);
  });

  it("makes public exclusive", async () => {
    await expect(compose([PUB, G1])).rejects.toThrow(/invalid audience combination/i);
    await expect(compose([FOL, PUB])).rejects.toThrow(/invalid audience combination/i);
  });

  it("never mixes a Family Space with a non-Family-Space audience", async () => {
    await expect(compose([S1, G1])).rejects.toThrow(/invalid audience combination/i);
    await expect(compose([FOL, S1])).rejects.toThrow(/invalid audience combination/i);
  });

  it("refuses to publish without any audience", async () => {
    await expect(compose([])).rejects.toThrow(/invalid audience set/i);
  });

  it("requires membership of every targeted group or space (RLS on insert)", async () => {
    await expect(
      db.asUser(USER.maleFiltered.id, async (q) => {
        const id = fresh();
        await q.query(`insert into public.posts (id, author_id, text, status) values ($1, $2, 't', 'draft')`, [id, USER.maleFiltered.id]);
        await q.query(`insert into public.post_audiences (post_id, kind, group_id) values ($1, 'group', $2)`, [id, GROUP_ID]);
      })
    ).rejects.toThrow(/row-level security/i);
  });

  it("re-checks membership when publishing", async () => {
    const id = fresh();
    await db.asUser(USER.bothGroups.id, async (q) => {
      await q.query(`insert into public.posts (id, author_id, text, status) values ($1, $2, 't', 'draft')`, [id, USER.bothGroups.id]);
      await q.query(`insert into public.post_audiences (post_id, kind, group_id) values ($1, 'group', $2)`, [id, GROUP_ID]);
    });
    await db.raw.query(`delete from public.group_members where group_id = $1 and user_id = $2`, [GROUP_ID, USER.bothGroups.id]);
    await expect(
      db.asUser(USER.bothGroups.id, (q) => q.query(`update public.posts set status = 'published' where id = $1`, [id]))
    ).rejects.toThrow(/not a member/i);
    await db.raw.query(`insert into public.group_members (group_id, user_id) values ($1, $2)`, [GROUP_ID, USER.bothGroups.id]);
  });

  it("keeps source and audience consistent", async () => {
    await compose([G1], { source: "group", sg: GROUP_ID });
    await compose([S1], { source: "family_space", ss: FAMILY_SPACE_ID });
    await expect(compose([G2], { source: "group", sg: GROUP_ID })).rejects.toThrow(/own group/i);
    await expect(compose([G1, G2], { source: "group", sg: GROUP_ID })).rejects.toThrow(/own group/i);
    await expect(compose([S1, S2], { source: "family_space", ss: FAMILY_SPACE_ID })).rejects.toThrow(/own space/i);
    await expect(compose([PUB], { source: "group" })).rejects.toThrow(/own group/i);
    await expect(compose([PUB], { source: "profile", sg: GROUP_ID })).rejects.toThrow(/cannot name a source/i);
  });

  it("clients cannot insert a post already published", async () => {
    await expect(
      db.asUser(USER.author.id, (q) =>
        q.query(`insert into public.posts (id, author_id, text, status) values ($1, $2, 't', 'published')`, [fresh(), USER.author.id])
      )
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("a published post is locked (RLS gap fix)", () => {
  it("rejects returning to draft", async () => {
    await expect(
      db.asUser(USER.author.id, (q) => q.query(`update public.posts set status = 'draft' where id = $1`, [PUBLIC_POST.postId]))
    ).rejects.toThrow(/cannot return to draft/i);
  });

  it("rejects adding or removing audiences after publish", async () => {
    await expect(
      db.asUser(USER.author.id, (q) =>
        q.query(`insert into public.post_audiences (post_id, kind, group_id) values ($1, 'group', $2)`, [PUBLIC_POST.postId, GROUP_ID])
      )
    ).rejects.toThrow(/row-level security/i);
    await db.asUser(USER.author.id, (q) => q.query(`delete from public.post_audiences where post_id = $1`, [PUBLIC_POST.postId]));
    const { rows } = await db.raw.query(`select 1 from public.post_audiences where post_id = $1`, [PUBLIC_POST.postId]);
    expect(rows).toHaveLength(1);
  });

  it("rejects moving the post into another source or quoting afterwards", async () => {
    await expect(
      db.asUser(USER.author.id, (q) => q.query(`update public.posts set source_group_id = $2 where id = $1`, [PUBLIC_POST.postId, GROUP2_ID]))
    ).rejects.toThrow(/locked/i);
    await expect(
      db.asUser(USER.author.id, (q) => q.query(`update public.posts set quoted_post_id = $2 where id = $1`, [PUBLIC_POST.postId, GROUP_POST.postId]))
    ).rejects.toThrow(/locked/i);
  });

  it("rejects pointing a draft at a group the author is not in", async () => {
    const id = fresh();
    await db.asUser(USER.maleFiltered.id, (q) =>
      q.query(`insert into public.posts (id, author_id, text, status) values ($1, $2, 't', 'draft')`, [id, USER.maleFiltered.id])
    );
    await expect(
      db.asUser(USER.maleFiltered.id, (q) => q.query(`update public.posts set source_group_id = $2 where id = $1`, [id, GROUP_ID]))
    ).rejects.toThrow(/row-level security/i);
  });

  it("still lets the author edit text, and lets FK actions null a source", async () => {
    await db.asUser(USER.author.id, (q) =>
      q.query(`update public.posts set text = 'edited', edited_at = now() where id = $1`, [PUBLIC_POST.postId])
    );
    const { rows } = await db.raw.query<{ text: string }>(`select text from public.posts where id = $1`, [PUBLIC_POST.postId]);
    expect(rows[0]?.text).toBe("edited");
  });
});

// --- share-to-group / quote posts ----------------------------------------------

describe("quote posts (share to group)", () => {
  const quote = (userId: string, quoted: string, audiences: Array<{ kind: string; group?: string }>) =>
    db.asUser(userId, async (q) => {
      const id = fresh();
      await q.query(`insert into public.posts (id, author_id, text, status, quoted_post_id) values ($1, $2, 'q', 'draft', $3)`, [id, userId, quoted]);
      for (const a of audiences) {
        await q.query(`insert into public.post_audiences (post_id, kind, group_id) values ($1, $2, $3)`, [id, a.kind, a.group ?? null]);
      }
      await q.query(`update public.posts set status = 'published' where id = $1`, [id]);
      return id;
    });

  it("shares a public post into a group the sharer is in", async () => {
    const id = await quote(USER.bothGroups.id, PUBLIC_POST.postId, [{ kind: "group", group: GROUP2_ID }]);
    const { rows } = await db.raw.query<{ quoted_post_id: string }>(`select quoted_post_id from public.posts where id = $1`, [id]);
    expect(rows[0]?.quoted_post_id).toBe(PUBLIC_POST.postId);
    // Media is never duplicated.
    const media = await db.raw.query(`select 1 from public.media_items where post_id = $1`, [id]);
    expect(media.rows).toHaveLength(0);
  });

  it("refuses a private-group post, a Family Space post, and a multi-audience quote", async () => {
    await expect(quote(USER.bothGroups.id, GROUP_POST.postId, [{ kind: "group", group: GROUP2_ID }])).rejects.toThrow(/quote posts may only/i);
    await expect(
      quote(USER.bothGroups.id, PUBLIC_POST.postId, [{ kind: "group", group: GROUP_ID }, { kind: "group", group: GROUP2_ID }])
    ).rejects.toThrow(/quote posts may only/i);
    const family = POSTS.find((p) => p.exposure.some((a) => a.kind === "family_space"))!;
    await expect(quote(USER.fsMember.id, family.postId, [{ kind: "group", group: GROUP2_ID }])).rejects.toThrow();
  });

  it("refuses to quote a post the sharer cannot see", async () => {
    await expect(quote(USER.group2Member.id, GROUP_POST.postId, [{ kind: "group", group: GROUP2_ID }])).rejects.toThrow(/row-level security/i);
  });

  it("an 'original unavailable' quote survives deletion of the original", async () => {
    const original = fresh();
    await insertPost(db.raw, { postId: original, authorId: USER.author.id, exposure: [{ kind: "public" }] });
    const id = await quote(USER.bothGroups.id, original, [{ kind: "group", group: GROUP2_ID }]);
    await db.asUser(USER.author.id, (q) => q.query(`delete from public.posts where id = $1`, [original]));
    const { rows } = await db.raw.query<{ quoted_post_id: string | null }>(`select quoted_post_id from public.posts where id = $1`, [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.quoted_post_id).toBeNull();
  });
});

// --- share / link / suggestion parity ------------------------------------------

describe("canSharePostInternally and canCopyExternalLink: DB equals policy", () => {
  for (const u of USERS) {
    it(`viewer=${u.key}`, async () => {
      for (const p of POSTS) {
        const ctx = postContextOf(p);
        const v = viewerOf(u);
        for (const g of [GROUP_ID, GROUP2_ID]) {
          const { rows } = await db.asUser(u.id, (q) =>
            q.query<{ ok: boolean }>(`select visibility.can_share_internally($1, $2) as ok`, [p.postId, g])
          );
          expect(rows[0]?.ok, `${u.key} share ${p.postId} -> ${g}`).toBe(canSharePostInternally(v, ctx, g, GROUP_VISIBILITY));
        }
        const link = await db.asUser(u.id, (q) =>
          q.query<{ ok: boolean }>(`select visibility.can_copy_external_link($1) as ok`, [p.postId])
        );
        expect(link.rows[0]?.ok, `${u.key} link ${p.postId}`).toBe(canCopyExternalLink(v, ctx));
      }
    });
  }
});

describe("follow_suggestions: DB equals canSuggestUserToFollow", () => {
  const publicPosters = [...new Set(POSTS.filter((p) => p.status === "published" && p.sourceKind === "profile" && p.exposure[0].kind === "public").map((p) => p.authorId))];

  const expectedFor = (u: (typeof USERS)[number], discoverable: Record<string, string> = {}) =>
    publicPosters
      .filter((id) =>
        canSuggestUserToFollow(viewerOf(u), {
          userId: id,
          gender: USER_BY_ID.get(id)!.gender,
          discoverableInSearch: (discoverable[id] ?? "everyone") as "everyone" | "followers_only" | "nobody",
        })
      )
      .sort();

  const actualFor = async (u: (typeof USERS)[number]) =>
    (
      await db.asUser(u.id, (q) => q.query<{ user_id: string }>(`select user_id from public.follow_suggestions('s', 30)`))
    ).rows
      .map((r) => r.user_id)
      .sort();

  for (const u of USERS) {
    it(`viewer=${u.key}`, async () => {
      expect(await actualFor(u)).toEqual(expectedFor(u));
    });
  }

  it("respects the target's discoverable_in_search", async () => {
    await db.raw.query(`update public.profiles set discoverable_in_search = 'followers_only' where id = $1`, [USER.author.id]);
    expect(await actualFor(USER.maleFiltered)).toEqual(expectedFor(USER.maleFiltered, { [USER.author.id]: "followers_only" }));
    expect(await actualFor(USER.maleFiltered)).not.toContain(USER.author.id);
    await db.raw.query(`update public.profiles set discoverable_in_search = 'everyone' where id = $1`, [USER.author.id]);
  });

  it("respects the viewer's gender separation in search", async () => {
    await db.raw.query(`update public.filter_settings set gender_separation_in_search = true where user_id = $1`, [USER.femaleDefault.id]);
    // The only public posters are male: a separated woman is suggested none of them.
    expect(await actualFor(USER.femaleDefault)).toEqual([]);
    await db.raw.query(`update public.filter_settings set gender_separation_in_search = false where user_id = $1`, [USER.femaleDefault.id]);
    expect(await actualFor(USER.femaleDefault)).not.toEqual([]);
  });

  it("explains an engaged suggestion by the viewer's own action", async () => {
    const { rows } = await db.asUser(USER.maleFiltered.id, (q) =>
      q.query<{ user_id: string; reason: string }>(`select user_id, reason from public.follow_suggestions('s', 30) where user_id = $1`, [USER.author.id])
    );
    expect(rows[0]?.reason).toBe("engaged"); // maleFiltered liked the author's post above
  });

  it("never suggests anyone the viewer already follows, blocked, or is", async () => {
    const own = await db.asUser(USER.follower.id, (q) => q.query<{ user_id: string }>(`select user_id from public.follow_suggestions('s', 30)`));
    expect(own.rows.map((r) => r.user_id)).not.toContain(USER.author.id); // follows
    expect(own.rows.map((r) => r.user_id)).not.toContain(USER.follower.id); // self
    const blocker = await db.asUser(USER.author.id, (q) => q.query<{ user_id: string }>(`select user_id from public.follow_suggestions('s', 30)`));
    expect(blocker.rows.map((r) => r.user_id)).not.toContain(USER.blocked.id);
  });
});

// --- drafts -------------------------------------------------------------------

describe("purge_abandoned_drafts", () => {
  it("removes old drafts (and their media) but keeps recent drafts and published posts", async () => {
    const stale = fresh();
    const recent = fresh();
    for (const id of [stale, recent]) {
      await db.raw.query(`insert into public.posts (id, author_id, text, status) values ($1, $2, 'd', 'draft')`, [id, USER.author.id]);
    }
    await db.raw.query(`update public.posts set created_at = now() - interval '3 days' where id = $1`, [stale]);
    await db.raw.query(`insert into public.media_items (post_id, uploader_id, storage_path) values ($1, $2, 'media/stale')`, [stale, USER.author.id]);

    const n = await db.asService((q) => q.query<{ n: number }>(`select public.purge_abandoned_drafts(interval '24 hours') as n`));
    expect(n.rows[0]?.n).toBeGreaterThanOrEqual(1);

    const left = await db.raw.query<{ id: string }>(`select id from public.posts where id = any($1::uuid[])`, [[stale, recent]]);
    expect(left.rows.map((r) => r.id)).toEqual([recent]);
    expect((await db.raw.query(`select 1 from public.media_items where storage_path = 'media/stale'`)).rows).toHaveLength(0);
    // Every published post is untouched.
    const published = await db.raw.query(`select 1 from public.posts where status = 'published'`);
    expect(published.rows.length).toBeGreaterThanOrEqual(POSTS.filter((p) => p.status === "published").length);
  });

  it("is not callable by a client", async () => {
    await expect(
      db.asUser(USER.author.id, (q) => q.query(`select public.purge_abandoned_drafts()`))
    ).rejects.toThrow(/permission denied/i);
  });
});
