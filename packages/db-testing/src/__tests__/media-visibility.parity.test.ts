/**
 * The central ADR 0006 assertion: for every seeded viewer, the media the
 * DATABASE actually exposes (via RLS + the media_items_visible view) equals
 * exactly what @safeplace/visibility-policy decides for the same inputs. This
 * proves the two enforcement layers agree across the full exposure ×
 * classification matrix, the family-space exception, blocks, and the frozen
 * (pending_review) state.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { MEDIA, USERS } from "../seed";
import { seedFixtures } from "../seed";
import { expectedMedia } from "../expected";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

interface VisibleRow {
  id: string;
  is_filtered: boolean;
  has_url: boolean;
}

async function visibleMediaFor(userId: string): Promise<Map<string, VisibleRow>> {
  const { rows } = await db.asUser(userId, (q) =>
    q.query<VisibleRow>(
      `select id, is_filtered, storage_path is not null as has_url from media_items_visible`
    )
  );
  return new Map(rows.map((r) => [r.id, r]));
}

describe("media visibility matches visibility-policy for every viewer", () => {
  for (const u of USERS) {
    it(`viewer=${u.key}`, async () => {
      const visible = await visibleMediaFor(u.id);

      for (const m of MEDIA) {
        const exp = expectedMedia(u, m);
        const row = visible.get(m.mediaId);
        const label = `${u.key} × ${m.exposure.kind}/${m.classification}`;

        // (1) Row presence — can the viewer even KNOW this media exists?
        expect(row !== undefined, `${label}: rowPresent`).toBe(exp.rowPresent);

        if (!row) continue;

        // (2) Content visibility — is the real URL served?
        expect(row.has_url, `${label}: contentVisible (url served)`).toBe(
          exp.contentVisible
        );

        // (3) Filtered flag — present-but-withheld => placeholder.
        expect(row.is_filtered, `${label}: isFiltered`).toBe(exp.isFiltered);
      }
    });
  }
});

it("a filtered viewer NEVER receives a withheld storage path (leak backstop)", async () => {
  // Strongest single guarantee: across every viewer, any media whose policy
  // decision is "cannot see content" must have storage_path = NULL in the view.
  for (const u of USERS) {
    const visible = await visibleMediaFor(u.id);
    for (const m of MEDIA) {
      const exp = expectedMedia(u, m);
      const row = visible.get(m.mediaId);
      if (row && !exp.contentVisible) {
        expect(row.has_url, `${u.key} leaked ${m.classification} url`).toBe(false);
      }
    }
  }
});
