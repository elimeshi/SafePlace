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

it("the base table exposes a storage_path the view withholds — but it cannot be used", async () => {
  // A known, accepted gap (visibility-audit, Phase 3). Phase 1 granted SELECT
  // on every public table to `authenticated`, and media_items' row policy
  // deliberately admits contains_women rows so a placeholder can render — so
  // the row it admits carries the path column that media_items_visible exists
  // to withhold.
  //
  // Closing it with column-level grants is not available: media_items_visible
  // is security_invoker, so it reads the base table with the CALLER's
  // privileges, and revoking the column from the caller revokes it from the
  // view too. security_invoker is what guarantees the view can never widen row
  // visibility, which is worth more than the column.
  //
  // So the guarantee is enforced one layer down, and this test pins it: the
  // path is readable, and it is inert. If a future change makes a withheld
  // object signable, this fails.
  const cw = MEDIA.find(
    (m) => m.classification === "contains_women" && m.exposure.kind === "public"
  )!;
  const viewer = USERS.find((u) => u.key === "maleFiltered")!;

  const base = await db.asUser(viewer.id, (q) =>
    q.query<{ storage_path: string | null }>(
      `select storage_path from public.media_items where id = $1`,
      [cw.mediaId]
    )
  );
  const view = await db.asUser(viewer.id, (q) =>
    q.query<{ storage_path: string | null }>(
      `select storage_path from media_items_visible where id = $1`,
      [cw.mediaId]
    )
  );

  expect(base.rows[0]?.storage_path).toBeTruthy();
  expect(view.rows[0]?.storage_path).toBeNull();

  // The part that actually matters: holding the path buys nothing, because
  // storage will not sign an object the view withheld.
  const signable = await db.asUser(viewer.id, (q) =>
    q.query<{ n: number }>(
      `select count(*)::int as n from storage.objects
        where bucket_id = 'media' and name = $1`,
      [base.rows[0]?.storage_path]
    )
  );
  expect(signable.rows[0]?.n).toBe(0);
});
