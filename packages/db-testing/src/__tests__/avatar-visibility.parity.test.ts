/**
 * Avatar/profile-photo visibility parity: profiles_visible must serve the real
 * avatar vs. a generic one exactly as canViewProfilePhoto decides (respecting
 * filterAppliesToAvatars), and must hide a blocked user's profile entirely.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { USERS, seedFixtures } from "../seed";
import { expectedAvatar } from "../expected";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

const TARGETS = USERS.filter((u) => u.avatar);

interface ProfileRow {
  id: string;
  has_avatar: boolean;
  avatar_filtered: boolean;
}

describe("avatar visibility matches canViewProfilePhoto", () => {
  for (const viewer of USERS) {
    it(`viewer=${viewer.key}`, async () => {
      const { rows } = await db.asUser(viewer.id, (q) =>
        q.query<ProfileRow>(
          `select id, avatar_media_id is not null as has_avatar, avatar_filtered from profiles_visible`
        )
      );
      const byId = new Map(rows.map((r) => [r.id, r]));

      for (const target of TARGETS) {
        const exp = expectedAvatar(viewer, target);
        const row = byId.get(target.id);
        const label = `${viewer.key} → ${target.key}(${target.avatar?.classification})`;

        expect(row !== undefined, `${label}: profileVisible`).toBe(exp.profileVisible);
        if (!row) continue;

        expect(row.has_avatar, `${label}: real avatar served`).toBe(exp.avatarVisible);
        expect(row.avatar_filtered, `${label}: avatar_filtered`).toBe(!exp.avatarVisible);
      }
    });
  }
});
