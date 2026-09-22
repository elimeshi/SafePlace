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
  FilterSettings,
  Gender,
  MediaClassification,
} from "@safeplace/visibility-policy";
import { resolveDefaultFilterSettings } from "@safeplace/visibility-policy";
import type { PGlite } from "@electric-sql/pglite";

const hx = (s: string): string =>
  `00000000-0000-0000-0000-${s.padStart(12, "0")}`;

export const GROUP_ID = hx("6a0");
export const FAMILY_SPACE_ID = hx("f50");

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
  | "blocked";

export interface UserFixture {
  key: UserKey;
  id: string;
  gender: Gender;
  filter: FilterSettings;
  follows: string[];
  groups: string[];
  familySpaces: string[];
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
    groups: [GROUP_ID],
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
      return { kind: "public" };
    case "followers":
      return { kind: "followers_only", authorId };
    case "group":
      return { kind: "group", groupId: GROUP_ID };
    case "family":
      return { kind: "family_space", spaceId: FAMILY_SPACE_ID };
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
  exposure: { kind: "public" },
  familySpaceId: null,
};
MEDIA.push(BLOCKED_POST_MEDIA);

/** Ordered (blocker, blocked) pairs — a single block establishes mutual invisibility. */
export const BLOCKS: Array<[string, string]> = [[AUTHOR, BLOCKED]];

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

  // 4. Posts + their media (classification set directly = post-pipeline state).
  for (const m of MEDIA) {
    const e = m.exposure;
    await q(
      db,
      `insert into public.posts (id, author_id, text, exposure_kind, exposure_group_id, exposure_space_id)
       values ($1, $2, 'post', $3, $4, $5)`,
      [
        m.postId,
        m.uploaderId,
        e.kind,
        e.kind === "group" ? e.groupId : null,
        e.kind === "family_space" ? e.spaceId : null,
      ]
    );
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
