/**
 * Layer 2 of the moderation design (07-moderation-spec.md §3): a user report
 * ALWAYS creates work for a human and NEVER removes anything by itself. There
 * is deliberately no numeric threshold at which reports take effect — that is
 * the anti-abuse property, protecting a user from a coordinated reporting
 * campaign.
 *
 * public.reports is the client-writable submission surface; the moderator's
 * work list is moderation.review_queue. This suite is about the join between
 * them, which is what makes "report → human" real rather than a table nobody
 * reads.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { MEDIA, seedFixtures, USER } from "../seed";

let db: TestDb;
const reporter = USER.maleFiltered;
const author = USER.author;
const publicPost = MEDIA[0]!;

beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

async function reportPost(category: string, note: string | null): Promise<void> {
  await db.asUser(reporter.id, (q) =>
    q.query(
      `insert into public.reports (reporter_id, target_type, target_id, category, free_text_explanation)
       values ($1, 'post', $2, $3, $4)`,
      [reporter.id, publicPost.postId, category, note]
    )
  );
}

describe("a user report becomes a moderator's queue item", () => {
  it("files the report with the reporter's own words and category", async () => {
    await reportPost("contains_women", "there is a woman in the third photo");

    const { rows } = await db.asService((q) =>
      q.query<{
        reason: string;
        status: string;
        post_id: string;
        reporter_id: string;
        reporter_note: string;
        report_category: string;
        subject_user_id: string;
      }>(
        `select reason, status, post_id, reporter_id, reporter_note, report_category, subject_user_id
           from moderation.review_queue
          where reason = 'user_report' and post_id = $1`,
        [publicPost.postId]
      )
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reason: "user_report",
      status: "pending",
      reporter_id: reporter.id,
      reporter_note: "there is a woman in the third photo",
      report_category: "contains_women",
      // The moderator needs to know whose content this is (§4.2 context).
      subject_user_id: author.id,
    });
  });

  it("does not touch the reported content", async () => {
    const before = await db.asService((q) =>
      q.query<{ classification: string }>(
        `select classification from public.media_items where post_id = $1`,
        [publicPost.postId]
      )
    );
    await reportPost("misinformation", null);
    const after = await db.asService((q) =>
      q.query<{ classification: string }>(
        `select classification from public.media_items where post_id = $1`,
        [publicPost.postId]
      )
    );
    expect(after.rows).toEqual(before.rows);
  });

  it("queues every report separately — volume never becomes an automatic decision", async () => {
    // Ten reports on one post produce ten queue items and zero actions taken.
    const { rows: before } = await db.asService((q) =>
      q.query<{ n: string }>(
        `select count(*) as n from moderation.review_queue
          where reason = 'user_report' and post_id = $1`,
        [publicPost.postId]
      )
    );
    for (let i = 0; i < 10; i += 1) {
      await reportPost("spam", `report ${i}`);
    }
    const { rows: after } = await db.asService((q) =>
      q.query<{ n: string }>(
        `select count(*) as n from moderation.review_queue
          where reason = 'user_report' and post_id = $1`,
        [publicPost.postId]
      )
    );
    expect(Number(after[0]?.n) - Number(before[0]?.n)).toBe(10);

    const { rows: actions } = await db.asService((q) =>
      q.query(`select 1 from public.moderation_actions where target_user_id = $1`, [author.id])
    );
    expect(actions).toHaveLength(0);
  });

  it("routes a report about a user to the same queue", async () => {
    await db.asUser(reporter.id, (q) =>
      q.query(
        `insert into public.reports (reporter_id, target_type, target_id, category)
         values ($1, 'user', $2, 'harassment')`,
        [reporter.id, author.id]
      )
    );
    const { rows } = await db.asService((q) =>
      q.query<{ reason: string; subject_user_id: string; post_id: string | null }>(
        `select reason, subject_user_id, post_id from moderation.review_queue
          where reason = 'user_report' and report_category = 'harassment'`
      )
    );
    expect(rows[0]).toMatchObject({ subject_user_id: author.id, post_id: null });
  });

  it("a client still cannot see the queue it just fed", async () => {
    await expect(
      db.asUser(reporter.id, (q) => q.query(`select * from moderation.review_queue`))
    ).rejects.toThrow(/permission denied|does not exist/i);
  });
});
