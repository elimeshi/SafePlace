/**
 * Write-side RLS enforcement — the invariants that aren't about read
 * visibility:
 *  - invariant #1: a client can never set/downgrade a media classification;
 *    only the pipeline (service_role) may. Clients insert 'unclassified' only,
 *    and only onto their OWN content.
 *  - invariant #5 "number without list": follow edges/memberships are private
 *    to the user; only aggregate counts are public.
 *  - invariant #3 defaults-are-not-rules: a user can toggle their own filter at
 *    will and it immediately changes what they see.
 *  - filter_settings are readable only by their owner.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { MEDIA, USER, USERS, seedFixtures } from "../seed";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

const publicOf = (cls: string) =>
  MEDIA.find((m) => m.exposure[0].kind === "public" && m.classification === cls)!;

// --- invariant #1: classification is not client-writable ---------------------

it("rejects a client inserting media as already-classified", async () => {
  const post = publicOf("general");
  await expect(
    db.asUser(USER.author.id, (q) =>
      q.query(
        `insert into public.media_items (post_id, uploader_id, storage_path, classification)
         values ($1, $2, 'media/x', 'contains_women')`,
        [post.postId, USER.author.id]
      )
    )
  ).rejects.toThrow(/row-level security/i);
});

it("rejects attaching media to another user's post", async () => {
  const post = publicOf("general"); // authored by `author`
  await expect(
    db.asUser(USER.maleFiltered.id, (q) =>
      q.query(
        `insert into public.media_items (post_id, uploader_id, storage_path, classification)
         values ($1, $2, 'media/y', 'unclassified')`,
        [post.postId, USER.maleFiltered.id]
      )
    )
  ).rejects.toThrow(/row-level security/i);
});

it("does not let the uploader change their own media's classification", async () => {
  const pending = publicOf("pending_review");
  await db.asUser(USER.author.id, (q) =>
    q.query(`update public.media_items set classification = 'general' where id = $1`, [
      pending.mediaId,
    ])
  );
  const { rows } = await db.raw.query<{ classification: string }>(
    `select classification from public.media_items where id = $1`,
    [pending.mediaId]
  );
  expect(rows[0]?.classification).toBe("pending_review");
});

it("lets the pipeline (service_role) transition classification", async () => {
  const target = publicOf("unclassified");
  await db.asService((q) =>
    q.query(
      `update public.media_items set classification = 'general',
         sex_level = 0, violence_level = 0, religion_level = 0, addictions_level = 0
       where id = $1`,
      [target.mediaId]
    )
  );
  const { rows } = await db.raw.query<{ classification: string }>(
    `select classification from public.media_items where id = $1`,
    [target.mediaId]
  );
  expect(rows[0]?.classification).toBe("general");
  // restore so later assertions/other files aren't affected via shared fixtures logic
  await db.raw.query(
    `update public.media_items set classification = 'unclassified',
       sex_level = null, violence_level = null, religion_level = null, addictions_level = null
     where id = $1`,
    [target.mediaId]
  );
});

// --- filter_settings are owner-private --------------------------------------

it("hides another user's filter_settings", async () => {
  const { rows } = await db.asUser(USER.maleFiltered.id, (q) =>
    q.query(`select * from public.filter_settings where user_id = $1`, [USER.author.id])
  );
  expect(rows).toHaveLength(0);
});

// --- number without list -----------------------------------------------------

it("exposes only the caller's own follow edges, but a public count", async () => {
  // follower → author is seeded. A third party cannot enumerate it...
  const stranger = await db.asUser(USER.maleFiltered.id, (q) =>
    q.query(`select * from public.follows`)
  );
  expect(stranger.rows).toHaveLength(0);

  // ...but the follower can see their own edge...
  const own = await db.asUser(USER.follower.id, (q) =>
    q.query(`select * from public.follows`)
  );
  expect(own.rows).toHaveLength(1);

  // ...and anyone can read the aggregate count.
  const count = await db.asUser(USER.maleFiltered.id, (q) =>
    q.query<{ c: number }>(`select public.follower_count($1) as c`, [USER.author.id])
  );
  expect(Number(count.rows[0]?.c)).toBe(
    USERS.filter((u) => u.follows.includes(USER.author.id)).length
  );
});

it("gives an anonymous request nothing (locked out at the grant layer)", async () => {
  // The MVP requires auth: `anon` has no table grants at all — stricter than
  // RLS-deny. A logged-out read is refused outright rather than returning [].
  await expect(
    db.asAnon((q) => q.query(`select * from public.posts`))
  ).rejects.toThrow(/permission denied/i);
});

// --- defaults-are-not-rules: the toggle actually works ----------------------

it("lets a user flip their own content filter and immediately see the effect", async () => {
  const cw = publicOf("contains_women");
  const hasUrl = async () => {
    const { rows } = await db.asUser(USER.maleFiltered.id, (q) =>
      q.query<{ has_url: boolean }>(
        `select storage_path is not null as has_url from media_items_visible where id = $1`,
        [cw.mediaId]
      )
    );
    return rows[0]?.has_url ?? null;
  };
  const setHide = (v: boolean) =>
    db.asUser(USER.maleFiltered.id, (q) =>
      q.query(`update public.filter_settings set max_sex_level = $1 where user_id = $2`, [
        v ? 0 : 1,
        USER.maleFiltered.id,
      ])
    );

  expect(await hasUrl()).toBe(false); // default male: filtered
  await setHide(false);
  expect(await hasUrl()).toBe(true); // toggled off: now visible
  await setHide(true); // restore seeded state
  expect(await hasUrl()).toBe(false);
});

it("does not let a user change someone else's content filter", async () => {
  const { rows } = await db.asUser(USER.maleFiltered.id, (q) =>
    q.query(`update public.filter_settings set max_sex_level = 2 where user_id = $1 returning user_id`, [
      USER.author.id,
    ])
  );
  expect(rows).toHaveLength(0);
  const truth = await db.raw.query<{ max_sex_level: number }>(
    `select max_sex_level from public.filter_settings where user_id = $1`,
    [USER.author.id]
  );
  expect(truth.rows[0]?.max_sex_level).toBe(0);
});
