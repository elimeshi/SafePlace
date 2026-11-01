/**
 * Phase 4 parity: for every seeded viewer, what the DATABASE returns for posts,
 * post audiences, the feed, and the spaces rail equals what
 * @safeplace/visibility-policy decides. Covers filtered / unfiltered viewers,
 * the author, the blocked pair, group member vs non-member, multi-audience
 * posts (viewer in one / none / all groups), the Family Space member (absent
 * from the feed, present in the rail card and on the single post), drafts,
 * muted authors and the suggestions switch.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  canViewPost,
  postFeedPlacement,
  type FeedPlacement,
} from "@safeplace/visibility-policy";
import { createTestDb, type TestDb } from "../harness";
import {
  EXTRA_POSTS,
  FAMILY_SPACE_ID,
  GROUP2_ID,
  GROUP_ID,
  LEVEL_MEDIA,
  MEDIA,
  POSTS,
  USER,
  USERS,
  seedFixtures,
} from "../seed";
import { expectedAudiences, expectedMedia, postContextOf, viewerOf } from "../expected";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

interface FeedRow {
  id: string;
  placement: FeedPlacement;
  sort_key: string;
  audiences: Array<{ kind: string; group_id: string | null; space_id: string | null }>;
  media: Array<{ id: string; storage_path: string | null; is_filtered: boolean }>;
}

const feedFor = (userId: string, percent = 100, limit = 50) =>
  db.asUser(userId, (q) =>
    q.query<FeedRow>(`select * from public.feed_page('seed-1', $1, null, null, $2)`, [limit, percent])
  );

describe("posts: RLS equals canViewPost for every viewer", () => {
  for (const u of USERS) {
    it(`viewer=${u.key}`, async () => {
      const { rows } = await db.asUser(u.id, (q) => q.query<{ id: string }>(`select id from public.posts`));
      const seen = new Set(rows.map((r) => r.id));
      for (const p of POSTS) {
        expect(seen.has(p.postId), `${u.key} × ${p.postId}`).toBe(
          canViewPost(viewerOf(u), postContextOf(p))
        );
      }
    });
  }
});

describe("post_audiences: a viewer learns only the audiences they satisfy", () => {
  for (const u of USERS) {
    it(`viewer=${u.key}`, async () => {
      const { rows } = await db.asUser(u.id, (q) =>
        q.query<{ post_id: string; kind: string; group_id: string | null; space_id: string | null }>(
          `select post_id, kind, group_id, space_id from public.post_audiences`
        )
      );
      for (const p of POSTS) {
        const got = rows
          .filter((r) => r.post_id === p.postId)
          .map((r) => `${r.kind}:${r.group_id ?? r.space_id ?? ""}`)
          .sort();
        const want = expectedAudiences(u, p)
          .map((a) => `${a.kind}:${a.kind === "group" ? a.groupId : a.kind === "family_space" ? a.spaceId : ""}`)
          .sort();
        expect(got, `${u.key} × ${p.postId}`).toEqual(want);
      }
    });
  }
});

describe("feed_page: placement equals postFeedPlacement for every viewer", () => {
  for (const u of USERS) {
    it(`viewer=${u.key}`, async () => {
      const { rows } = await feedFor(u.id);
      const got = new Map(rows.map((r) => [r.id, r.placement]));
      for (const p of POSTS) {
        const want = postFeedPlacement(viewerOf(u), postContextOf(p));
        expect(got.get(p.postId) ?? "none", `${u.key} × ${p.postId}`).toBe(want);
      }
    });
  }
});

describe("feed_page: named cases", () => {
  it("never carries a Family Space post, even for a member or the author", async () => {
    const familyIds = POSTS.filter((p) => p.exposure.some((a) => a.kind === "family_space")).map((p) => p.postId);
    expect(familyIds.length).toBeGreaterThan(0);
    for (const u of [USER.fsMember, USER.author]) {
      const { rows } = await feedFor(u.id);
      for (const id of familyIds) expect(rows.some((r) => r.id === id)).toBe(false);
    }
  });

  it("but the member CAN open a Family Space post directly (single-post carve-out)", async () => {
    const media = MEDIA.find((m) => m.familySpaceId !== null && m.classification === "contains_women")!;
    const family = POSTS.find((p) => p.postId === media.postId)!;
    const { rows } = await db.asUser(USER.fsMember.id, (q) =>
      q.query(`select id from public.posts where id = $1`, [family.postId])
    );
    expect(rows).toHaveLength(1);
    const view = await db.asUser(USER.fsMember.id, (q) =>
      q.query<{ storage_path: string | null; is_filtered: boolean }>(
        `select storage_path, is_filtered from media_items_visible where id = $1`,
        [media.mediaId]
      )
    );
    // A filtered viewer, yet the family lift serves the real reference.
    expect(view.rows[0]?.storage_path).toBeTruthy();
    expect(view.rows[0]?.is_filtered).toBe(false);
  });

  it("never carries a draft, not even for its author, but the author can read it", async () => {
    for (const u of USERS) {
      const { rows } = await feedFor(u.id);
      expect(rows.some((r) => r.id === EXTRA_POSTS.draft.postId)).toBe(false);
    }
    const own = await db.asUser(USER.author.id, (q) =>
      q.query(`select id from public.posts where id = $1`, [EXTRA_POSTS.draft.postId])
    );
    expect(own.rows).toHaveLength(1);
  });

  it("drops a muted author's post from the feed while the post stays reachable", async () => {
    const pub = POSTS.find((p) => p.exposure[0].kind === "public" && p.authorId === USER.author.id)!;
    const { rows } = await feedFor(USER.muter.id);
    expect(rows.some((r) => r.id === pub.postId)).toBe(false);
    const direct = await db.asUser(USER.muter.id, (q) =>
      q.query(`select id from public.posts where id = $1`, [pub.postId])
    );
    expect(direct.rows).toHaveLength(1);
  });

  it("suggests public personal posts to a stranger, and stops when the switch is off", async () => {
    const pub = POSTS.find((p) => p.exposure[0].kind === "public" && p.authorId === USER.author.id)!;
    const on = await feedFor(USER.maleFiltered.id);
    expect(on.rows.find((r) => r.id === pub.postId)?.placement).toBe("suggested");
    const off = await feedFor(USER.noSuggest.id);
    expect(off.rows.some((r) => r.id === pub.postId)).toBe(false);
    const suppressed = await feedFor(USER.suppressor.id);
    expect(suppressed.rows.some((r) => r.id === pub.postId)).toBe(false);
  });

  it("admits no suggested posts at 0 percent and every candidate at 100", async () => {
    const none = await feedFor(USER.maleFiltered.id, 0);
    expect(none.rows.every((r) => r.placement === "followed")).toBe(true);
    const all = await feedFor(USER.maleFiltered.id, 100);
    expect(all.rows.some((r) => r.placement === "suggested")).toBe(true);
  });

  it("multi-audience: viewer in one group, none, or all", async () => {
    const id = EXTRA_POSTS.twoGroups.postId;
    const seenBy = async (u: (typeof USERS)[number]) => (await feedFor(u.id)).rows.some((r) => r.id === id);
    expect(await seenBy(USER.groupMember)).toBe(true); // G1 only
    expect(await seenBy(USER.group2Member)).toBe(true); // G2 only
    expect(await seenBy(USER.bothGroups)).toBe(true); // both
    expect(await seenBy(USER.maleFiltered)).toBe(false); // neither
  });

  it("source label data: a viewer gets only the group audiences they belong to", async () => {
    const id = EXTRA_POSTS.twoGroups.postId;
    const g2 = (await feedFor(USER.group2Member.id)).rows.find((r) => r.id === id)!;
    expect(g2.audiences).toEqual([{ kind: "group", group_id: GROUP2_ID, space_id: null }]);
    const both = (await feedFor(USER.bothGroups.id)).rows.find((r) => r.id === id)!;
    expect(both.audiences.map((a) => a.group_id)).toEqual([GROUP_ID, GROUP2_ID]); // pick order
    const author = (await feedFor(USER.author.id)).rows.find((r) => r.id === id)!;
    expect(author.audiences.map((a) => a.group_id)).toEqual([GROUP_ID, GROUP2_ID]);
  });

  it("followers + group: a follower or a G2 member sees it", async () => {
    const id = EXTRA_POSTS.followersAndGroup.postId;
    expect((await feedFor(USER.follower.id)).rows.some((r) => r.id === id)).toBe(true);
    expect((await feedFor(USER.group2Member.id)).rows.some((r) => r.id === id)).toBe(true);
    expect((await feedFor(USER.maleFiltered.id)).rows.some((r) => r.id === id)).toBe(false);
  });
});

describe("feed_page: media goes through media_items_visible", () => {
  for (const u of USERS) {
    it(`viewer=${u.key}: no withheld path, flags match expectedMedia`, async () => {
      const { rows } = await feedFor(u.id);
      for (const row of rows) {
        for (const m of row.media) {
          const fx = [...MEDIA, ...LEVEL_MEDIA].find((x) => x.mediaId === m.id)!;
          const exp = expectedMedia(u, fx);
          expect(exp.rowPresent, `${u.key} ${fx.classification}: row`).toBe(true);
          expect(m.storage_path !== null, `${u.key} ${fx.classification}: url`).toBe(exp.contentVisible);
          expect(m.is_filtered, `${u.key} ${fx.classification}: flag`).toBe(exp.isFiltered);
        }
      }
    });
  }

  it("a filtered viewer gets is_filtered true and a null path for contains_women", async () => {
    const { rows } = await feedFor(USER.maleFiltered.id);
    const cw = MEDIA.find((m) => m.classification === "contains_women" && m.exposure[0].kind === "public")!;
    const media = rows.find((r) => r.id === cw.postId)!.media[0]!;
    expect(media.storage_path).toBeNull();
    expect(media.is_filtered).toBe(true);
  });

  it("an unfiltered viewer gets the real path for the same media", async () => {
    const { rows } = await feedFor(USER.maleUnfiltered.id);
    const cw = MEDIA.find((m) => m.classification === "contains_women" && m.exposure[0].kind === "public")!;
    const media = rows.find((r) => r.id === cw.postId)!.media[0]!;
    expect(media.storage_path).toBeTruthy();
    expect(media.is_filtered).toBe(false);
  });

  it("the author sees their own contains_women media despite their own filter", async () => {
    const { rows } = await feedFor(USER.author.id);
    const cw = MEDIA.find((m) => m.classification === "contains_women" && m.exposure[0].kind === "public")!;
    expect(rows.find((r) => r.id === cw.postId)!.media.find((m) => m.id === cw.mediaId)!.storage_path).toBeTruthy();
  });
});

describe("feed_page: pagination is a stable seeded keyset", () => {
  it("pages through every post exactly once, in a stable order", async () => {
    const all = (await feedFor(USER.bothGroups.id)).rows;
    const paged: FeedRow[] = [];
    let after: FeedRow | null = null;
    for (let i = 0; i < 20; i++) {
      const page: { rows: FeedRow[] } = await db.asUser(USER.bothGroups.id, (q) =>
        q.query<FeedRow>(`select * from public.feed_page('seed-1', 2, $1, $2, 100)`, [
          after?.sort_key ?? null,
          after?.id ?? null,
        ])
      );
      if (page.rows.length === 0) break;
      paged.push(...page.rows);
      after = page.rows[page.rows.length - 1]!;
    }
    expect(paged.map((r) => r.id)).toEqual(all.map((r) => r.id));
  });

  it("a different seed draws a different order", async () => {
    const a = (await feedFor(USER.bothGroups.id)).rows.map((r) => r.id);
    const b = (
      await db.asUser(USER.bothGroups.id, (q) =>
        q.query<FeedRow>(`select * from public.feed_page('seed-2', 50, null, null, 100)`)
      )
    ).rows.map((r) => r.id);
    expect([...b].sort()).toEqual([...a].sort());
    expect(b).not.toEqual(a);
  });
});

describe("spaces_rail", () => {
  interface RailRow {
    space_kind: string;
    space_id: string;
    latest_post_id: string | null;
    latest_media: Array<{ id: string; storage_path: string | null; is_filtered: boolean }>;
  }
  const railFor = (userId: string) =>
    db.asUser(userId, (q) => q.query<RailRow>(`select * from public.spaces_rail('s', 20)`));

  it("lists only the viewer's own spaces", async () => {
    expect((await railFor(USER.maleFiltered.id)).rows).toHaveLength(0);
    expect((await railFor(USER.groupMember.id)).rows.map((r) => r.space_id)).toEqual([GROUP_ID]);
    expect((await railFor(USER.bothGroups.id)).rows.map((r) => r.space_id).sort()).toEqual([GROUP_ID, GROUP2_ID].sort());
    expect((await railFor(USER.fsMember.id)).rows.map((r) => r.space_id)).toEqual([FAMILY_SPACE_ID]);
  });

  it("the Family Space card previews a post; its media lifts sex only (carve-out)", async () => {
    // fsMember (maxima 0) and maleSexOnlyLifted (sex 0, violence 1) are both
    // sex-filtered; the space lifts sex for both, violence only for neither.
    const served = new Map<string, boolean>();
    for (const viewer of [USER.fsMember, USER.maleSexOnlyLifted]) {
      const card = (await railFor(viewer.id)).rows[0]!;
      expect(card.space_kind).toBe("family_space");
      expect(card.latest_post_id).not.toBeNull();
      expect(card.latest_media.length).toBeGreaterThan(0);
      for (const m of card.latest_media) {
        const fx = [...MEDIA, ...LEVEL_MEDIA].find((x) => x.mediaId === m.id)!;
        expect(fx.familySpaceId).toBe(FAMILY_SPACE_ID);
        const exp = expectedMedia(viewer, fx);
        expect(m.storage_path !== null, viewer.key).toBe(exp.contentVisible);
        expect(m.is_filtered, viewer.key).toBe(exp.isFiltered);
        served.set(viewer.key, (served.get(viewer.key) ?? false) || m.storage_path !== null);
      }
    }
    // Decisive both ways: violence 1 withholds from maxima 0, and a sex-2 item
    // is served on the rail to a sex-0 member once violence is within their max.
    expect(served.get("fsMember")).toBe(false);
    expect(served.get("maleSexOnlyLifted")).toBe(true);
  });

  it("a group card's preview media still obeys the viewer's filter", async () => {
    const card = (await railFor(USER.groupMember.id)).rows[0]!;
    expect(card.space_kind).toBe("group");
    for (const m of card.latest_media) {
      const fx = MEDIA.find((x) => x.mediaId === m.id)!;
      const exp = expectedMedia(USER.groupMember, fx);
      expect(m.storage_path !== null).toBe(exp.contentVisible);
    }
  });

  it("never previews a draft", async () => {
    const card = (await railFor(USER.bothGroups.id)).rows;
    for (const c of card) expect(c.latest_post_id).not.toBe(EXTRA_POSTS.draft.postId);
  });
});
