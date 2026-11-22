/**
 * Removed content and banned authors (Phase 8 plan §2 forks 16 and 22, §4.4):
 * for every viewer, what the database returns agrees with canViewPost /
 * canViewComment / canViewMedia / canViewProfilePhoto. A banned author's
 * content, removed posts and comments, and removed media are hidden from
 * everyone — their author or uploader included.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  canViewComment,
  canViewMedia,
  canViewPost,
  canViewProfilePhoto,
  resolveDefaultFilterSettings,
  type ContentLevels,
  type MediaClassification,
  type PostContext,
} from "@safeplace/visibility-policy";
import { createTestDb, type TestDb } from "../harness";
import { MEDIA, USER, USERS, insertPost, seedFixtures, type UserFixture } from "../seed";
import { viewerOf } from "../expected";

const hx = (s: string): string => `00000000-0000-0000-0000-${s.padStart(12, "0")}`;

const BANNED = hx("8a0");
const AVATAR_REMOVED_OWNER = hx("8a1");
const TARGET_POST = MEDIA.find((m) => m.exposure[0].kind === "public" && m.classification === "general")!.postId;

// Extra viewers: the banned author and the owner of a removed avatar see their own content too.
const extraViewer = (id: string, key: string): UserFixture =>
  ({ key, id, gender: "male", filter: resolveDefaultFilterSettings("male"), follows: [], groups: [], familySpaces: [] }) as unknown as UserFixture;
const VIEWERS: UserFixture[] = [...USERS, extraViewer(BANNED, "banned"), extraViewer(AVATAR_REMOVED_OWNER, "avatarRemovedOwner")];

const pub = (authorId: string, flags: { authorBanned?: boolean; removed?: boolean } = {}): PostContext => ({
  authorId,
  status: "published",
  exposure: [{ kind: "public" }],
  sourceKind: "profile",
  authorBanned: flags.authorBanned ?? false,
  removed: flags.removed ?? false,
});

const POSTS: { id: string; ctx: PostContext }[] = [
  { id: hx("8b0"), ctx: pub(BANNED, { authorBanned: true }) },
  { id: hx("8b1"), ctx: pub(USER.author.id, { removed: true }) },
  { id: hx("8b2"), ctx: pub(USER.author.id) }, // live control; carries the removed media
];
const TARGET_CTX = pub(USER.author.id);
const COMMENTS = [
  { id: hx("8d0"), authorId: BANNED, authorBanned: true, removed: false },
  { id: hx("8d1"), authorId: USER.maleUnfiltered.id, authorBanned: false, removed: true },
  { id: hx("8d2"), authorId: USER.maleUnfiltered.id, authorBanned: false, removed: false }, // live control
];
const REMOVED_MEDIA: { id: string; levels: ContentLevels | null }[] = [
  { id: hx("8e0"), levels: { sex: 1, violence: 2, religion: 0, addictions: 0 } },
  { id: hx("8e1"), levels: null },
];
const AVATARS = [
  { ownerId: BANNED, mediaId: hx("8f0"), classification: "general" as MediaClassification, ownerBanned: true },
  { ownerId: AVATAR_REMOVED_OWNER, mediaId: hx("8f1"), classification: "removed" as MediaClassification, ownerBanned: false },
];
const ZERO: ContentLevels = { sex: 0, violence: 0, religion: 0, addictions: 0 };

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
  const raw = db.raw;
  for (const [id, gender] of [[BANNED, "male"], [AVATAR_REMOVED_OWNER, "female"]] as const) {
    await raw.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, jsonb_build_object('gender', $3::text))`, [id, `${id}@removed.test`, gender]);
  }
  for (const p of POSTS) await insertPost(raw, { postId: p.id, authorId: p.ctx.authorId, exposure: p.ctx.exposure });
  for (const c of COMMENTS) {
    await raw.query(`insert into public.comments (id, post_id, author_id, text) values ($1, $2, $3, 'c')`, [c.id, TARGET_POST, c.authorId]);
  }
  for (const m of REMOVED_MEDIA) {
    const l = m.levels;
    await raw.query(
      `insert into public.media_items (id, post_id, uploader_id, storage_path, classification, classified_at,
                                       sex_level, violence_level, religion_level, addictions_level)
       values ($1, $2, $3, $8, 'removed', now(), $4, $5, $6, $7)`,
      [m.id, hx("8b2"), USER.author.id, l?.sex ?? null, l?.violence ?? null, l?.religion ?? null, l?.addictions ?? null, `media/${m.id}`]
    );
    await raw.query(`insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)`, [`media/${m.id}`, USER.author.id]);
  }
  for (const a of AVATARS) {
    const levels = a.classification === "removed" ? [null, null, null, null] : [0, 0, 0, 0];
    await raw.query(
      `insert into public.media_items (id, profile_id, uploader_id, storage_path, classification, classified_at,
                                       sex_level, violence_level, religion_level, addictions_level)
       values ($1, $2, $2, $8, $3, now(), $4, $5, $6, $7)`,
      [a.mediaId, a.ownerId, a.classification, ...levels, `media/${a.mediaId}`]
    );
    await raw.query(`update public.profiles set avatar_media_id = $2 where id = $1`, [a.ownerId, a.mediaId]);
  }
  await raw.query(`update public.posts set removed_at = now() where id = $1`, [hx("8b1")]);
  await raw.query(`update public.comments set removed_at = now() where id = $1`, [hx("8d1")]);
  await raw.query(`update public.profiles set account_status = 'banned' where id = $1`, [BANNED]);
});
afterAll(async () => {
  await db.close();
});

const idsVisible = async (viewerId: string, sql: string, ids: string[]): Promise<Set<string>> => {
  const { rows } = await db.asUser(viewerId, (q) => q.query<{ id: string }>(sql, [ids]));
  return new Set(rows.map((r) => r.id));
};

describe("posts: removed or banned-author posts agree with canViewPost", () => {
  for (const u of VIEWERS) {
    it(`viewer=${u.key}`, async () => {
      const seen = await idsVisible(u.id, `select id from public.posts where id = any($1)`, POSTS.map((p) => p.id));
      for (const p of POSTS) expect(seen.has(p.id), `${u.key} × ${p.id}`).toBe(canViewPost(viewerOf(u), p.ctx));
    });
  }
});

describe("comments: removed or banned-author comments agree with canViewComment", () => {
  for (const u of VIEWERS) {
    it(`viewer=${u.key}`, async () => {
      const seen = await idsVisible(u.id, `select id from public.comments where id = any($1)`, COMMENTS.map((c) => c.id));
      for (const c of COMMENTS) {
        expect(seen.has(c.id), `${u.key} × ${c.id}`).toBe(canViewComment(viewerOf(u), { ...c, post: TARGET_CTX }));
      }
    });
  }
});

describe("media: removed media is never served, the uploader included", () => {
  for (const u of VIEWERS) {
    it(`viewer=${u.key}`, async () => {
      const { rows } = await db.asUser(u.id, (q) =>
        q.query<{ id: string; storage_path: string | null }>(`select id, storage_path from media_items_visible where id = any($1)`, [
          REMOVED_MEDIA.map((m) => m.id),
        ])
      );
      for (const m of REMOVED_MEDIA) {
        const want = canViewMedia(viewerOf(u), {
          classification: "removed",
          levels: m.levels,
          exposure: [{ kind: "public" }],
          uploaderId: USER.author.id,
          isWithinViewersFamilySpace: false,
        });
        const row = rows.find((r) => r.id === m.id);
        expect(row?.storage_path != null, `${u.key} × ${m.id}`).toBe(want);
      }
      const signable = await db.asUser(u.id, (q) =>
        q.query(`select 1 from storage.objects where name = any($1)`, [REMOVED_MEDIA.map((m) => `media/${m.id}`)])
      );
      expect(signable.rows, `${u.key} can sign removed media`).toHaveLength(0);
    });
  }

  it("the uploader still sees the row, with storage_path null", async () => {
    const { rows } = await db.asUser(USER.author.id, (q) =>
      q.query<{ id: string; storage_path: string | null; is_filtered: boolean }>(
        `select id, storage_path, is_filtered from media_items_visible where id = any($1)`,
        [REMOVED_MEDIA.map((m) => m.id)]
      )
    );
    expect(rows).toHaveLength(REMOVED_MEDIA.length);
    for (const r of rows) expect(r).toMatchObject({ storage_path: null, is_filtered: true });
  });
});

describe("profiles: a banned profile and a removed avatar agree with canViewProfilePhoto", () => {
  for (const u of VIEWERS) {
    it(`viewer=${u.key}`, async () => {
      const { rows } = await db.asUser(u.id, (q) =>
        q.query<{ id: string; avatar_media_id: string | null }>(`select id, avatar_media_id from profiles_visible where id = any($1)`, [
          AVATARS.map((a) => a.ownerId),
        ])
      );
      for (const a of AVATARS) {
        const row = rows.find((r) => r.id === a.ownerId);
        // A banned profile is hidden from everyone, its owner included.
        if (a.ownerBanned) expect(row, `${u.key} sees banned profile`).toBeUndefined();
        const want = canViewProfilePhoto(viewerOf(u), {
          classification: a.classification,
          levels: a.classification === "removed" ? null : ZERO,
          ownerId: a.ownerId,
          ownerBanned: a.ownerBanned,
        });
        expect(row?.avatar_media_id != null, `${u.key} × avatar of ${a.ownerId}`).toBe(want);
      }
    });
  }

  it("avatar_permitted is false for a banned owner's avatar, even for the owner", async () => {
    for (const viewer of [BANNED, USER.maleUnfiltered.id]) {
      const { rows } = await db.asUser(viewer, (q) =>
        q.query<{ ok: boolean }>(`select visibility.avatar_permitted($1) as ok`, [hx("8f0")])
      );
      expect(rows[0]!.ok).toBe(false);
    }
  });
});

describe("removed media in the pipeline", () => {
  it("the lifecycle constraint takes removed with all levels or none, never some", async () => {
    await expect(
      db.raw.query(`update public.media_items set sex_level = 1 where id = $1`, [hx("8e1")])
    ).rejects.toThrow(/media_levels_match_lifecycle/);
  });

  it("dedupe never borrows a verdict from a removed copy", async () => {
    await db.raw.query(`update public.media_items set content_sha256 = 'removed-sha' where id = $1`, [hx("8e0")]);
    const { rows } = await db.asService((q) => q.query(`select * from moderation.find_resolved_by_hash('removed-sha', null, null)`));
    expect(rows).toHaveLength(0);
  });
});
