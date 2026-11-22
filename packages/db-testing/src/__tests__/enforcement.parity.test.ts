/**
 * Account enforcement parity (Phase 8 plan §4.4): for every WriteAction ×
 * {active, suspended, expired suspension, banned}, a representative client
 * write succeeds in the database exactly when accountWriteAllowed says so.
 * Each write runs in its own transaction and is rolled back, so the actors'
 * state never drifts between cells.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accountWriteAllowed, type AccountState, type WriteAction } from "@safeplace/visibility-policy";
import { createTestDb, type Querier, type TestDb } from "../harness";
import { GROUP2_ID, FAMILY_SPACE_ID, MEDIA, USER, insertPost, seedFixtures } from "../seed";
import { STAFF, seedStaff } from "../staff-seed";

const hx = (s: string): string => `00000000-0000-0000-0000-${s.padStart(12, "0")}`;
const DAY = 24 * 3600 * 1000;

type StateKey = "active" | "suspended" | "expired" | "banned";
const STATES: StateKey[] = ["active", "suspended", "expired", "banned"];
const ACTIONS: WriteAction[] = [
  "post",
  "comment",
  "message",
  "message_request",
  "profile_edit",
  "media_upload",
  "interaction",
  "report",
  "appeal",
];

interface Actor {
  id: string;
  post: string; // published, public
  draft: string; // draft, no audiences
  comment: string; // on `post`
  conversation: string; // with maleFiltered
  avatar: string; // an own profile media row, not yet the avatar
}

const ACTOR: Record<StateKey, Actor> = Object.fromEntries(
  STATES.map((s, i) => [
    s,
    {
      id: hx(`7a${i}`),
      post: hx(`7b${i}`),
      draft: hx(`7c${i}`),
      comment: hx(`7d${i}`),
      conversation: hx(`7e${i}`),
      avatar: hx(`7f${i}`),
    },
  ])
) as Record<StateKey, Actor>;

const now = Date.now();
const ACCOUNT: Record<StateKey, AccountState> = {
  active: { status: "active", suspendedUntil: null },
  suspended: { status: "active", suspendedUntil: new Date(now + DAY) },
  expired: { status: "active", suspendedUntil: new Date(now - DAY) },
  banned: { status: "banned", suspendedUntil: null },
};

const TARGET_POST = MEDIA.find((m) => m.exposure[0].kind === "public" && m.classification === "general")!.postId;

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
  await seedStaff(db.raw);
  for (const s of STATES) {
    const a = ACTOR[s];
    await db.raw.query(
      `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, '{"gender":"male"}')`,
      [a.id, `${s}@enforcement.test`]
    );
    await insertPost(db.raw, { postId: a.post, authorId: a.id, exposure: [{ kind: "public" }] });
    await db.raw.query(`insert into public.posts (id, author_id, text, status) values ($1, $2, 'd', 'draft')`, [a.draft, a.id]);
    await db.raw.query(`insert into public.comments (id, post_id, author_id, text) values ($1, $2, $3, 'c')`, [a.comment, a.post, a.id]);
    await db.raw.query(`insert into public.conversations (id, participant_a, participant_b) values ($1, $2, $3)`, [
      a.conversation,
      a.id,
      USER.maleFiltered.id,
    ]);
    await db.raw.query(
      `insert into public.media_items (id, profile_id, uploader_id, storage_path, classification, classified_at,
                                       sex_level, violence_level, religion_level, addictions_level)
       values ($1, $2, $2, $3, 'general', now(), 0, 0, 0, 0)`,
      [a.avatar, a.id, `${a.id}/avatar`]
    );
    const acc = ACCOUNT[s];
    await db.raw.query(`update public.profiles set account_status = $2, suspended_until = $3 where id = $1`, [
      a.id,
      acc.status,
      acc.suspendedUntil,
    ]);
  }
});
afterAll(async () => {
  await db.close();
});

class Rollback extends Error {}

/** Whether `sql` writes at least one row as `userId`. Always rolled back. */
async function attempt(userId: string, sql: string, params: unknown[]): Promise<boolean> {
  try {
    await db.asUser(userId, async (q: Querier) => {
      const r = (await q.query(sql, params)) as { affectedRows?: number };
      if (!r.affectedRows) throw new Rollback("denied: no row written");
      throw new Rollback("allowed");
    });
  } catch (e) {
    if (e instanceof Rollback) return e.message === "allowed";
    const msg = (e as Error).message;
    // Only an enforcement refusal counts as "denied"; anything else is a broken fixture.
    if (/row-level security|account restricted/.test(msg)) return false;
    throw e;
  }
  throw new Error("unreachable");
}

interface Write {
  action: WriteAction;
  label: string;
  sql: string;
  params: (a: Actor) => unknown[];
}

const WRITES: Write[] = [
  { action: "post", label: "create a post", sql: `insert into public.posts (author_id, text, status) values ($1, 'x', 'draft')`, params: (a) => [a.id] },
  { action: "post", label: "edit a post", sql: `update public.posts set text = 'edited' where id = $1`, params: (a) => [a.post] },
  { action: "post", label: "add an audience", sql: `insert into public.post_audiences (post_id, kind) values ($1, 'public')`, params: (a) => [a.draft] },
  { action: "post", label: "add a poll", sql: `insert into public.polls (post_id, question) values ($1, 'q')`, params: (a) => [a.draft] },
  { action: "post", label: "tag a user", sql: `insert into public.post_tags (post_id, tagged_user_id) values ($1, $2)`, params: (a) => [a.draft, USER.author.id] },
  { action: "comment", label: "comment", sql: `insert into public.comments (post_id, author_id, text) values ($2, $1, 'c')`, params: (a) => [a.id, TARGET_POST] },
  { action: "comment", label: "edit a comment", sql: `update public.comments set text = 'e' where id = $1`, params: (a) => [a.comment] },
  {
    action: "message",
    label: "send a message",
    sql: `insert into public.messages (conversation_id, sender_id, text) values ($2, $1, 'm')`,
    params: (a) => [a.id, a.conversation],
  },
  {
    action: "message",
    label: "open a conversation",
    sql: `insert into public.conversations (participant_a, participant_b) values ($1, $2)`,
    params: (a) => [a.id, USER.femaleDefault.id],
  },
  {
    action: "message_request",
    label: "send a message request",
    sql: `insert into public.message_requests (sender_id, recipient_id, text) values ($1, $2, 'hi')`,
    params: (a) => [a.id, USER.femaleDefault.id],
  },
  {
    action: "media_upload",
    label: "attach media",
    sql: `insert into public.media_items (post_id, uploader_id, storage_path) values ($2, $1, $3)`,
    params: (a) => [a.id, a.draft, `${a.id}/new.jpg`],
  },
  {
    action: "media_upload",
    label: "upload a storage object",
    sql: `insert into storage.objects (bucket_id, name, owner) values ('media', $2, $1)`,
    params: (a) => [a.id, `${a.id}/new.jpg`],
  },
  { action: "profile_edit", label: "change bio", sql: `update public.profiles set bio = 'b' where id = $1`, params: (a) => [a.id] },
  { action: "profile_edit", label: "change display name", sql: `update public.profiles set display_name = 'n' where id = $1`, params: (a) => [a.id] },
  {
    action: "profile_edit",
    label: "change avatar",
    sql: `update public.profiles set avatar_media_id = $2 where id = $1`,
    params: (a) => [a.id, a.avatar],
  },
  { action: "interaction", label: "like a post", sql: `insert into public.post_likes (user_id, post_id) values ($1, $2)`, params: (a) => [a.id, TARGET_POST] },
  { action: "interaction", label: "like a comment", sql: `insert into public.comment_likes (user_id, comment_id) values ($1, $2)`, params: (a) => [a.id, a.comment] },
  { action: "interaction", label: "save a post", sql: `insert into public.post_saves (user_id, post_id) values ($1, $2)`, params: (a) => [a.id, TARGET_POST] },
  { action: "interaction", label: "follow", sql: `insert into public.follows (follower_id, followed_id) values ($1, $2)`, params: (a) => [a.id, USER.author.id] },
  { action: "interaction", label: "mute", sql: `insert into public.user_mutes (muter_id, muted_id) values ($1, $2)`, params: (a) => [a.id, USER.author.id] },
  { action: "interaction", label: "block", sql: `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, params: (a) => [a.id, USER.maleUnfiltered.id] },
  {
    action: "interaction",
    label: "suggestion feedback",
    sql: `insert into public.suggestion_feedback (viewer_id, target_user_id, kind) values ($1, $2, 'less_like_this')`,
    params: (a) => [a.id, USER.author.id],
  },
  { action: "interaction", label: "join a group", sql: `insert into public.group_members (group_id, user_id) values ($2, $1)`, params: (a) => [a.id, GROUP2_ID] },
  {
    action: "interaction",
    label: "join a Family Space",
    sql: `insert into public.family_space_members (space_id, user_id) values ($2, $1)`,
    params: (a) => [a.id, FAMILY_SPACE_ID],
  },
  {
    action: "interaction",
    label: "create a group",
    sql: `insert into public.groups (name, color, icon, visibility) values ('N', '#000', 'x', 'public')`,
    params: () => [],
  },
  { action: "interaction", label: "create a Family Space", sql: `insert into public.family_spaces (name, admin_user_id) values ('F', $1)`, params: (a) => [a.id] },
  { action: "interaction", label: "change a filter setting", sql: `update public.filter_settings set show_suggested_posts = false where user_id = $1`, params: (a) => [a.id] },
  { action: "interaction", label: "change a privacy setting", sql: `update public.profiles set show_online_status = false where id = $1`, params: (a) => [a.id] },
  { action: "interaction", label: "delete own post", sql: `delete from public.posts where id = $1`, params: (a) => [a.post] },
  {
    action: "report",
    label: "report a post",
    sql: `insert into public.reports (reporter_id, target_type, target_id, category) values ($1, 'post', $2, 'spam')`,
    params: (a) => [a.id, TARGET_POST],
  },
];

describe("visibility.account_write_allowed equals accountWriteAllowed", () => {
  for (const s of STATES) {
    it(`state=${s}`, async () => {
      for (const action of ACTIONS) {
        const { rows } = await db.asUser(ACTOR[s].id, (q) =>
          q.query<{ ok: boolean }>(`select visibility.account_write_allowed($1) as ok`, [action])
        );
        expect(rows[0]!.ok, `${s} × ${action}`).toBe(accountWriteAllowed(ACCOUNT[s], action, new Date()));
      }
    });
  }

  it("is false for every action for a staff caller (no profile)", async () => {
    for (const action of ACTIONS) {
      const { rows } = await db.asStaff(STAFF.admin, (q) =>
        q.query<{ ok: boolean }>(`select visibility.account_write_allowed($1) as ok`, [action])
      );
      expect(rows[0]!.ok, action).toBe(false);
    }
  });
});

describe("client writes are allowed exactly when accountWriteAllowed says so", () => {
  for (const s of STATES) {
    for (const w of WRITES) {
      const want = accountWriteAllowed(ACCOUNT[s], w.action, new Date());
      it(`${s}: ${w.label} (${w.action}) → ${want ? "allowed" : "denied"}`, async () => {
        expect(await attempt(ACTOR[s].id, w.sql, w.params(ACTOR[s]))).toBe(want);
      });
    }
  }
});

it("a suspended user can still like, follow, report, join a group and accept a Family Space invite", async () => {
  const a = ACTOR.suspended;
  for (const label of ["like a post", "follow", "report a post", "join a group", "join a Family Space"]) {
    const w = WRITES.find((x) => x.label === label)!;
    expect(await attempt(a.id, w.sql, w.params(a)), label).toBe(true);
  }
});

it("a suspended user's bio change is refused by the column trigger", async () => {
  await expect(
    db.asUser(ACTOR.suspended.id, (q) => q.query(`update public.profiles set bio = 'b' where id = $1`, [ACTOR.suspended.id]))
  ).rejects.toThrow(/account restricted/);
});

it("no client can lift its own suspension or ban", async () => {
  const a = ACTOR.suspended;
  await expect(
    db.asUser(a.id, (q) => q.query(`update public.profiles set suspended_until = null where id = $1`, [a.id]))
  ).rejects.toThrow(/not client-writable/);
  await expect(
    db.asUser(a.id, (q) => q.query(`update public.profiles set account_status = 'frozen' where id = $1`, [a.id]))
  ).rejects.toThrow(/not client-writable/);
  // A banned user cannot update their profile at all.
  const b = ACTOR.banned;
  expect(await attempt(b.id, `update public.profiles set account_status = 'active' where id = $1`, [b.id])).toBe(false);
  const { rows } = await db.raw.query<{ s: string }>(`select account_status as s from public.profiles where id = $1`, [b.id]);
  expect(rows[0]!.s).toBe("banned");
});

it("an author cannot restore a removed post or comment", async () => {
  const a = ACTOR.active;
  await db.raw.query(`update public.posts set removed_at = now() where id = $1`, [a.post]);
  await db.raw.query(`update public.comments set removed_at = now() where id = $1`, [a.comment]);
  // No WHERE: an unfiltered update skips the SELECT policies, so only the trigger stops it.
  await expect(db.asUser(a.id, (q) => q.query(`update public.posts set removed_at = null`))).rejects.toThrow(
    /not client-writable/
  );
  await expect(db.asUser(a.id, (q) => q.query(`update public.comments set removed_at = null`))).rejects.toThrow(
    /not client-writable/
  );
  await db.raw.query(`update public.posts set removed_at = null where id = $1`, [a.post]);
  await db.raw.query(`update public.comments set removed_at = null where id = $1`, [a.comment]);
});

it("the column guards bind client roles only: a SECURITY DEFINER console RPC may edit a profile", async () => {
  // Stand-in for a console RPC: owned by the migration role, so current_user is not a client role.
  await db.raw.exec(`
    create function public.test_console_edit(target uuid) returns void
      language sql security definer set search_path = '' as $fn$
      update public.profiles set bio = 'reset by staff', suspended_until = now() + interval '7 days' where id = target;
    $fn$;
    grant execute on function public.test_console_edit(uuid) to authenticated;`);
  const a = ACTOR.suspended;
  await db.asStaff(STAFF.admin, (q) => q.query(`select public.test_console_edit($1)`, [a.id]));
  const { rows } = await db.raw.query<{ bio: string }>(`select bio from public.profiles where id = $1`, [a.id]);
  expect(rows[0]!.bio).toBe("reset by staff");
  await db.raw.exec(`drop function public.test_console_edit(uuid)`);
});
