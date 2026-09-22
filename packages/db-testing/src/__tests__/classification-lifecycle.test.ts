/**
 * The DB-tier contract the classification worker is built on: a client may
 * only ever insert media as 'unclassified', only the service role may move it,
 * and each resolved state changes exactly what media_items_visible serves and
 * what storage will sign. The worker in services/moderation-pipeline depends
 * on every assertion here.
 *
 * Complements the parity suites, which prove the DB agrees with
 * @safeplace/visibility-policy over the fixture matrix; this one walks a single
 * item through the lifecycle transitions instead.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { seedFixtures, USER } from "../seed";

let db: TestDb;

const POST_ID = "00000000-0000-0000-0000-0000000009a1";
const MEDIA_ID = "00000000-0000-0000-0000-0000000009b1";
const PATH = `media/${MEDIA_ID}`;
const author = USER.author;
const filteredViewer = USER.maleFiltered;      // hideContentWithWomen = true
const unfilteredViewer = USER.maleUnfiltered;  // hideContentWithWomen = false

interface VisRow { id: string; classification: string; storage_path: string | null; is_filtered: boolean }

async function viewAs(userId: string) {
  const { rows } = await db.asUser(userId, (q) =>
    q.query<VisRow>(
      `select id, classification, storage_path, is_filtered from media_items_visible where id = $1`,
      [MEDIA_ID]
    )
  );
  return rows[0] ?? null;
}

async function canSignAs(userId: string) {
  const { rows } = await db.asUser(userId, (q) =>
    q.query<{ n: number }>(
      `select count(*)::int as n from storage.objects where bucket_id = 'media' and name = $1`,
      [PATH]
    )
  );
  return rows[0]?.n === 1;
}

async function setClassification(value: string) {
  await db.asService((q) =>
    q.query(`update public.media_items set classification = $2::media_classification, classified_at = now() where id = $1`, [MEDIA_ID, value])
  );
}

beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
  // A fresh public post by the author to hang the new media on.
  await db.raw.query(
    `insert into public.posts (id, author_id, text, exposure_kind) values ($1, $2, 'phase3', 'public')`,
    [POST_ID, author.id]
  );
});
afterAll(async () => { await db.close(); });

describe("1. a client can insert media, and only as 'unclassified'", () => {
  it("authenticated INSERT as 'unclassified' succeeds", async () => {
    await db.asUser(author.id, (q) =>
      q.query(
        `insert into public.media_items (id, post_id, uploader_id, storage_path, classification)
         values ($1, $2, $3, $4, 'unclassified')`,
        [MEDIA_ID, POST_ID, author.id, PATH]
      )
    );
    await db.raw.query(`insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)`, [PATH, author.id]);
    const { rows } = await db.raw.query<{ classification: string; classified_at: string | null }>(
      `select classification, classified_at from public.media_items where id = $1`, [MEDIA_ID]
    );
    expect(rows[0]).toEqual({ classification: "unclassified", classified_at: null });
  });

  it("authenticated INSERT pre-set to 'general' is REJECTED", async () => {
    await expect(
      db.asUser(author.id, (q) =>
        q.query(
          `insert into public.media_items (id, post_id, uploader_id, storage_path, classification)
           values ('00000000-0000-0000-0000-0000000009b2', $1, $2, 'media/x', 'general')`,
          [POST_ID, author.id]
        )
      )
    ).rejects.toThrow(/row-level security/i);
  });

  it("authenticated UPDATE of classification is REJECTED (no UPDATE policy)", async () => {
    const { rows } = await db.asUser(author.id, (q) =>
      q.query(`update public.media_items set classification = 'general' where id = $1 returning id`, [MEDIA_ID])
    );
    expect(rows).toHaveLength(0);
    const truth = await db.raw.query<{ classification: string }>(`select classification from public.media_items where id = $1`, [MEDIA_ID]);
    expect(truth.rows[0]?.classification).toBe("unclassified");
  });
});

describe("2. the service-role write flips what the view serves", () => {
  it("'unclassified' — row visible to others but reference withheld (processing)", async () => {
    // Fails closed until the worker resolves it (migration 0007): the row is
    // present so the UI can render a processing state, but no other viewer
    // gets the path, and storage will not sign it for them.
    const other = await viewAs(filteredViewer.id);
    expect(other).toMatchObject({
      classification: "unclassified",
      storage_path: null,
      is_filtered: true,
    });
    expect(await canSignAs(filteredViewer.id)).toBe(false);

    // The uploader is unaffected while their own upload is in flight.
    expect((await viewAs(author.id))?.storage_path).toBe(PATH);
    expect(await canSignAs(author.id)).toBe(true);
  });

  it("→ 'general': still served to the filtered viewer", async () => {
    await setClassification("general");
    const row = await viewAs(filteredViewer.id);
    expect(row).toMatchObject({ classification: "general", storage_path: PATH, is_filtered: false });
    expect(await canSignAs(filteredViewer.id)).toBe(true);
  });

  it("→ 'contains_women': withheld from the filtered viewer, served to the unfiltered one and to the uploader", async () => {
    await setClassification("contains_women");

    const filtered = await viewAs(filteredViewer.id);
    expect(filtered).toMatchObject({ classification: "contains_women", storage_path: null, is_filtered: true });

    const unfiltered = await viewAs(unfilteredViewer.id);
    expect(unfiltered).toMatchObject({ storage_path: PATH, is_filtered: false });

    const uploader = await viewAs(author.id);
    expect(uploader).toMatchObject({ storage_path: PATH, is_filtered: false });
  });

  it("→ 'pending_review': frozen — row invisible to others, visible to the uploader", async () => {
    await setClassification("pending_review");
    expect(await viewAs(filteredViewer.id)).toBeNull();
    expect(await viewAs(unfilteredViewer.id)).toBeNull();
    expect(await viewAs(author.id)).toMatchObject({ storage_path: PATH, is_filtered: false });
  });
});

describe("3. storage refuses to sign a withheld object", () => {
  it("filtered viewer cannot reach the object of a contains_women item", async () => {
    await setClassification("contains_women");
    expect(await canSignAs(filteredViewer.id)).toBe(false);
    expect(await canSignAs(unfilteredViewer.id)).toBe(true);
    expect(await canSignAs(author.id)).toBe(true);
  });

  it("nobody but the uploader can reach the object of a pending_review item", async () => {
    await setClassification("pending_review");
    expect(await canSignAs(filteredViewer.id)).toBe(false);
    expect(await canSignAs(unfilteredViewer.id)).toBe(false);
    expect(await canSignAs(author.id)).toBe(true);
  });
});
