/**
 * Per-group levels (ADR 0018): over LEVEL_MEDIA — one item per non-sex group
 * and level, a sex-2 item, and a Family Space item at {sex 2, violence 1} —
 * media_items_visible serves exactly what canViewMedia decides for every
 * viewer, and the levels themselves reach the uploader only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { LEVEL_MEDIA, USER, USERS, seedFixtures } from "../seed";
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
  sex_level: number | null;
  violence_level: number | null;
  religion_level: number | null;
  addictions_level: number | null;
}

async function visibleMediaFor(userId: string): Promise<Map<string, VisibleRow>> {
  const { rows } = await db.asUser(userId, (q) =>
    q.query<VisibleRow>(
      `select id, is_filtered, storage_path is not null as has_url,
              sex_level, violence_level, religion_level, addictions_level
         from media_items_visible`
    )
  );
  return new Map(rows.map((r) => [r.id, r]));
}

const label = (m: (typeof LEVEL_MEDIA)[number]): string =>
  `${m.exposure[0].kind}/${m.classification}/${JSON.stringify(m.levels)}`;

describe("per-group levels: DB agrees with visibility-policy", () => {
  for (const u of USERS) {
    it(`viewer=${u.key}`, async () => {
      const visible = await visibleMediaFor(u.id);
      for (const m of LEVEL_MEDIA) {
        const exp = expectedMedia(u, m);
        const row = visible.get(m.mediaId);
        const at = `${u.key} × ${label(m)}`;

        expect(row !== undefined, `${at}: rowPresent`).toBe(exp.rowPresent);
        if (!row) continue;
        expect(row.has_url, `${at}: contentVisible`).toBe(exp.contentVisible);
        expect(row.is_filtered, `${at}: isFiltered`).toBe(exp.isFiltered);

        // Levels are the uploader's to read, nobody else's.
        const levels = [row.sex_level, row.violence_level, row.religion_level, row.addictions_level];
        if (u.id === m.uploaderId) {
          expect(levels, `${at}: own levels`).toEqual([m.levels!.sex, m.levels!.violence, m.levels!.religion, m.levels!.addictions]);
        } else {
          expect(levels, `${at}: levels hidden`).toEqual([null, null, null, null]);
        }
      }
    });
  }
});

// Spot checks that pin the cases the grid exists for, so a fixture change
// cannot quietly stop exercising them.
it("a Family Space lifts sex only: a member at maxima 0 is still withheld violence 1", async () => {
  const fs = LEVEL_MEDIA.find((m) => m.familySpaceId !== null)!;
  const row = (await visibleMediaFor(USER.maleSexOnlyLifted.id)).get(fs.mediaId);
  expect(row).toMatchObject({ has_url: false, is_filtered: true });
});

it("maxima are per group: level 1 passes a viewer at 1, level 2 does not", async () => {
  const visible = await visibleMediaFor(USER.maleLevels1.id);
  for (const m of LEVEL_MEDIA.filter((x) => x.familySpaceId === null && x.classification === "general")) {
    const top = Math.max(m.levels!.violence, m.levels!.religion, m.levels!.addictions);
    expect(visible.get(m.mediaId)?.has_url, label(m)).toBe(top <= 1);
  }
});

it("feed media JSON (post_media_json) carries levels to the uploader only", async () => {
  type MediaJson = { id: string; sex_level: number | null; violence_level: number | null; religion_level: number | null; addictions_level: number | null };
  const m = LEVEL_MEDIA.find((x) => x.familySpaceId === null && x.levels!.violence === 2)!;
  const mediaJsonFor = async (userId: string): Promise<MediaJson> => {
    const { rows } = await db.asUser(userId, (q) =>
      q.query<{ media: MediaJson[] }>(`select public.post_media_json($1) as media`, [m.postId])
    );
    return rows[0]!.media.find((x) => x.id === m.mediaId)!;
  };

  expect(await mediaJsonFor(m.uploaderId)).toMatchObject({ sex_level: 0, violence_level: 2, religion_level: 0, addictions_level: 0 });
  for (const u of USERS.filter((x) => x.id !== m.uploaderId && x.key !== "blocked")) {
    expect(await mediaJsonFor(u.id), u.key).toMatchObject({
      sex_level: null,
      violence_level: null,
      religion_level: null,
      addictions_level: null,
    });
  }
});
