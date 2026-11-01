/**
 * Thresholds are configuration, not constants (07-moderation-spec.md §2.1 —
 * the real values are explicitly deferred until there is performance data to
 * set them from). They therefore live in a row the operator can change, not in
 * a deployed artifact, and the placeholder values ship as that row's defaults.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { seedFixtures, USER } from "../seed";

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

describe("moderation.pipeline_config", () => {
  it("ships with the spec's placeholder thresholds already in place", async () => {
    const { rows } = await db.asService((q) =>
      q.query<{ low_max: string; high_min: string; model_id: string }>(
        `select low_max, high_min, model_id from moderation.pipeline_config`
      )
    );
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]?.low_max)).toBe(0.2);
    expect(Number(rows[0]?.high_min)).toBe(0.8);
    expect(rows[0]?.model_id).toBeTruthy();
  });

  it("defaults to Haiku 5.5 with escalation off (ADR 0018)", async () => {
    const { rows } = await db.asService((q) =>
      q.query<{ model_id: string; escalation_model_id: string | null }>(
        `select model_id, escalation_model_id from moderation.pipeline_config`
      )
    );
    expect(rows[0]).toEqual({ model_id: "claude-haiku-5-5", escalation_model_id: null });
    const def = await db.raw.query<{ column_default: string }>(
      `select column_default from information_schema.columns
        where table_schema = 'moderation' and table_name = 'pipeline_config' and column_name = 'model_id'`
    );
    expect(def.rows[0]?.column_default).toContain("claude-haiku-5-5");
  });

  it("can be retuned without a deploy", async () => {
    await db.asService((q) =>
      q.query(`update moderation.pipeline_config set low_max = 0.1, high_min = 0.6`)
    );
    const { rows } = await db.asService((q) =>
      q.query<{ low_max: string; high_min: string }>(
        `select low_max, high_min from moderation.pipeline_config`
      )
    );
    expect(Number(rows[0]?.low_max)).toBe(0.1);
    expect(Number(rows[0]?.high_min)).toBe(0.6);
    // restore
    await db.asService((q) =>
      q.query(`update moderation.pipeline_config set low_max = 0.2, high_min = 0.8`)
    );
  });

  it("refuses an inverted band, which would erase human review entirely", async () => {
    await expect(
      db.asService((q) =>
        q.query(`update moderation.pipeline_config set low_max = 0.9, high_min = 0.3`)
      )
    ).rejects.toThrow(/constraint|check/i);
  });

  it("refuses thresholds outside 0..1", async () => {
    await expect(
      db.asService((q) => q.query(`update moderation.pipeline_config set high_min = 1.5`))
    ).rejects.toThrow(/constraint|check/i);
  });

  it("holds exactly one row, so there is no ambiguity about which applies", async () => {
    await expect(
      db.asService((q) =>
        q.query(
          `insert into moderation.pipeline_config (low_max, high_min, model_id)
           values (0.3, 0.7, 'x')`
        )
      )
    ).rejects.toThrow();
  });

  it("is invisible to clients", async () => {
    await expect(
      db.asUser(USER.maleFiltered.id, (q) =>
        q.query(`select * from moderation.pipeline_config`)
      )
    ).rejects.toThrow(/permission denied|does not exist/i);
  });
});
