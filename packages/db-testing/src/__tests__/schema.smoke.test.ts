import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});

it("applies the full schema — every expected table exists", async () => {
  const { rows } = await db.raw.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' order by table_name`
  );
  const tables = rows.map((r) => r.table_name);
  expect(tables).toEqual(
    expect.arrayContaining([
      "profiles",
      "filter_settings",
      "posts",
      "comments",
      "media_items",
      "follows",
      "blocks",
      "groups",
      "group_members",
      "family_spaces",
      "family_space_members",
      "conversations",
      "messages",
      "message_requests",
      "reports",
      "moderation_actions",
    ])
  );
});

it("enables RLS with deny-by-default before policies exist", async () => {
  // No policies yet in this smoke context beyond the crux migration set; an
  // authenticated user with no matching policy sees nothing. (After 0003 this
  // is replaced by fine-grained parity tests.)
  const { rows } = await db.raw.query<{ relrowsecurity: boolean }>(
    `select relrowsecurity from pg_class where relname = 'media_items'`
  );
  expect(rows[0]?.relrowsecurity).toBe(true);
});
