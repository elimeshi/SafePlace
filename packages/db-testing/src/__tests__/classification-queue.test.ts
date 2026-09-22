/**
 * The pipeline's own persistence: the job queue that feeds the worker, the
 * retained model output, and the guarantee that no upload can reach storage
 * without a classification job existing for it.
 *
 * Everything here lives in the `moderation` schema and is service-role only —
 * a signed-in client must not be able to read job state, model verdicts, or
 * confidence numbers (ADR 0004: only the resolved enum leaves the service).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { seedFixtures, USER } from "../seed";

let db: TestDb;
const author = USER.author;
const other = USER.maleFiltered;

let postSeq = 0;
async function newMediaAsAuthor(): Promise<string> {
  postSeq += 1;
  const postId = `00000000-0000-0000-0000-${`e${postSeq}`.padStart(12, "0")}`;
  const mediaId = `00000000-0000-0000-0000-${`f${postSeq}`.padStart(12, "0")}`;
  await db.raw.query(
    `insert into public.posts (id, author_id, text, exposure_kind) values ($1, $2, 'q', 'public')`,
    [postId, author.id]
  );
  await db.asUser(author.id, (q) =>
    q.query(
      `insert into public.media_items (id, post_id, uploader_id, storage_path, classification)
       values ($1, $2, $3, $4, 'unclassified')`,
      [mediaId, postId, author.id, `media/${mediaId}`]
    )
  );
  return mediaId;
}

beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

describe("every media insert enqueues a classification job", () => {
  it("enqueues exactly one queued job, at the database tier", async () => {
    // Invariant #8 is enforced here rather than in application code: a new
    // upload surface cannot forget to call the pipeline, because the row's
    // own insert is what enqueues it.
    const mediaId = await newMediaAsAuthor();
    const { rows } = await db.asService((q) =>
      q.query<{ state: string; attempts: number; n: number }>(
        `select state, attempts, count(*) over () ::int as n
           from moderation.classification_jobs where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ state: "queued", attempts: 0 });
  });

  it("enqueues for a profile avatar too, not just post media", async () => {
    const mediaId = "00000000-0000-0000-0000-0000000000fa";
    await db.asUser(author.id, (q) =>
      q.query(
        `insert into public.media_items (id, profile_id, uploader_id, storage_path, classification)
         values ($1, $2, $2, $3, 'unclassified')`,
        [mediaId, author.id, `media/${mediaId}`]
      )
    );
    const { rows } = await db.asService((q) =>
      q.query(`select 1 from moderation.classification_jobs where media_item_id = $1`, [mediaId])
    );
    expect(rows).toHaveLength(1);
  });
});

describe("every media parent surface enqueues — invariant #8 has no exceptions", () => {
  // media_items is polymorphic across post / comment / message / profile, and
  // the trigger is parent-agnostic by construction. This asserts that rather
  // than assuming it: the whole argument for enqueueing in the database is
  // that no surface can be forgotten, which is only true if it holds for
  // every parent the table allows.
  it("enqueues for post, comment, message and profile media alike", async () => {
    const postId = "00000000-0000-0000-0000-0000000005a1";
    const commentId = "00000000-0000-0000-0000-0000000005a2";
    const conversationId = "00000000-0000-0000-0000-0000000005a3";
    const messageId = "00000000-0000-0000-0000-0000000005a4";

    await db.raw.query(
      `insert into public.posts (id, author_id, text, exposure_kind) values ($1, $2, 'p', 'public')`,
      [postId, author.id]
    );
    await db.raw.query(
      `insert into public.comments (id, post_id, author_id, text) values ($1, $2, $3, 'c')`,
      [commentId, postId, author.id]
    );
    await db.raw.query(
      `insert into public.conversations (id, participant_a, participant_b) values ($1, $2, $3)`,
      [conversationId, author.id, other.id]
    );
    await db.raw.query(
      `insert into public.messages (id, conversation_id, sender_id, text) values ($1, $2, $3, 'm')`,
      [messageId, conversationId, author.id]
    );

    const parents: Array<[string, string, string]> = [
      ["post_id", postId, "00000000-0000-0000-0000-0000000005b1"],
      ["comment_id", commentId, "00000000-0000-0000-0000-0000000005b2"],
      ["message_id", messageId, "00000000-0000-0000-0000-0000000005b3"],
      ["profile_id", author.id, "00000000-0000-0000-0000-0000000005b4"],
    ];

    for (const [column, parentId, mediaId] of parents) {
      await db.raw.query(
        `insert into public.media_items (id, ${column}, uploader_id, storage_path, content_type)
         values ($1, $2, $3, $4, 'image/jpeg')`,
        [mediaId, parentId, author.id, `media/${mediaId}`]
      );
      const { rows } = await db.asService((q) =>
        q.query(`select 1 from moderation.classification_jobs where media_item_id = $1`, [
          mediaId,
        ])
      );
      expect(rows, `${column} did not enqueue`).toHaveLength(1);
    }
  });
});

describe("the moderation schema is invisible to clients", () => {
  const tables = [
    "classification_jobs",
    "classification_scores",
    "review_queue",
    "classification_appeals",
  ];

  for (const table of tables) {
    it(`authenticated cannot read moderation.${table}`, async () => {
      await expect(
        db.asUser(other.id, (q) => q.query(`select * from moderation.${table}`))
      ).rejects.toThrow(/permission denied|does not exist/i);
    });
  }

  it("authenticated cannot enqueue or alter jobs", async () => {
    await expect(
      db.asUser(other.id, (q) =>
        q.query(
          `insert into moderation.classification_jobs (media_item_id) values ($1)`,
          ["00000000-0000-0000-0000-0000000000d1"]
        )
      )
    ).rejects.toThrow(/permission denied|does not exist/i);
  });
});

describe("claiming work", () => {
  it("claims queued jobs and marks them running", async () => {
    const mediaId = await newMediaAsAuthor();
    // Batch generously: this asserts the job IS claimed, not that it is the
    // only one queued — other suites in this file leave work behind.
    const { rows } = await db.asService((q) =>
      q.query<{ media_item_id: string }>(
        `select * from moderation.claim_classification_jobs($1, $2)`,
        [200, "worker-a"]
      )
    );
    expect(rows.map((r) => r.media_item_id)).toContain(mediaId);

    const { rows: after } = await db.asService((q) =>
      q.query<{ state: string; locked_by: string }>(
        `select state, locked_by from moderation.classification_jobs where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(after[0]).toMatchObject({ state: "running", locked_by: "worker-a" });
  });

  it("does not hand the same job to a second worker", async () => {
    await newMediaAsAuthor();
    const first = await db.asService((q) =>
      q.query<{ id: string }>(`select * from moderation.claim_classification_jobs($1, $2)`, [10, "worker-a"])
    );
    const second = await db.asService((q) =>
      q.query<{ id: string }>(`select * from moderation.claim_classification_jobs($1, $2)`, [10, "worker-b"])
    );
    const firstIds = new Set(first.rows.map((r) => r.id));
    expect(second.rows.filter((r) => firstIds.has(r.id))).toHaveLength(0);
  });

  it("respects the batch size", async () => {
    await newMediaAsAuthor();
    await newMediaAsAuthor();
    await newMediaAsAuthor();
    const { rows } = await db.asService((q) =>
      q.query(`select * from moderation.claim_classification_jobs($1, $2)`, [2, "worker-c"])
    );
    expect(rows.length).toBeLessThanOrEqual(2);
  });
});

describe("completing a job", () => {
  it("writes the resolved classification and retains the model's output", async () => {
    const mediaId = await newMediaAsAuthor();
    await db.asService((q) =>
      q.query(`select * from moderation.claim_classification_jobs($1, $2)`, [50, "worker-d"])
    );
    await db.asService((q) =>
      q.query(
        `select moderation.complete_classification_job($1, 'contains_women', $2, $3, $4, $5, $6)`,
        [mediaId, "stub", "stub-v1", "woman_present", 0.93, 0.965]
      )
    );

    const { rows: media } = await db.asService((q) =>
      q.query<{ classification: string; classified_at: string | null }>(
        `select classification, classified_at from public.media_items where id = $1`,
        [mediaId]
      )
    );
    expect(media[0]?.classification).toBe("contains_women");
    expect(media[0]?.classified_at).not.toBeNull();

    const { rows: job } = await db.asService((q) =>
      q.query<{ state: string }>(
        `select state from moderation.classification_jobs where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(job[0]?.state).toBe("done");

    const { rows: score } = await db.asService((q) =>
      q.query<{ verdict: string; confidence: string; provider: string; expires_at: string }>(
        `select verdict, confidence, provider, expires_at
           from moderation.classification_scores where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(score).toHaveLength(1);
    expect(score[0]).toMatchObject({ verdict: "woman_present", provider: "stub" });
    expect(score[0]?.expires_at).not.toBeNull();
  });

  it("is idempotent — replaying a completed job does not change the outcome", async () => {
    const mediaId = await newMediaAsAuthor();
    await db.asService((q) =>
      q.query(`select * from moderation.claim_classification_jobs($1, $2)`, [50, "worker-e"])
    );
    const complete = (cls: string) =>
      db.asService((q) =>
        q.query(
          `select moderation.complete_classification_job($1, $2::media_classification, $3, $4, $5, $6, $7)`,
          [mediaId, cls, "stub", "stub-v1", "no_woman", 0.9, 0.05]
        )
      );
    await complete("general");
    await complete("contains_women"); // a duplicate delivery must not reclassify

    const { rows } = await db.asService((q) =>
      q.query<{ classification: string }>(
        `select classification from public.media_items where id = $1`,
        [mediaId]
      )
    );
    expect(rows[0]?.classification).toBe("general");
  });

  it("routes the medium band into the human review queue", async () => {
    const mediaId = await newMediaAsAuthor();
    await db.asService((q) =>
      q.query(`select * from moderation.claim_classification_jobs($1, $2)`, [50, "worker-f"])
    );
    await db.asService((q) =>
      q.query(
        `select moderation.complete_classification_job($1, 'pending_review', $2, $3, $4, $5, $6)`,
        [mediaId, "stub", "stub-v1", "uncertain", 0.2, 0.5]
      )
    );
    const { rows } = await db.asService((q) =>
      q.query<{ reason: string; status: string }>(
        `select reason, status from moderation.review_queue where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reason: "ai_medium_confidence",
      status: "pending",
    });
  });
});

describe("failing a job", () => {
  it("backs off and retries while attempts remain", async () => {
    const mediaId = await newMediaAsAuthor();
    await db.asService((q) =>
      q.query(`select * from moderation.claim_classification_jobs($1, $2)`, [50, "worker-g"])
    );
    await db.asService((q) =>
      q.query(`select moderation.fail_classification_job($1, $2)`, [mediaId, "provider timeout"])
    );

    const { rows } = await db.asService((q) =>
      q.query<{ state: string; attempts: number; due_later: boolean; last_error: string }>(
        `select state, attempts, next_attempt_at > now() as due_later, last_error
           from moderation.classification_jobs where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(rows[0]).toMatchObject({
      state: "queued",
      attempts: 1,
      due_later: true,
      last_error: "provider timeout",
    });
  });

  it("does not hand back a job whose backoff has not elapsed", async () => {
    const mediaId = await newMediaAsAuthor();
    await db.asService((q) =>
      q.query(`select * from moderation.claim_classification_jobs($1, $2)`, [50, "worker-h"])
    );
    await db.asService((q) =>
      q.query(`select moderation.fail_classification_job($1, $2)`, [mediaId, "boom"])
    );
    const { rows } = await db.asService((q) =>
      q.query<{ media_item_id: string }>(
        `select * from moderation.claim_classification_jobs($1, $2)`,
        [50, "worker-i"]
      )
    );
    expect(rows.map((r) => r.media_item_id)).not.toContain(mediaId);
  });

  it("a poison job ends up with a human, never stranded as unclassified", async () => {
    // Terminal failure must not leave media permanently unclassified: under
    // fail-closed that would make it invisible to everyone but the uploader,
    // forever, with nobody looking at it.
    const mediaId = await newMediaAsAuthor();
    for (let i = 0; i < 6; i += 1) {
      await db.asService((q) =>
        q.query(
          `update moderation.classification_jobs set next_attempt_at = now() - interval '1 hour'
             where media_item_id = $1`,
          [mediaId]
        )
      );
      await db.asService((q) =>
        q.query(`select * from moderation.claim_classification_jobs($1, $2)`, [50, "worker-j"])
      );
      await db.asService((q) =>
        q.query(`select moderation.fail_classification_job($1, $2)`, [mediaId, "always fails"])
      );
    }

    const { rows: job } = await db.asService((q) =>
      q.query<{ state: string }>(
        `select state from moderation.classification_jobs where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(job[0]?.state).toBe("failed");

    const { rows: media } = await db.asService((q) =>
      q.query<{ classification: string }>(
        `select classification from public.media_items where id = $1`,
        [mediaId]
      )
    );
    expect(media[0]?.classification).toBe("pending_review");

    const { rows: queued } = await db.asService((q) =>
      q.query<{ reason: string }>(
        `select reason from moderation.review_queue where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(queued.map((r) => r.reason)).toContain("classification_failed");
  });
});
