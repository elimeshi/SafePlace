/**
 * Serving a redacted derivative instead of withholding the image entirely.
 *
 * The mechanism reuses the one that already exists: media_items_visible
 * decides which path a viewer is served, and storage will only sign a path
 * that view returned. So a filtered viewer is handed the blurred object's path
 * and can sign THAT, while the original remains unreachable by the same rule
 * that protected it before.
 *
 * Off by default. The feature is gated behind moderation.pipeline_config until
 * it has product sign-off — see ADR 0012.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { seedFixtures, USER } from "../seed";

let db: TestDb;
const author = USER.author;
const filtered = USER.maleFiltered;
const unfiltered = USER.maleUnfiltered;

let seq = 0;
async function mediaWithDerivative(classification: string): Promise<{
  mediaId: string;
  originalPath: string;
  blurredPath: string;
}> {
  seq += 1;
  const postId = `00000000-0000-0000-0000-${`ca${seq}`.padStart(12, "0")}`;
  const mediaId = `00000000-0000-0000-0000-${`cb${seq}`.padStart(12, "0")}`;
  const originalPath = `media/${mediaId}`;
  const blurredPath = `media/${mediaId}.redacted`;

  await db.raw.query(
    `insert into public.posts (id, author_id, text, exposure_kind) values ($1, $2, 'b', 'public')`,
    [postId, author.id]
  );
  await db.raw.query(
    `insert into public.media_items
       (id, post_id, uploader_id, storage_path, blurred_storage_path, content_type, classification, classified_at)
     values ($1, $2, $3, $4, $5, 'image/jpeg', $6::media_classification, now())`,
    [mediaId, postId, author.id, originalPath, blurredPath, classification]
  );
  for (const name of [originalPath, blurredPath]) {
    await db.raw.query(
      `insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)`,
      [name, author.id]
    );
  }
  return { mediaId, originalPath, blurredPath };
}

async function setBlurEnabled(enabled: boolean): Promise<void> {
  await db.asService((q) =>
    q.query(`update moderation.pipeline_config set region_blur_enabled = $1`, [enabled])
  );
}

async function served(userId: string, mediaId: string) {
  const { rows } = await db.asUser(userId, (q) =>
    q.query<{ storage_path: string | null; is_filtered: boolean; is_redacted: boolean }>(
      `select storage_path, is_filtered, is_redacted from media_items_visible where id = $1`,
      [mediaId]
    )
  );
  return rows[0] ?? null;
}

async function canSign(userId: string, path: string): Promise<boolean> {
  const { rows } = await db.asUser(userId, (q) =>
    q.query<{ n: number }>(
      `select count(*)::int as n from storage.objects where bucket_id = 'media' and name = $1`,
      [path]
    )
  );
  return rows[0]?.n === 1;
}

beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

describe("the feature is off until it is switched on", () => {
  it("withholds the image entirely while disabled, derivative or not", async () => {
    await setBlurEnabled(false);
    const { mediaId } = await mediaWithDerivative("contains_women");
    expect(await served(filtered.id, mediaId)).toMatchObject({
      storage_path: null,
      is_filtered: true,
      is_redacted: false,
    });
  });
});

describe("with region blur enabled", () => {
  beforeAll(() => setBlurEnabled(true));

  it("serves the derivative to a viewer the filter applies to", async () => {
    const { mediaId, blurredPath } = await mediaWithDerivative("contains_women");
    expect(await served(filtered.id, mediaId)).toMatchObject({
      storage_path: blurredPath,
      is_filtered: true,
      is_redacted: true,
    });
  });

  it("never hands that viewer the original, by the rule that already protected it", async () => {
    const { mediaId, originalPath, blurredPath } = await mediaWithDerivative("contains_women");
    await served(filtered.id, mediaId);
    expect(await canSign(filtered.id, blurredPath)).toBe(true);
    expect(await canSign(filtered.id, originalPath)).toBe(false);
  });

  it("still gives the unfiltered viewer and the uploader the original", async () => {
    const { mediaId, originalPath } = await mediaWithDerivative("contains_women");
    expect(await served(unfiltered.id, mediaId)).toMatchObject({
      storage_path: originalPath,
      is_filtered: false,
      is_redacted: false,
    });
    expect(await served(author.id, mediaId)).toMatchObject({ storage_path: originalPath });
  });

  it("does not serve a derivative for frozen media — a human has not decided yet", async () => {
    const { mediaId } = await mediaWithDerivative("pending_review");
    expect(await served(filtered.id, mediaId)).toBeNull();
  });

  it("does not serve a derivative for media still in the pipeline", async () => {
    const { mediaId } = await mediaWithDerivative("unclassified");
    expect(await served(filtered.id, mediaId)).toMatchObject({
      storage_path: null,
      is_redacted: false,
    });
  });

  it("falls back to withholding when no derivative was produced", async () => {
    seq += 1;
    const postId = `00000000-0000-0000-0000-${`cc${seq}`.padStart(12, "0")}`;
    const mediaId = `00000000-0000-0000-0000-${`cd${seq}`.padStart(12, "0")}`;
    await db.raw.query(
      `insert into public.posts (id, author_id, text, exposure_kind) values ($1, $2, 'n', 'public')`,
      [postId, author.id]
    );
    await db.raw.query(
      `insert into public.media_items
         (id, post_id, uploader_id, storage_path, content_type, classification, classified_at)
       values ($1, $2, $3, $4, 'image/jpeg', 'contains_women', now())`,
      [mediaId, postId, author.id, `media/${mediaId}`]
    );
    expect(await served(filtered.id, mediaId)).toMatchObject({
      storage_path: null,
      is_filtered: true,
      is_redacted: false,
    });
  });
});

describe("redaction bookkeeping stays internal", () => {
  it("records what was done without recording where anyone was", async () => {
    const { mediaId } = await mediaWithDerivative("contains_women");
    await db.asService((q) =>
      q.query(
        `insert into moderation.redactions
           (media_item_id, region_count, coverage, localizer, model_id, verified)
         values ($1, 2, 0.180, 'stub', 'stub-v1', true)`,
        [mediaId]
      )
    );
    const { rows } = await db.asService((q) =>
      q.query<{ region_count: number; verified: boolean }>(
        `select region_count, verified from moderation.redactions where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(rows[0]).toMatchObject({ region_count: 2, verified: true });

    // No column holds the rectangles themselves: "a woman is at these
    // coordinates in this person's photo" is a more sensitive record than the
    // verdict, and nothing downstream needs it once the derivative exists.
    const { rows: columns } = await db.asService((q) =>
      q.query<{ column_name: string }>(
        `select column_name from information_schema.columns
          where table_schema = 'moderation' and table_name = 'redactions'`
      )
    );
    const names = columns.map((c) => c.column_name);
    expect(names).not.toContain("regions");
    expect(names).not.toContain("x");
  });

  it("is invisible to clients", async () => {
    await expect(
      db.asUser(filtered.id, (q) => q.query(`select * from moderation.redactions`))
    ).rejects.toThrow(/permission denied|does not exist/i);
  });
});
