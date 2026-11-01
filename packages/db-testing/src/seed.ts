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
  ContentLevels,
  MediaClassification,
  ViewerContentLevels,
} from "@safeplace/visibility-policy";
import { resolveDefaultFilterSettings } from "@safeplace/visibility-policy";
import type { PGlite } from "@electric-sql/pglite";
import type { Querier } from "./harness";

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
  | "bothGroups"
  | "maleLevels1"
  | "femaleLevels2"
  | "maleSexOnlyLifted";

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
  /** This user's avatar, if any (media on their profile): lifecycle + resolved levels. */
  avatar?: { id: string; classification: MediaClassification; levels: ContentLevels | null };
}

/** Resolved levels for the legacy grid: only the women axis is known. */
export function legacyLevels(c: MediaClassification): ContentLevels | null {
  if (c !== "general" && c !== "contains_women") return null;
  return { sex: c === "contains_women" ? 1 : 0, violence: 0, religion: 0, addictions: 0 };
}

/**
 * Values for (sex_level, violence_level, religion_level, addictions_level):
 * NULLs unless resolved. The DB CHECK media_levels_match_lifecycle requires a
 * resolved row to carry all four, so every direct classification write uses this.
 */
export function levelColumns(
  c: MediaClassification,
  levels: ContentLevels | null = legacyLevels(c)
): Array<number | null> {
  return [levels?.sex ?? null, levels?.violence ?? null, levels?.religion ?? null, levels?.addictions ?? null];
}

/** A pipeline-equivalent write: moves a media row to `c` together with its level columns. */
export async function setMediaClassification(
  db: Querier,
  mediaId: string,
  c: MediaClassification,
  levels: ContentLevels | null = legacyLevels(c)
): Promise<void> {
  await db.query(
    `update public.media_items set classification = $2::media_classification, classified_at = now(),
       sex_level = $3, violence_level = $4, religion_level = $5, addictions_level = $6
     where id = $1`,
    [mediaId, c, ...levelColumns(c, levels)]
  );
}

const maxima = (n: 0 | 1 | 2): ViewerContentLevels => ({ sex: n, violence: n, religion: n, addictions: n });

function withFilter(gender: Gender, overrides: Partial<FilterSettings> = {}): FilterSettings {
  const f = { ...resolveDefaultFilterSettings(gender), ...overrides };
  // hideContentWithWomen is derived (the DB column is GENERATED from max_sex_level).
  return { ...f, hideContentWithWomen: f.contentLevels.sex === 0 };
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
const MALE_LEVELS_1 = hx("a0e");
const FEMALE_LEVELS_2 = hx("a0f");
const MALE_SEX_ONLY_LIFTED = hx("a10");

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
    avatar: { id: hx("b00"), classification: "general", levels: legacyLevels("general") },
  },
  { key: "maleFiltered", id: MALE_FILTERED, gender: "male", filter: withFilter("male"), follows: [], groups: [], familySpaces: [] },
  {
    key: "maleUnfiltered",
    id: MALE_UNFILTERED,
    gender: "male",
    filter: withFilter("male", { contentLevels: { sex: 1, violence: 0, religion: 0, addictions: 0 }, filterAppliesToAvatars: false }),
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
    avatar: { id: hx("b03"), classification: "contains_women", levels: legacyLevels("contains_women") },
  },
  {
    key: "femaleFiltered",
    id: FEMALE_FILTERED,
    gender: "female",
    filter: withFilter("female", { contentLevels: { sex: 0, violence: 0, religion: 0, addictions: 0 }, filterAppliesToAvatars: true }),
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
    avatar: { id: hx("b05"), classification: "unclassified", levels: null },
  },
  { key: "groupMember", id: GROUP_MEMBER, gender: "male", filter: withFilter("male"), follows: [], groups: [GROUP_ID], familySpaces: [] },
  { key: "fsMember", id: FS_MEMBER, gender: "male", filter: withFilter("male"), follows: [], groups: [], familySpaces: [FAMILY_SPACE_ID] },
  {
    key: "blocked",
    id: BLOCKED,
    gender: "male",
    filter: withFilter("male", { contentLevels: { sex: 1, violence: 0, religion: 0, addictions: 0 }, filterAppliesToAvatars: false }),
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
  // Per-group level viewers (ADR 0018). The content filter still applies to their avatars.
  { key: "maleLevels1", id: MALE_LEVELS_1, gender: "male", filter: withFilter("male", { contentLevels: maxima(1) }), follows: [], groups: [], familySpaces: [] },
  {
    key: "femaleLevels2",
    id: FEMALE_LEVELS_2,
    gender: "female",
    filter: withFilter("female", { contentLevels: maxima(2) }),
    follows: [],
    groups: [],
    familySpaces: [],
    // An avatar with a non-sex level: the avatar opt-out lifts sex only, so a
    // viewer with filterAppliesToAvatars=false but violence max 0 still gets
    // the generic avatar (Eli, 2026-11-02).
    avatar: { id: hx("b0f"), classification: "contains_women", levels: { sex: 1, violence: 1, religion: 0, addictions: 0 } },
  },
  // Family Space member with every maximum at 0: the space lifts sex, nothing else.
  { key: "maleSexOnlyLifted", id: MALE_SEX_ONLY_LIFTED, gender: "male", filter: withFilter("male", { contentLevels: maxima(0) }), follows: [], groups: [], familySpaces: [FAMILY_SPACE_ID] },
];

export const USER = Object.fromEntries(USERS.map((u) => [u.key, u])) as Record<UserKey, UserFixture>;

export interface MediaFixture {
  mediaId: string;
  postId: string;
  uploaderId: string;
  classification: MediaClassification;
  /** Resolved per-group levels; null while unclassified / pending_review. */
  levels: ContentLevels | null;
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
      levels: legacyLevels(classification),
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
  levels: legacyLevels("general"),
  exposure: [{ kind: "public" }],
  familySpaceId: null,
};
MEDIA.push(BLOCKED_POST_MEDIA);

/**
 * The per-group level grid (ADR 0018), all by `author`: for each non-sex group
 * and level 1..2 one public `general` item with only that level set, one public
 * `contains_women` at sex 2, and one Family Space item at {sex 2, violence 1}.
 */
export const LEVEL_MEDIA: MediaFixture[] = [];
{
  const zero: ContentLevels = { sex: 0, violence: 0, religion: 0, addictions: 0 };
  let n = 0;
  const add = (classification: MediaClassification, levels: ContentLevels, family: boolean): void => {
    n += 1;
    LEVEL_MEDIA.push({
      postId: hx(`c8${n}`),
      mediaId: hx(`d8${n}`),
      uploaderId: AUTHOR,
      classification,
      levels,
      exposure: exposureFor(family ? "family" : "public", AUTHOR),
      familySpaceId: family ? FAMILY_SPACE_ID : null,
    });
  };
  for (const g of ["violence", "religion", "addictions"] as const) {
    for (const level of [1, 2] as const) add("general", { ...zero, [g]: level }, false);
  }
  add("contains_women", { ...zero, sex: 2 }, false);
  add("contains_women", { ...zero, sex: 2, violence: 1 }, true);
}

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
for (const m of LEVEL_MEDIA) {
  POSTS.push({
    postId: m.postId,
    authorId: m.uploaderId,
    status: "published",
    exposure: m.exposure,
    sourceKind: m.familySpaceId ? "family_space" : "profile",
    sourceGroupId: null,
    sourceSpaceId: m.familySpaceId,
  });
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
         max_sex_level = $2,
         hide_women_accounts = $3,
         filter_applies_to_avatars = $4,
         show_suggested_posts = $5,
         gender_separation_in_messages = $6,
         gender_separation_in_search = $7,
         max_violence_level = $8,
         max_religion_level = $9,
         max_addictions_level = $10
       where user_id = $1`,
      [
        u.id,
        u.filter.contentLevels.sex,
        u.filter.hideWomenAccounts,
        u.filter.filterAppliesToAvatars,
        u.filter.showSuggestedPosts,
        u.filter.genderSeparationInMessages,
        u.filter.genderSeparationInSearch,
        u.filter.contentLevels.violence,
        u.filter.contentLevels.religion,
        u.filter.contentLevels.addictions,
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
  for (const m of [...MEDIA, ...LEVEL_MEDIA]) {
    await q(
      db,
      `insert into public.media_items (id, post_id, uploader_id, storage_path, classification, classified_at,
                                       sex_level, violence_level, religion_level, addictions_level)
       values ($1, $2, $3, $4, $5, now(), $6, $7, $8, $9)`,
      [m.mediaId, m.postId, m.uploaderId, `media/${m.mediaId}`, m.classification,
       ...levelColumns(m.classification, m.levels)]
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
      `insert into public.media_items (id, profile_id, uploader_id, storage_path, classification, classified_at,
                                       sex_level, violence_level, religion_level, addictions_level)
       values ($1, $2, $2, $3, $4, now(), $5, $6, $7, $8)`,
      [u.avatar.id, u.id, `media/${u.avatar.id}`, u.avatar.classification,
       ...levelColumns(u.avatar.classification, u.avatar.levels)]
    );
    await q(db, `insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)`, [`media/${u.avatar.id}`, u.id]);
    await q(db, `update public.profiles set avatar_media_id = $2 where id = $1`, [u.id, u.avatar.id]);
  }
}
