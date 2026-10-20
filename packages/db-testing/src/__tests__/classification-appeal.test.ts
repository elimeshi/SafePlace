/**
 * 07-moderation-spec.md §2.3: the uploader can dispute an AI classification
 * from the notice itself, and that sends the item to a human.
 *
 * The client has no rights in the moderation schema, so the appeal goes
 * through a SECURITY DEFINER function in public that checks the caller really
 * is the uploader — a client must not be able to file an appeal against
 * someone else's media, or use the appeal path to learn anything about it.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { insertPublicPost, seedFixtures, USER } from "../seed";

let db: TestDb;
const author = USER.author;
const stranger = USER.maleFiltered;

let seq = 0;
async function mediaClassifiedAs(classification: string): Promise<string> {
  seq += 1;
  const postId = `00000000-0000-0000-0000-${`ba${seq}`.padStart(12, "0")}`;
  const mediaId = `00000000-0000-0000-0000-${`bb${seq}`.padStart(12, "0")}`;
  await insertPublicPost(db.raw, postId, author.id, "a");
  await db.raw.query(
    `insert into public.media_items (id, post_id, uploader_id, storage_path, content_type, classification, classified_at)
     values ($1, $2, $3, $4, 'image/jpeg', $5::media_classification, now())`,
    [mediaId, postId, author.id, `media/${mediaId}`, classification]
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

describe("appealing an AI classification", () => {
  it("files the appeal and puts it in front of a human", async () => {
    const mediaId = await mediaClassifiedAs("contains_women");

    await db.asUser(author.id, (q) =>
      q.query(`select public.appeal_classification($1, $2)`, [
        mediaId,
        "this is a photograph of a building",
      ])
    );

    const { rows: appeals } = await db.asService((q) =>
      q.query<{ status: string; note: string; appellant_id: string; review_queue_id: string }>(
        `select status, note, appellant_id, review_queue_id
           from moderation.classification_appeals where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(appeals).toHaveLength(1);
    expect(appeals[0]).toMatchObject({
      status: "pending",
      note: "this is a photograph of a building",
      appellant_id: author.id,
    });
    expect(appeals[0]?.review_queue_id).toBeTruthy();

    const { rows: queued } = await db.asService((q) =>
      q.query<{ reason: string; status: string }>(
        `select reason, status from moderation.review_queue where media_item_id = $1`,
        [mediaId]
      )
    );
    expect(queued[0]).toMatchObject({
      reason: "ai_classification_appeal",
      status: "pending",
    });
  });

  it("can be filed against frozen media too", async () => {
    const mediaId = await mediaClassifiedAs("pending_review");
    await db.asUser(author.id, (q) =>
      q.query(`select public.appeal_classification($1, $2)`, [mediaId, null])
    );
    const { rows } = await db.asService((q) =>
      q.query(`select 1 from moderation.classification_appeals where media_item_id = $1`, [
        mediaId,
      ])
    );
    expect(rows).toHaveLength(1);
  });

  it("refuses an appeal from anyone but the uploader", async () => {
    const mediaId = await mediaClassifiedAs("contains_women");
    await expect(
      db.asUser(stranger.id, (q) =>
        q.query(`select public.appeal_classification($1, $2)`, [mediaId, "not mine"])
      )
    ).rejects.toThrow();

    const { rows } = await db.asService((q) =>
      q.query(`select 1 from moderation.classification_appeals where media_item_id = $1`, [
        mediaId,
      ])
    );
    expect(rows).toHaveLength(0);
  });

  it("refuses an appeal against a classification that was never adverse", async () => {
    // Nothing to dispute: an appeal path that accepts anything is a way to
    // push arbitrary items into a moderator's queue.
    const mediaId = await mediaClassifiedAs("general");
    await expect(
      db.asUser(author.id, (q) =>
        q.query(`select public.appeal_classification($1, $2)`, [mediaId, "why not"])
      )
    ).rejects.toThrow();
  });

  it("does not let one uploader file the same appeal twice", async () => {
    const mediaId = await mediaClassifiedAs("contains_women");
    const appeal = () =>
      db.asUser(author.id, (q) =>
        q.query(`select public.appeal_classification($1, $2)`, [mediaId, "again"])
      );
    await appeal();
    await appeal();

    const { rows } = await db.asService((q) =>
      q.query(`select 1 from moderation.review_queue where media_item_id = $1`, [mediaId])
    );
    expect(rows).toHaveLength(1);
  });

  it("still tells the appellant nothing about the queue", async () => {
    await expect(
      db.asUser(author.id, (q) =>
        q.query(`select * from moderation.classification_appeals`)
      )
    ).rejects.toThrow(/permission denied|does not exist/i);
  });
});
