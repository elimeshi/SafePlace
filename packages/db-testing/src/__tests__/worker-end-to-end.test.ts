/**
 * The whole pipeline in one place: a client uploads media, the database
 * enqueues it, the real worker drains the queue against the real SQL, and the
 * media's visibility changes for real viewers exactly as
 * @safeplace/visibility-policy says it should.
 *
 * The unit suites prove the worker's decisions and the parity suites prove the
 * database's enforcement; this is the seam between them, which is where a
 * pipeline that "works" in both halves can still fail as a whole.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  allUncertain,
  createStubClassifier,
  drainOnce,
  DEFAULT_THRESHOLDS,
  type MediaFetcher,
  verdictsOf,
  type WorkerDeps,
} from "@safeplace/moderation-pipeline";
import { createTestDb, type TestDb } from "../harness";
import { createPgliteJobStore } from "../pglite-job-store";
import { insertPublicPost, seedFixtures, USER } from "../seed";

let db: TestDb;
const author = USER.author;
const filteredViewer = USER.maleFiltered;
const unfilteredViewer = USER.maleUnfiltered;

// Distinct bytes per object, so hash dedupe (ADR 0019) never links unrelated uploads.
const bytes: MediaFetcher = { fetch: async (path) => new TextEncoder().encode(path) };

let seq = 0;
async function uploadAsAuthor(contentType = "image/jpeg"): Promise<string> {
  seq += 1;
  const postId = `00000000-0000-0000-0000-${`ab${seq}`.padStart(12, "0")}`;
  const mediaId = `00000000-0000-0000-0000-${`ac${seq}`.padStart(12, "0")}`;
  await insertPublicPost(db.raw, postId, author.id, "e2e");
  await db.asUser(author.id, (q) =>
    q.query(
      `insert into public.media_items (id, post_id, uploader_id, storage_path, content_type, classification)
       values ($1, $2, $3, $4, $5, 'unclassified')`,
      [mediaId, postId, author.id, `${author.id}/${mediaId}`, contentType]
    )
  );
  await db.raw.query(
    `insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)`,
    [`${author.id}/${mediaId}`, author.id]
  );
  return mediaId;
}

async function servedUrlTo(userId: string, mediaId: string): Promise<string | null> {
  const { rows } = await db.asUser(userId, (q) =>
    q.query<{ storage_path: string | null }>(
      `select storage_path from media_items_visible where id = $1`,
      [mediaId]
    )
  );
  return rows[0]?.storage_path ?? null;
}

function deps(provider: WorkerDeps["provider"], media: MediaFetcher = bytes): WorkerDeps {
  return {
    store: createPgliteJobStore(db),
    media,
    provider,
    modelId: "stub-v1",
    workerId: "e2e",
    thresholds: DEFAULT_THRESHOLDS,
  };
}

beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

describe("upload → enqueue → classify → visibility", () => {
  it("a confident negative becomes visible to a filtered viewer", async () => {
    const mediaId = await uploadAsAuthor();
    expect(await servedUrlTo(filteredViewer.id, mediaId)).toBeNull(); // in flight

    const summary = await drainOnce(
      deps(createStubClassifier({ fallback: verdictsOf({}, 0.95) })),
      50
    );
    expect(summary.classified).toBeGreaterThanOrEqual(1);

    expect(await servedUrlTo(filteredViewer.id, mediaId)).toBe(`${author.id}/${mediaId}`);
  });

  it("the resolved levels and the content hash land on the media row", async () => {
    const mediaId = await uploadAsAuthor();
    await drainOnce(
      deps(createStubClassifier({ fallback: verdictsOf({ religion: { level: 1, confidence: 0.95 } }, 0.95) })),
      50
    );
    const { rows } = await db.asService((q) =>
      q.query(
        `select classification, sex_level, violence_level, religion_level, addictions_level,
                content_sha256 is not null as hashed
           from public.media_items where id = $1`,
        [mediaId]
      )
    );
    expect(rows[0]).toEqual({
      classification: "general",
      sex_level: 0,
      violence_level: 0,
      religion_level: 1,
      addictions_level: 0,
      hashed: true,
    });
  });

  it("an identical re-upload copies the verdict without calling the model", async () => {
    const same: MediaFetcher = { fetch: async () => new Uint8Array([7, 7, 7, 7]) };
    const first = await uploadAsAuthor();
    await drainOnce(
      deps(createStubClassifier({ fallback: verdictsOf({ sex: { level: 1, confidence: 0.99 } }, 0.99) }), same),
      50
    );
    const second = await uploadAsAuthor();
    await drainOnce(
      deps(
        {
          name: "never-called",
          classify: async () => {
            throw new Error("a duplicate must not reach the model");
          },
        },
        same
      ),
      50
    );

    const { rows } = await db.asService((q) =>
      q.query<{ classification: string; sex_level: number; model_id: string }>(
        `select m.classification, m.sex_level, s.model_id
           from public.media_items m
           join moderation.classification_scores s on s.media_item_id = m.id
          where m.id = $1`,
        [second]
      )
    );
    expect(rows[0]).toEqual({ classification: "contains_women", sex_level: 1, model_id: `copy:${first}` });
    expect(await servedUrlTo(filteredViewer.id, second)).toBeNull();
  });

  it("a confident positive stays withheld from a filtered viewer and reaches an unfiltered one", async () => {
    const mediaId = await uploadAsAuthor();
    await drainOnce(
      deps(createStubClassifier({ fallback: verdictsOf({ sex: { level: 1, confidence: 0.99 } }, 0.99) })),
      50
    );

    expect(await servedUrlTo(filteredViewer.id, mediaId)).toBeNull();
    expect(await servedUrlTo(unfilteredViewer.id, mediaId)).toBe(`${author.id}/${mediaId}`);
    // The uploader always sees their own, whatever the verdict.
    expect(await servedUrlTo(author.id, mediaId)).toBe(`${author.id}/${mediaId}`);
  });

  it("an uncertain verdict freezes the item and files it for a human", async () => {
    const mediaId = await uploadAsAuthor();
    await drainOnce(deps(createStubClassifier({ fallback: allUncertain() })), 50);

    // Frozen: nobody but the uploader can even see the row.
    expect(await servedUrlTo(unfilteredViewer.id, mediaId)).toBeNull();
    expect(await servedUrlTo(author.id, mediaId)).toBe(`${author.id}/${mediaId}`);

    const { rows } = await db.asService((q) =>
      q.query<{ reason: string }>(
        `select reason from moderation.review_queue where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(rows[0]?.reason).toBe("ai_medium_confidence");
  });

  it("drains the queue empty and leaves nothing claimable behind", async () => {
    await uploadAsAuthor();
    await uploadAsAuthor();
    await drainOnce(deps(createStubClassifier({ fallback: verdictsOf({}, 0.95) })), 50);

    const { rows } = await db.asService((q) =>
      q.query<{ n: string }>(
        `select count(*) as n from moderation.classification_jobs
          where state = 'queued' and next_attempt_at <= now()`
      )
    );
    expect(Number(rows[0]?.n)).toBe(0);
  });

  it("a provider outage leaves the media withheld, not wrongly approved", async () => {
    const mediaId = await uploadAsAuthor();
    await drainOnce(
      deps({
        name: "broken",
        classify: async () => {
          throw new Error("upstream down");
        },
      }),
      50
    );

    // Still unclassified → still withheld. The failure mode of the whole
    // pipeline is "nobody sees it yet", never "everybody sees it".
    expect(await servedUrlTo(filteredViewer.id, mediaId)).toBeNull();
    expect(await servedUrlTo(unfilteredViewer.id, mediaId)).toBeNull();

    const { rows } = await db.asService((q) =>
      q.query<{ state: string; attempts: number }>(
        `select state, attempts from moderation.classification_jobs where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(rows[0]).toMatchObject({ state: "queued", attempts: 1 });
  });

  it("a video is sent to a human rather than guessed at by an image model", async () => {
    // MVP classifies images only (ADR 0010). A video must not be scored by an
    // image classifier, and must not sit unclassified either — that would make
    // it invisible to everyone but its uploader for good.
    const mediaId = await uploadAsAuthor("video/mp4");
    await drainOnce(
      deps({
        name: "never-called",
        classify: async () => {
          throw new Error("an image classifier must not see a video");
        },
      }),
      50
    );

    const { rows } = await db.asService((q) =>
      q.query<{ classification: string }>(
        `select classification from public.media_items where id = $1`,
        [mediaId]
      )
    );
    expect(rows[0]?.classification).toBe("pending_review");

    const { rows: queued } = await db.asService((q) =>
      q.query<{ reason: string }>(
        `select reason from moderation.review_queue where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(queued[0]?.reason).toBe("ai_medium_confidence");
  });
});
