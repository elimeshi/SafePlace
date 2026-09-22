/**
 * The redaction feature end to end: a real image, the real sharp redactor, the
 * real SQL, and the real read model — ending at the question that matters,
 * which is what a filtered viewer is actually served.
 */
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createSharpRedactor,
  createStubClassifier,
  createStubLocalizer,
  drainOnce,
  DEFAULT_THRESHOLDS,
  type MediaFetcher,
  type Region,
  type WorkerDeps,
} from "@safeplace/moderation-pipeline";
import { createTestDb, type TestDb } from "../harness";
import {
  createPgliteJobStore,
  createPglitePersistedDerivativeStore,
} from "../pglite-job-store";
import { seedFixtures, USER } from "../seed";

let db: TestDb;
let image: Uint8Array;
const author = USER.author;
const filtered = USER.maleFiltered;
const unfiltered = USER.maleUnfiltered;

/** A 64x64 image with fine alternating detail, so redaction is measurable. */
async function makeImage(): Promise<Uint8Array> {
  const px = Buffer.alloc(64 * 64 * 3);
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const i = (y * 64 + x) * 3;
      px[i] = (x + y) % 2 ? 255 : 0;
      px[i + 1] = (x * 4) % 256;
      px[i + 2] = (y * 4) % 256;
    }
  }
  return new Uint8Array(
    await sharp(px, { raw: { width: 64, height: 64, channels: 3 } }).png().toBuffer()
  );
}

let seq = 0;
async function upload(): Promise<string> {
  seq += 1;
  const postId = `00000000-0000-0000-0000-${`da${seq}`.padStart(12, "0")}`;
  const mediaId = `00000000-0000-0000-0000-${`db${seq}`.padStart(12, "0")}`;
  await db.raw.query(
    `insert into public.posts (id, author_id, text, exposure_kind) values ($1, $2, 'r', 'public')`,
    [postId, author.id]
  );
  await db.asUser(author.id, (q) =>
    q.query(
      `insert into public.media_items (id, post_id, uploader_id, storage_path, content_type, classification)
       values ($1, $2, $3, $4, 'image/png', 'unclassified')`,
      [mediaId, postId, author.id, `media/${mediaId}`]
    )
  );
  await db.raw.query(
    `insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)`,
    [`media/${mediaId}`, author.id]
  );
  return mediaId;
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

function deps(options: { regions: Region[]; foundAll: boolean; recheckClean: boolean }): WorkerDeps {
  return {
    store: createPgliteJobStore(db),
    media: { fetch: async () => image } as MediaFetcher,
    provider: createStubClassifier({ verdict: "woman_present", confidence: 0.99 }),
    modelId: "stub-v1",
    workerId: "blur-e2e",
    thresholds: DEFAULT_THRESHOLDS,
    redaction: {
      localizer: createStubLocalizer({
        regions: options.regions,
        foundAll: options.foundAll,
      }),
      redactor: createSharpRedactor(),
      derivatives: createPglitePersistedDerivativeStore(db),
      recheck: options.recheckClean
        ? createStubClassifier({ verdict: "no_woman", confidence: 0.99 })
        : createStubClassifier({ verdict: "woman_present", confidence: 0.9 }),
      maxCoverage: 0.5,
      padding: 0.15,
    },
  };
}

beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
  image = await makeImage();
  await db.asService((q) =>
    q.query(`update moderation.pipeline_config set region_blur_enabled = true`)
  );
});
afterAll(async () => {
  await db.close();
});

describe("flagged media with a verified derivative", () => {
  it("is served blurred to a filtered viewer and whole to everyone else", async () => {
    const mediaId = await upload();
    await drainOnce(
      deps({ regions: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }], foundAll: true, recheckClean: true }),
      50
    );

    const view = await served(filtered.id, mediaId);
    expect(view).toMatchObject({
      storage_path: `media/${mediaId}.redacted.png`,
      is_filtered: true,
      is_redacted: true,
    });

    expect(await served(unfiltered.id, mediaId)).toMatchObject({
      storage_path: `media/${mediaId}`,
      is_redacted: false,
    });
    expect(await served(author.id, mediaId)).toMatchObject({
      storage_path: `media/${mediaId}`,
    });
  });

  it("lets that viewer reach the derivative and still not the original", async () => {
    const mediaId = await upload();
    await drainOnce(
      deps({ regions: [{ x: 0.2, y: 0.2, width: 0.2, height: 0.2 }], foundAll: true, recheckClean: true }),
      50
    );

    const canSign = async (path: string) => {
      const { rows } = await db.asUser(filtered.id, (q) =>
        q.query<{ n: number }>(
          `select count(*)::int as n from storage.objects where bucket_id = 'media' and name = $1`,
          [path]
        )
      );
      return rows[0]?.n === 1;
    };

    expect(await canSign(`media/${mediaId}.redacted.png`)).toBe(true);
    expect(await canSign(`media/${mediaId}`)).toBe(false);
  });

  it("records what was done", async () => {
    const mediaId = await upload();
    await drainOnce(
      deps({ regions: [{ x: 0.3, y: 0.3, width: 0.1, height: 0.1 }], foundAll: true, recheckClean: true }),
      50
    );
    const { rows } = await db.asService((q) =>
      q.query<{ region_count: number; verified: boolean }>(
        `select region_count, verified from moderation.redactions where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(rows[0]).toMatchObject({ region_count: 1, verified: true });
  });
});

describe("when the pipeline is not confident, it withholds as before", () => {
  it("falls back when the re-check still sees a woman in the output", async () => {
    const mediaId = await upload();
    await drainOnce(
      deps({ regions: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }], foundAll: true, recheckClean: false }),
      50
    );

    expect(await served(filtered.id, mediaId)).toMatchObject({
      storage_path: null,
      is_filtered: true,
      is_redacted: false,
    });
    const { rows } = await db.asService((q) =>
      q.query(`select 1 from moderation.redactions where media_item_id = $1`, [mediaId])
    );
    expect(rows).toHaveLength(0);
  });

  it("falls back when the localizer will not claim completeness", async () => {
    const mediaId = await upload();
    await drainOnce(
      deps({ regions: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }], foundAll: false, recheckClean: true }),
      50
    );
    expect(await served(filtered.id, mediaId)).toMatchObject({
      storage_path: null,
      is_redacted: false,
    });
  });

  it("falls back when the regions would cover most of the image", async () => {
    const mediaId = await upload();
    await drainOnce(
      deps({ regions: [{ x: 0, y: 0, width: 0.9, height: 0.9 }], foundAll: true, recheckClean: true }),
      50
    );
    expect(await served(filtered.id, mediaId)).toMatchObject({ storage_path: null });
  });
});
