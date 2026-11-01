/**
 * Dedupe lookup (ADR 0019): moderation.find_resolved_by_hash answers from
 * resolved rows only, by exact SHA-256 equality (never dHash), never with the asking row
 * itself, and only to the pipeline (service_role).
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { insertPublicPost, seedFixtures, USER } from "../seed";

let db: TestDb;
const author = USER.author;
const POST_ID = "00000000-0000-0000-0000-0000000007a1";
const id = (n: number): string => `00000000-0000-0000-0000-${`7b${n}`.padStart(12, "0")}`;

async function upload(n: number): Promise<string> {
  await db.asUser(author.id, (q) =>
    q.query(
      `insert into public.media_items (id, post_id, uploader_id, storage_path, classification)
       values ($1, $2, $3, $4, 'unclassified')`,
      [id(n), POST_ID, author.id, `${author.id}/${id(n)}`]
    )
  );
  return id(n);
}

const lookup = (sha: string | null, dhash: string | null, exclude: string) =>
  db.asService((q) =>
    q.query<{ media_item_id: string; classification: string; violence_level: number }>(
      `select * from moderation.find_resolved_by_hash($1, $2, $3)`,
      [sha, dhash, exclude]
    )
  );

beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
  await insertPublicPost(db.raw, POST_ID, author.id, "dedupe");
});
afterAll(async () => {
  await db.close();
});

it("finds a resolved row with the same hash, with its levels", async () => {
  const first = await upload(1);
  const second = await upload(2);
  await db.asService((q) =>
    q.query(
      `select moderation.complete_classification_job($1,'general','stub','m','levels',0.9,0.05,$2,null,null,'abc','d1')`,
      [first, JSON.stringify({ sex: 0, violence: 1, religion: 0, addictions: 0 })]
    )
  );

  const bySha = await lookup("abc", null, second);
  expect(bySha.rows).toEqual([
    expect.objectContaining({ media_item_id: first, classification: "general", violence_level: 1 }),
  ]);
  // Never answers with the asking row itself, and exact equality only.
  expect((await lookup("abc", null, first)).rows).toEqual([]);
  expect((await lookup("ab", "d", second)).rows).toEqual([]);
});

it("a dHash-only match copies nothing: the fingerprint is forgeable (ADR 0019 amendment)", async () => {
  const cleared = await upload(6);
  const asking = await upload(7);
  // A solid image's dHash — the same value a ramp-overlaid photo can be made to hash to.
  const forgeable = "0000000000000000";
  await db.asService((q) =>
    q.query(
      `select moderation.complete_classification_job($1,'general','stub','m','levels',0.9,0.05,$2,null,null,'sha-cleared',$3)`,
      [cleared, JSON.stringify({ sex: 0, violence: 0, religion: 0, addictions: 0 }), forgeable]
    )
  );
  const { rows } = await db.raw.query(`select content_dhash from public.media_items where id = $1`, [cleared]);
  expect(rows[0]).toEqual({ content_dhash: forgeable }); // still stored
  expect((await lookup(null, forgeable, asking)).rows).toEqual([]);
  expect((await lookup("sha-other", forgeable, asking)).rows).toEqual([]);
});

it("ignores a row that is not resolved (pending_review)", async () => {
  const frozen = await upload(3);
  const asking = await upload(4);
  await db.asService((q) =>
    q.query(
      `select moderation.complete_classification_job($1,'pending_review','stub','m','levels',0.5,0.5,null,null,null,'def',null)`,
      [frozen]
    )
  );
  const { rows } = await db.raw.query(`select content_sha256 from public.media_items where id = $1`, [frozen]);
  expect(rows[0]).toEqual({ content_sha256: "def" });
  expect((await lookup("def", null, asking)).rows).toEqual([]);
});

it("a client cannot plant a hash on its own upload (it would borrow another row's verdict)", async () => {
  await expect(
    db.asUser(author.id, (q) =>
      q.query(
        `insert into public.media_items (id, post_id, uploader_id, storage_path, classification, content_sha256)
         values ($1, $2, $3, $4, 'unclassified', 'abc')`,
        [id(5), POST_ID, author.id, `${author.id}/${id(5)}`]
      )
    )
  ).rejects.toThrow(/row-level security/i);
  await expect(
    db.asUser(author.id, (q) =>
      q.query(
        `insert into public.media_items (id, post_id, uploader_id, storage_path, classification, content_dhash)
         values ($1, $2, $3, $4, 'unclassified', '0000000000000000')`,
        [id(8), POST_ID, author.id, `${author.id}/${id(8)}`]
      )
    )
  ).rejects.toThrow(/row-level security/i);
});

it("is closed to clients", async () => {
  await expect(
    db.asUser(author.id, (q) => q.query(`select * from moderation.find_resolved_by_hash('abc', null, $1)`, [id(2)]))
  ).rejects.toThrow(/permission denied/i);
  await expect(
    db.asAnon((q) => q.query(`select * from moderation.find_resolved_by_hash('abc', null, $1)`, [id(2)]))
  ).rejects.toThrow(/permission denied/i);
});
