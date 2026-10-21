/** Visibility audit fixes — migration 20261021100000_audit_fixes. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../harness";
import { FAMILY_SPACE_ID, GROUP_ID, USER, insertPost, seedFixtures } from "../seed";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
});
afterAll(async () => {
  await db.close();
});

const hx = (s: string) => `00000000-0000-0000-0000-${s.padStart(12, "0")}`;
const queue = async () =>
  (await db.raw.query<{ storage_path: string }>(`select storage_path from moderation.orphaned_objects order by 1`)).rows.map(
    (r) => r.storage_path
  );
const AUTHOR = USER.author.id;
const OTHER = USER.maleUnfiltered.id;

describe("media_items.storage_path ownership", () => {
  const draft = hx("a1d1");
  beforeAll(async () => {
    await db.raw.query(`insert into public.posts (id, author_id, text, status) values ($1, $2, 'd', 'draft')`, [draft, AUTHOR]);
  });
  const insertAs = (path: string, id: string, blurred: string | null = null) =>
    db.asUser(AUTHOR, (q) =>
      q.query(
        `insert into public.media_items (id, post_id, uploader_id, storage_path, blurred_storage_path) values ($1, $2, $3, $4, $5)`,
        [id, draft, AUTHOR, path, blurred]
      )
    );

  it("rejects a path under another user's prefix", async () => {
    await expect(insertAs(`${OTHER}/victim.jpg`, hx("a1e1"))).rejects.toThrow(/row-level security/i);
    await expect(insertAs(`${AUTHOR}/ok.jpg`, hx("a1e2"), `${OTHER}/b.jpg`)).rejects.toThrow(/row-level security/i);
    await expect(insertAs(`no-prefix.jpg`, hx("a1e3"))).rejects.toThrow(/row-level security/i);
  });

  it("accepts an own-prefixed path and rejects a duplicate", async () => {
    await insertAs(`${AUTHOR}/ok.jpg`, hx("a1e4"));
    await expect(insertAs(`${AUTHOR}/ok.jpg`, hx("a1e5"))).rejects.toThrow(/duplicate|unique/i);
  });

  it("never queues a path another row still references", async () => {
    const { raw } = db;
    await raw.query(`delete from moderation.orphaned_objects`);
    await raw.query(
      `insert into public.media_items (id, post_id, uploader_id, storage_path) values ($1, $2, $3, 'media/shared-a'), ($4, $2, $3, 'media/own-b')`,
      [hx("a1f1"), draft, AUTHOR, hx("a1f2")]
    );
    await raw.query(`update public.media_items set blurred_storage_path = 'media/shared-a' where id = $1`, [hx("a1f2")]);
    await raw.query(`delete from public.media_items where id = $1`, [hx("a1f1")]);
    expect(await queue()).toEqual([]);
    await raw.query(`delete from public.media_items where id = $1`, [hx("a1f2")]);
    expect(await queue()).toEqual(["media/own-b", "media/shared-a"]);
  });
});

describe("own_recent_posts", () => {
  it("returns own feed-eligible posts only; a Family Space post is excluded", async () => {
    const since = (await db.raw.query<{ t: string }>(`select clock_timestamp()::text as t`)).rows[0]!.t;
    const posts: Record<string, Omit<Parameters<typeof insertPost>[1], "authorId">> = {
      pub: { postId: hx("b101"), exposure: [{ kind: "public" }] },
      fol: { postId: hx("b102"), exposure: [{ kind: "followers_only" as const, authorId: AUTHOR }] },
      grp: {
        postId: hx("b103"),
        exposure: [{ kind: "group" as const, groupId: GROUP_ID }],
        sourceKind: "group" as const,
        sourceGroupId: GROUP_ID,
      },
      fam: {
        postId: hx("b104"),
        exposure: [{ kind: "family_space" as const, spaceId: FAMILY_SPACE_ID }],
        sourceKind: "family_space" as const,
        sourceSpaceId: FAMILY_SPACE_ID,
      },
    };
    for (const p of Object.values(posts)) await insertPost(db.raw, { ...p, authorId: AUTHOR });
    const { rows } = await db.asUser(AUTHOR, (q) =>
      q.query<{ id: string }>(`select id from public.own_recent_posts($1::timestamptz, 10)`, [since])
    );
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual([posts.pub!.postId, posts.fol!.postId, posts.grp!.postId].sort());
    expect(ids).not.toContain(posts.fam!.postId);
    const other = await db.asUser(OTHER, (q) => q.query(`select id from public.own_recent_posts($1::timestamptz, 10)`, [since]));
    expect(other.rows).toEqual([]);
  });
});

describe("function execute privileges", () => {
  const names = [
    "post_stats", "comment_stats", "post_media_json", "feed_page", "spaces_rail", "follow_suggestions", "own_recent_posts",
    "family_space_member_count", "posts_guard", "post_audiences_guard", "comments_normalize_reply", 
    "purge_abandoned_drafts", "viewer_muted", "viewer_suppressed", "viewer_shows_suggested", "audience_satisfied", "post_visible",
    "comment_visible", "audience_set_valid", "can_share_internally", "can_copy_external_link", "feed_placement", "can_suggest_user",
    "post_publish_problem", "media_in_viewers_family_space",
  ];
  it("anon (and PUBLIC) can execute none of them", async () => {
    const { rows } = await db.raw.query<{ n: string }>(
      `select p.oid::regprocedure::text as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
       where s.nspname in ('public', 'visibility') and p.proname = any($1::text[])
         and has_function_privilege('anon', p.oid, 'execute')`,
      [names]
    );
    expect(rows).toEqual([]);
  });
  it("the client-callable read paths stay executable by authenticated", async () => {
    const { rows } = await db.raw.query<{ ok: boolean }>(
      `select has_function_privilege('authenticated', 'public.post_stats(uuid[])', 'execute')
          and has_function_privilege('authenticated', 'public.own_recent_posts(timestamptz, integer)', 'execute') as ok`
    );
    expect(rows[0]!.ok).toBe(true);
  });
});

describe("posts_guard: published_at is server-set at publish", () => {
  it("a far-future client value does not survive the draft -> published transition", async () => {
    const pid = hx("c101");
    await db.raw.query(
      `insert into public.posts (id, author_id, text, status, published_at) values ($1, $2, 'x', 'draft', now() + interval '10 years')`,
      [pid, AUTHOR]
    );
    await db.raw.query(`insert into public.post_audiences (post_id, kind, position) values ($1, 'public', 0)`, [pid]);
    await db.asUser(AUTHOR, (q) => q.query(`update public.posts set status = 'published' where id = $1`, [pid]));
    const { rows } = await db.raw.query<{ ok: boolean }>(
      `select published_at <= now() and published_at > now() - interval '1 minute' as ok from public.posts where id = $1`,
      [pid]
    );
    expect(rows[0]!.ok).toBe(true);
  });
});
