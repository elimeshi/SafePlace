/**
 * Abandoned-draft cleanup (ADR 0015, migration 20261020130100) and the
 * Family Space member count (migration 20261020130000).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canViewFamilySpaceMemberCount } from "@safeplace/visibility-policy";
import { sweepOrphans } from "@safeplace/moderation-pipeline";
import { createTestDb, type TestDb } from "../harness";
import { FAMILY_SPACE_ID, USER, USERS, seedFixtures } from "../seed";
import { viewerOf } from "../expected";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

describe("family_space_member_count", () => {
  it("matches canViewFamilySpaceMemberCount for every seeded user", async () => {
    const { rows: truth } = await db.raw.query<{ n: number }>(
      `select count(*)::int as n from public.family_space_members where space_id = $1`,
      [FAMILY_SPACE_ID]
    );
    for (const u of USERS) {
      const { rows } = await db.asUser(u.id, (q) =>
        q.query<{ n: number | null }>(`select public.family_space_member_count($1) as n`, [FAMILY_SPACE_ID])
      );
      const allowed = canViewFamilySpaceMemberCount(viewerOf(u), FAMILY_SPACE_ID);
      expect(rows[0]!.n, u.key).toBe(allowed ? truth[0]!.n : null);
    }
  });

  it("returns a number, never a list, and is closed to anon", async () => {
    await expect(db.asAnon((q) => q.query(`select public.family_space_member_count($1)`, [FAMILY_SPACE_ID]))).rejects.toThrow();
  });
});

const hx = (s: string) => `00000000-0000-0000-0000-${s.padStart(12, "0")}`;
const STALE = hx("fed1");
const FRESH = hx("fed2");
const queue = async () =>
  (await db.raw.query<{ storage_path: string }>(`select storage_path from moderation.orphaned_objects order by 1`)).rows.map(
    (r) => r.storage_path
  );

async function draftWithMedia(postId: string, mediaId: string, ageHours: number) {
  await db.raw.query(
    `insert into public.posts (id, author_id, text, status, created_at)
     values ($1, $2, 'd', 'draft', now() - make_interval(hours => $3))`,
    [postId, USER.author.id, ageHours]
  );
  await db.raw.query(
    `insert into public.media_items (id, post_id, uploader_id, storage_path) values ($1, $2, $3, $4)`,
    [mediaId, postId, USER.author.id, `media/${mediaId}`]
  );
  await db.raw.query(`insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)`, [
    `media/${mediaId}`,
    USER.author.id,
  ]);
}

describe("abandoned drafts and orphaned objects", () => {
  it("purge removes stale drafts only, and queues their media objects", async () => {
    await draftWithMedia(STALE, hx("fee1"), 48);
    await draftWithMedia(FRESH, hx("fee2"), 1);
    const { rows } = await db.asService((q) => q.query<{ n: number }>(`select public.purge_abandoned_drafts() as n`));
    expect(rows[0]!.n).toBe(1);
    const left = await db.raw.query(`select id from public.posts where id in ($1, $2)`, [STALE, FRESH]);
    expect(left.rows).toEqual([{ id: FRESH }]);
    expect(await queue()).toEqual([`media/${hx("fee1")}`]);
  });

  it("queues a client-removed attachment too", async () => {
    await db.asUser(USER.author.id, (q) => q.query(`delete from public.media_items where id = $1`, [hx("fee2")]));
    expect(await queue()).toEqual([`media/${hx("fee1")}`, `media/${hx("fee2")}`]);
  });

  it("clients cannot read or touch the queue", async () => {
    await expect(db.asUser(USER.author.id, (q) => q.query(`select * from moderation.orphaned_objects`))).rejects.toThrow();
  });

  const store = {
    claim: async (n: number) =>
      (await db.asService((q) => q.query<{ p: string }>(`select moderation.claim_orphaned_objects($1) as p`, [n]))).rows.map((r) => r.p),
    ack: async (paths: string[]) => {
      await db.asService((q) => q.query(`select moderation.ack_orphaned_objects($1::text[])`, [paths]));
    },
  };

  it("a failed removal leaves the paths queued", async () => {
    const objects = {
      remove: async () => {
        throw new Error("storage down");
      },
    };
    await expect(sweepOrphans({ store, objects })).rejects.toThrow("storage down");
    expect(await queue()).toHaveLength(2);
  });

  it("the sweep removes the objects and empties the queue", async () => {
    const objects = {
      remove: async (paths: string[]) => {
        await db.raw.query(`delete from storage.objects where name = any($1::text[])`, [paths]);
      },
    };
    expect(await sweepOrphans({ store, objects })).toEqual({ swept: 2 });
    expect(await queue()).toEqual([]);
    const left = await db.raw.query(`select name from storage.objects where name in ($1, $2)`, [`media/${hx("fee1")}`, `media/${hx("fee2")}`]);
    expect(left.rows).toEqual([]);
    expect(await sweepOrphans({ store, objects })).toEqual({ swept: 0 });
  });
});
