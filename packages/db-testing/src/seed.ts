/**
 * The shared fixture matrix (ADR 0006). The SAME data structure both (a) seeds
 * the database and (b) drives the expected-decision computation in the parity
 * tests — so a divergence between the DB's RLS and @safeplace/visibility-policy
 * can only ever mean a real enforcement bug, not a test that drifted.
 *
 * Seeding runs on the superuser/owner connection (db.raw), which bypasses RLS —
 * it is ground truth, not an enforcement path. Classifications are set directly
 * (representing post-pipeline state); the pipeline itself is Phase 3.
 */
import type {
  ContentExposure,
  GroupVisibility,
  PostSourceKind,
  PostStatus,
  FilterSettings,
  Gender,
  MediaClassification,
} from "@safeplace/visibility-policy";
import { resolveDefaultFilterSettings } from "@safeplace/visibility-policy";
import type { PGlite } from "@electric-sql/pglite";

const hx = (s: string): string =>
  `00000000-0000-0000-0000-${s.padStart(12, "0")}`;

export const GROUP_ID = hx("6a0");
/** A second, PUBLIC group (GROUP_ID is private_hidden) — multi-audience cases. */
export const GROUP2_ID = hx("6a1");
export const FAMILY_SPACE_ID = hx("f50");
/** Group visibility as seeded — the share rule needs it. */
export const GROUP_VISIBILITY: ReadonlyMap<string, GroupVisibility> = new Map([
  [hx("6a0"), "private_hidden"],
  [hx("6a1"), "public"],
]);

export const EXPOSURES = ["public", "followers", "group", "family"] as const;
export const CLASSES: MediaClassification[] = [
  "general",
  "unclassified",
  "pending_review",
  "contains_women",
];

export type UserKey =
  | "author"
  | "maleFiltered"
  | "maleUnfiltered"
  | "femaleDefault"
  | "femaleFiltered"
  | "follower"
  | "groupMember"
  | "fsMember"
  | "blocked"
  | "muter"
  | "noSuggest"
  | "suppressor"
  | "group2Member"
  | "bothGroups";

export interface UserFixture {
  key: UserKey;
  id: string;
  gender: Gender;
  filter: FilterSettings;
  follows: string[];
  groups: string[];
  familySpaces: string[];
  /** Users this user muted. */
  mutes?: string[];
  /** Users this user gave dont_suggest feedback on. */
  suppressed?: string[];
  /** classification of this user's avatar, if any (media on their profile). */
  avatar?: { id: string; classification: MediaClassification };
}

function withFilter(gender: Gender, overrides: Partial<FilterSettings> = {}): FilterSettings {
  return { ...resolveDefaultFilterSettings(gender), ...overrides };
}

const AUTHOR = hx("a00");
const MALE_FILTERED = hx("a01");
const MALE_UNFILTERED = hx("a02");
const FEMALE_DEFAULT = hx("a03");
const FEMALE_FILTERED = hx("a04");
const FOLLOWER = hx("a05");
const GROUP_MEMBER = hx("a06");
const FS_MEMBER = hx("a07");
const BLOCKED = hx("a08");

const MUTER = hx("a09");
const NO_SUGGEST = hx("a0a");
const SUPPRESSOR = hx("a0b");
const GROUP2_MEMBER = hx("a0c");
const BOTH_GROUPS = hx("a0d");

export const USERS: UserFixture[] = [
  // Author of the content grid. Deliberately male/default (content filter ON):
  // this makes them a FILTERED uploader, so the parity suite proves the
  // "uploader always sees their own content" rule fires for every
  // classification — including contains_women they'd otherwise have filtered.
  // Author gender never affects how OTHERS see the content (classify content,
  // not users). Member of the group + family space so they satisfy their own
  // group/family exposure (which has no author special-case).
  {
    key: "author",
    id: AUTHOR,
    gender: "male",
    filter: withFilter("male"),
    follows: [],
    groups: [GROUP_ID, GROUP2_ID],
    familySpaces: [FAMILY_SPACE_ID],
    avatar: { id: hx("b00"), classification: "general" },
  },
  { key: "maleFiltered", id: MALE_FILTERED, gender: "male", filter: withFilter("male"), follows: [], groups: [], familySpaces: [] },
  {
    key: "maleUnfiltered",
    id: MALE_UNFILTERED,
    gender: "male",
    filter: withFilter("male", { hideContentWithWomen: false, filterAppliesToAvatars: false }),
    follows: [],
    groups: [],
    familySpaces: [],
  },
  {
    key: "femaleDefault",
    id: FEMALE_DEFAULT,
    gender: "female",
    filter: withFilter("female"),
    follows: [],
    groups: [],
    familySpaces: [],
    // A woman's profile photo, classified as containing women — exercises avatar filtering.
    avatar: { id: hx("b03"), classification: "contains_women" },
  },
  {
    key: "femaleFiltered",
    id: FEMALE_FILTERED,
    gender: "female",
    filter: withFilter("female", { hideContentWithWomen: true, filterAppliesToAvatars: true }),
    follows: [],
    groups: [],
    familySpaces: [],
  },
  {
    key: "follower",
    id: FOLLOWER,
    gender: "male",
    filter: withFilter("male"),
    follows: [AUTHOR],
    groups: [],
    familySpaces: [],
    // An avatar still in the pipeline — exercises the fail-closed
    // 'unclassified' branch on the avatar path (migration 0007), which no
    // other fixture reaches.
    avatar: { id: hx("b05"), classification: "unclassified" },
  },
  { key: "groupMember", id: GROUP_MEMBER, gender: "male", filter: withFilter("male"), follows: [], groups: [GROUP_ID], familySpaces: [] },
  { key: "fsMember", id: FS_MEMBER, gender: "male", filter: withFilter("male"), follows: [], groups: [], familySpaces: [FAMILY_SPACE_ID] },
  {
    key: "blocked",
    id: BLOCKED,
    gender: "male",
    filter: withFilter("male", { hideContentWithWomen: false, filterAppliesToAvatars: false }),
    follows: [],
    groups: [],
    familySpaces: [],
  },
  // Follows the author but muted them: the post stays reachable, the feed drops it.
  { key: "muter", id: MUTER, gender: "male", filter: withFilter("male"), follows: [AUTHOR], groups: [], familySpaces: [], mutes: [AUTHOR] },
  { key: "noSuggest", id: NO_SUGGEST, gender: "male", filter: withFilter("male", { showSuggestedPosts: false }), follows: [], groups: [], familySpaces: [] },
  { key: "suppressor", id: SUPPRESSOR, gender: "male", filter: withFilter("male"), follows: [], groups: [], familySpaces: [], suppressed: [AUTHOR] },
  { key: "group2Member", id: GROUP2_MEMBER, gender: "female", filter: withFilter("female"), follows: [], groups: [GROUP2_ID], familySpaces: [] },
  { key: "bothGroups", id: BOTH_GROUPS, gender: "male", filter: withFilter("male"), follows: [], groups: [GROUP_ID, GROUP2_ID], familySpaces: [] },
];

export const USER = Object.fromEntries(USERS.map((u) => [u.key, u])) as Record<UserKey, UserFixture>;

export interface MediaFixture {
  mediaId: string;
  postId: string;
  uploaderId: string;
  classification: MediaClassification;
  /** The parent post's exposure — the ContentExposure the TS policy evaluates. */
  exposure: ContentExposure;
  /** family space id iff this media's post is family-space-exposed. */
  familySpaceId: string | null;
}

function exposureFor(kind: (typeof EXPOSURES)[number], authorId: string): ContentExposure {
  switch (kind) {
    case "public":
      return [{ kind: "public" }];
    case "followers":
      return [{ kind: "followers_only", authorId }];
    case "group":
      return [{ kind: "group", groupId: GROUP_ID }];
    case "family":
      return [{ kind: "family_space", spaceId: FAMILY_SPACE_ID }];
  }
}

/** The 16-cell exposure×classification grid authored by `author`, plus one
 * public/general post authored by `blocked` (to exercise the reverse block
 * direction). */
export const MEDIA: MediaFixture[] = [];
let seq = 0;
for (const exposure of EXPOSURES) {
  for (const classification of CLASSES) {
    seq += 1;
    MEDIA.push({
      postId: hx(`c${seq.toString().padStart(2, "0")}`),
      mediaId: hx(`d${seq.toString().padStart(2, "0")}`),
      uploaderId: AUTHOR,
      classification,
      exposure: exposureFor(exposure, AUTHOR),
      familySpaceId: exposure === "family" ? FAMILY_SPACE_ID : null,
    });
  }
}
export const BLOCKED_POST_MEDIA: MediaFixture = {
  postId: hx("ce0"),
  mediaId: hx("de0"),
  uploaderId: BLOCKED,
  classification: "general",
  exposure: [{ kind: "public" }],
  familySpaceId: null,
};
MEDIA.push(BLOCKED_POST_MEDIA);

/** Ordered (blocker, blocked) pairs — a single block establishes mutual invisibility. */
export const BLOCKS: Array<[string, string]> = [[AUTHOR, BLOCKED]];

/**
 * Every post the feed/post-visibility parity suites reason about: the media
 * grid's posts (all by `author`) plus the multi-audience, draft and group
 * cases. `PostContext` is what the TS policy evaluates; the DB is seeded from
 * the same record.
 */
export interface PostFixture {
  postId: string;
  authorId: string;
  status: PostStatus;
  exposure: ContentExposure;
  sourceKind: PostSourceKind;
  sourceGroupId: string | null;
  sourceSpaceId: string | null;
}

const GRID_SOURCE: Record<(typeof EXPOSURES)[number], PostSourceKind> = {
  public: "profile",
  followers: "profile",
  group: "group",
  family: "family_space",
};

export const POSTS: PostFixture[] = [];
{
  let i = 0;
  for (const exposure of EXPOSURES) {
    for (let c = 0; c < CLASSES.length; c++) {
      const m = MEDIA[i++]!;
      POSTS.push({
        postId: m.postId,
        authorId: m.uploaderId,
        status: "published",
        exposure: m.exposure,
        sourceKind: GRID_SOURCE[exposure],
        sourceGroupId: exposure === "group" ? GROUP_ID : null,
        sourceSpaceId: exposure === "family" ? FAMILY_SPACE_ID : null,
      });
    }
  }
}
POSTS.push({
  postId: BLOCKED_POST_MEDIA.postId,
  authorId: BLOCKED,
  status: "published",
  exposure: BLOCKED_POST_MEDIA.exposure,
  sourceKind: "profile",
  sourceGroupId: null,
  sourceSpaceId: null,
});

const profilePost = (key: string, exposure: ContentExposure, status: PostStatus = "published"): PostFixture => ({
  postId: hx(key),
  authorId: AUTHOR,
  status,
  exposure,
  sourceKind: "profile",
  sourceGroupId: null,
  sourceSpaceId: null,
});

export const EXTRA_POSTS = {
  /** Two groups: in G1 only / G2 only / both / neither. */
  twoGroups: profilePost("e01", [
    { kind: "group", groupId: GROUP_ID },
    { kind: "group", groupId: GROUP2_ID },
  ]),
  /** Followers plus a group (visible to a follower OR a G2 member). */
  followersAndGroup: profilePost("e02", [
    { kind: "followers_only", authorId: AUTHOR },
    { kind: "group", groupId: GROUP2_ID },
  ]),
  /** Author-only draft. */
  draft: profilePost("e03", [{ kind: "public" }], "draft"),
  /** Public, in the public group only (everyone-in-G2 reads, others do not). */
  group2Only: profilePost("e04", [{ kind: "group", groupId: GROUP2_ID }]),
};
POSTS.push(...Object.values(EXTRA_POSTS));

/** Ordered by pick order, which is what `position` records. */
export async function insertPost(
  db: PGlite,
  p: Pick<PostFixture, "postId" | "authorId" | "exposure"> &
    Partial<Pick<PostFixture, "status" | "sourceKind" | "sourceGroupId" | "sourceSpaceId">> & {
      text?: string;
      quotedPostId?: string | null;
    }
): Promise<void> {
  // Same path a client takes: a draft, then its audiences, then publish (the
  // posts_guard trigger validates the combination and the membership).
  await db.query(
    `insert into public.posts (id, author_id, text, status, source_kind, source_group_id, source_space_id, quoted_post_id)
     values ($1, $2, $3, 'draft', $4, $5, $6, $7)`,
    [
      p.postId,
      p.authorId,
      p.text ?? "post",
      p.sourceKind ?? "profile",
      p.sourceGroupId ?? null,
      p.sourceSpaceId ?? null,
      p.quotedPostId ?? null,
    ]
  );
  for (const [position, a] of p.exposure.entries()) {
    await db.query(
      `insert into public.post_audiences (post_id, kind, group_id, space_id, position)
       values ($1, $2, $3, $4, $5)`,
      [
        p.postId,
        a.kind,
        a.kind === "group" ? a.groupId : null,
        a.kind === "family_space" ? a.spaceId : null,
        position,
      ]
    );
  }
  if ((p.status ?? "published") === "published") {
    await db.query(`update public.posts set status = 'published' where id = $1`, [p.postId]);
  }
}

/** A public published post — the shape most pipeline tests need. */
export function insertPublicPost(db: PGlite, postId: string, authorId: string, text: string): Promise<void> {
  return insertPost(db, { postId, authorId, text, exposure: [{ kind: "public" }] });
}

async function q(db: PGlite, sql: string, params: unknown[] = []): Promise<void> {
  await db.query(sql, params);
}

export async function seedFixtures(db: PGlite): Promise<void> {
  // 1. Users via the real signup path: insert auth.users with gender metadata,
  //    letting handle_new_user() build the profile + default filter_settings.
  for (const u of USERS) {
    await q(
      db,
      `insert into auth.users (id, email, raw_user_meta_data)
       values ($1, $2, jsonb_build_object('gender', $3::text, 'display_name', $4::text))`,
      [u.id, `${u.key}@example.test`, u.gender, u.key]
    );
    // Apply non-default filter overrides so each viewer's DB settings match its
    // fixture (and thus the TS expectation).
    await q(
      db,
      `update public.filter_settings set
         hide_content_with_women = $2,
         hide_women_accounts = $3,
         filter_applies_to_avatars = $4,
         show_suggested_posts = $5,
         gender_separation_in_messages = $6,
         gender_separation_in_search = $7
       where user_id = $1`,
      [
        u.id,
        u.filter.hideContentWithWomen,
        u.filter.hideWomenAccounts,
        u.filter.filterAppliesToAvatars,
        u.filter.showSuggestedPosts,
        u.filter.genderSeparationInMessages,
        u.filter.genderSeparationInSearch,
      ]
    );
  }

  // 2. Group + family space, with memberships.
  await q(db, `insert into public.groups (id, name, color, icon, visibility) values ($1, 'G', '#111', 'star', 'private_hidden')`, [GROUP_ID]);
  await q(db, `insert into public.groups (id, name, color, icon, visibility) values ($1, 'G2', '#222', 'heart', 'public')`, [GROUP2_ID]);
  await q(db, `insert into public.family_spaces (id, name, admin_user_id) values ($1, 'FS', $2)`, [FAMILY_SPACE_ID, AUTHOR]);
  for (const u of USERS) {
    for (const g of u.groups) await q(db, `insert into public.group_members (group_id, user_id) values ($1, $2)`, [g, u.id]);
    for (const s of u.familySpaces) await q(db, `insert into public.family_space_members (space_id, user_id) values ($1, $2)`, [s, u.id]);
  }

  // 3. Follows + blocks.
  for (const u of USERS) {
    for (const followed of u.follows) await q(db, `insert into public.follows (follower_id, followed_id) values ($1, $2)`, [u.id, followed]);
  }
  for (const [blocker, blocked] of BLOCKS) {
    await q(db, `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [blocker, blocked]);
  }

  for (const u of USERS) {
    for (const muted of u.mutes ?? []) await q(db, `insert into public.user_mutes (muter_id, muted_id) values ($1, $2)`, [u.id, muted]);
    for (const t of u.suppressed ?? []) await q(db, `insert into public.suggestion_feedback (viewer_id, target_user_id, kind) values ($1, $2, 'dont_suggest')`, [u.id, t]);
  }

  // 4. Posts (draft -> audiences -> publish, as a client does) + their media
  // (classification set directly = post-pipeline state).
  for (const p of POSTS) await insertPost(db, p);
  for (const m of MEDIA) {
    await q(
      db,
      `insert into public.media_items (id, post_id, uploader_id, storage_path, classification, classified_at)
       values ($1, $2, $3, $4, $5, now())`,
      [m.mediaId, m.postId, m.uploaderId, `media/${m.mediaId}`, m.classification]
    );
    // Mirror each media into a Storage object (name == storage_path) so the
    // storage-tier policy has something to gate.
    await q(db, `insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)`, [`media/${m.mediaId}`, m.uploaderId]);
  }

  // 5. Avatars: profile-parented media, then wire profiles.avatar_media_id.
  for (const u of USERS) {
    if (!u.avatar) continue;
    await q(
      db,
      `insert into public.media_items (id, profile_id, uploader_id, storage_path, classification, classified_at)
       values ($1, $2, $2, $3, $4, now())`,
      [u.avatar.id, u.id, `media/${u.avatar.id}`, u.avatar.classification]
    );
    await q(db, `insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)`, [`media/${u.avatar.id}`, u.id]);
    await q(db, `update public.profiles set avatar_media_id = $2 where id = $1`, [u.id, u.avatar.id]);
  }
}
