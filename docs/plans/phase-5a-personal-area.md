# Phase 5a — Personal area, content-filter settings and blocks: plan and implementation handoff

Written 2026-11-23 in the Phase 5a session. Every decision below was made with Eli, one
fork at a time (§2 lists them). Do not re-litigate them. Anything not covered here is an
open question (§11): ask Eli, don't guess (CLAUDE.md §3).

Branch: `phase-5a-personal`, from `origin/main` @ `ea20471` (Phase 8 plan and locked lab
on main; Phase 8a is being implemented in parallel on `phase-8-admin`).

Status: **plan approved by Eli 2026-11-23 (four design sections). Lab built
(`docs/design/phase-5a-personal/personal-lab.html`, 45 screens), waiting for Eli's
review and lock.** The same session implements the phase (roadmap "How we work").

**Dependency on Phase 8a.** This phase designs against Phase 8's data tier as written in
`docs/plans/phase-8-admin-portal.md` §4.3–4.5: the `banned` account status,
`profiles.suspended_until`, `accountWriteAllowed`, `removed` media, `canViewProfilePhoto`
returning false for a banned owner, and the "Phase 5 handoff" bullets of its §7. No
migration is written and `packages/visibility-policy` is not touched until 8a is merged
into `main`; then this branch is rebased and every migration here is dated after 8a's.

## 0. What this phase delivers

- **Personal area tab** (spec 05 §3): header, the six sections in spec order (three are
  "בקרוב" rows), saved posts, people (my following / my followers), entry to settings.
- **Public profile** (05 §2): header with avatar, name, bio, three numbers (number without
  list, invariant #5), follow / about / edit; posts tab and grid tab; About page; "user
  unavailable" for blocked, banned and deleted users.
- **Edit profile**: name, bio, avatar. Avatar = a photo through the classification
  pipeline (invariant #8), or one of 12 code-drawn abstract presets, or the initial.
  Filtered avatar shows as the neutral initial (05 §2.6.1, legal #17). Avatar opt-out.
- **Settings shell** (06 §2): six categories in spec order.
  - **Content filter**: four group levels (0–2), "filter applies to avatars", "show
    suggested posts", every change behind the double confirm (06 §4, invariant #7).
  - **Privacy**: default post exposure, who can follow, discoverability, block list.
  - Account: name / bio / avatar live, the rest "בקרוב". Sign out.
- **Block** from the post, profile and comment menus (07 §7.3); unblock from the block
  list (07 §7.4).
- **Onboarding step 3** becomes a clean message (Eli's change, §2 #16).

It closes **pilot blocker 1** (no screen lets a user change the content filter) and the
**Phase 8 → Phase 5 handoff** items.

Out of scope: groups and Family Spaces (5b); gender change, account deletion, email,
password (6); messages, search, notifications, inbox, follow requests (7); production
plumbing (P).

## 1. Design: lab, then lock

- **Lab:** `docs/design/phase-5a-personal/personal-lab.html`, in the conventions of
  `docs/design/phase-4-feed/feed-lab.html`:
  - single HTML file, lab panel on the left, `?bare=1&screen=<name>` renders one screen;
  - 390×844 phone frames; the Phase 4 phone CSS and helpers are reused **verbatim** (as
    `admin-lab.html` does), with Eli's locked Phase 4 choices, so new screens match the
    shipped feed;
  - tokens from `packages/design-tokens`; real Hebrew copy.
- **Images:** Eli never views images. Every avatar photo and post image is a placeholder
  (abstract scene or a striped block). The 12 avatar presets are geometric patterns drawn
  in code: no people, no figures.
- **Open visual questions** (lab panel; the default is shown until Eli locks):
  - Q1 profile header layout: centred / side-by-side;
  - Q2 level picker: segmented 0/1/2 with a description line / three stacked radio cards;
  - Q3 settings list style: grouped white cards / flat full-width rows;
  - Q4 grid spacing: 2 px gutters / 6 px gutters with rounded tiles;
  - Q5 "send message" on another user's profile: greyed "בקרוב" / hidden.
- **After Eli locks it:** reference PNGs to `docs/design/phase-5a-personal/reference/`;
  implementation must match them pixel by pixel (`scripts/pixel-compare`, 390×844).
- **Copy status:** every user-facing string in the lab is **Eli's product copy, drafted
  by engineering and marked as a draft** in the lab panel. §9 lists the drafts.

## 2. Product decisions (Eli, 2026-11-22 … 2026-11-23)

| # | Fork | Decision |
|---|---|---|
| 1 | Unbuilt personal-area sections | All six sections of 05 §3.1 in spec order. Inbox (Phase 7), Family Spaces and my groups (5b) are greyed rows marked `בקרוב`, like the statuses item in Phase 4. The layout never reshuffles later. |
| 2 | People lists (05 §3.1.6) | Built: my following and my followers, visible only to me (invariant #5). Following rows have Unfollow. No "remove follower". |
| 3 | Settings root | All six categories of 06 §2.2 in spec order. Account: name / bio / avatar live, email / password / gender `בקרוב`. Notifications and Danger zone greyed `בקרוב`. Feed preferences: the suggested-posts toggle (the spec-sanctioned duplicate, 06 §3.5) plus dark mode and language `בקרוב`. Sign out at the bottom of the root. |
| 4 | Double-confirm scope | **Every change** in the Content filter category, both directions (06 §3.3 as written): the four levels, "filter applies to avatars", "show suggested posts". The duplicate in Feed preferences and the Phase 4 "why am I seeing this?" sheet toggle route through the same confirm. |
| 5 | Step 2 of the confirm | Type the word `מאשר`. The confirm button enables only on an exact match. Password re-auth stays for Phase 6 (gender, deletion). |
| 6 | `hideWomenAccounts` (backlog §J) | **Removed from onboarding** and not added to settings until it has a product and legal meaning. Today the onboarding row states something the app doesn't do. The column stays; §J stays open. |
| 7 | Who can follow | `כולם` live, `רק באישור` greyed `בקרוב`. Follow requests are built with the Phase 7 inbox. |
| 8 | Default post exposure (backlog §J sync) | Settings owns it: `ציבורי` / `עוקבים בלבד` live, `קבוצות בלבד` `בקרוב` (5b). Every new post's picker starts from it; changing the picker for one post never changes the default. **Closes the §J sync item.** |
| 9 | Avatar sources | Upload a photo (classified), or pick one of ~12 non-figurative presets drawn in code from the brand palette with the user's initial (app assets, not user media: no pipeline). Default is the initial-letter avatar. **No cover image** in 5a (another media surface; 05 §2.1 says optional). |
| 10 | New avatar while classifying | Others see the neutral initial until it resolves (existing fail-closed path). The owner sees their photo with a processing / under-review state, and the general notice card when a group is found (Understood / Remove photo / Appeal). |
| 11 | About page (backlog §I) | Full bio (up to 300 characters; the header shows the first two lines) plus "member since <month year>". No new fields; §I stays open for more. |
| 12 | Gender and privacy columns | The profile never shows gender (master §3.4). Other users' gender and privacy-setting columns stop being readable by clients. Rules that need them read inside SECURITY DEFINER functions. |
| 13 | Block and existing follows | Blocking deletes follows in both directions. Unblocking does not restore them. Both follower numbers drop; the blocked user is not told. |
| 14 | Which posts a profile shows (05 §2.2) | Posts written from the profile (source `profile`), to whoever may see them under the normal rules (a group-addressed profile post shows to that group's members). Posts written inside a group page, and anything addressed to a Family Space, never appear on a profile, not even to the author. |
| 15 | Header numbers (05 §2.5) | Followers / following / groups. Groups counts public and private-visible groups only, so a hidden group never leaks even as a number. The owner sees their full count. |
| 16 | Onboarding step 3 (backlog §K) | Eli: the defaults list is messy for a new user. Step 3 becomes a clean message ("we saved recommended content-filter defaults for your account; you can change them anytime in Settings → Content filter") with a quiet "what was set?" link that opens a read-only sheet of the four groups and their levels. **This departs from master spec §6.2.3** (which lists the defaults as toggles) and is noted against legal #3. The spec is not edited (CLAUDE.md §6). Closes backlog §K "onboarding women row is yes/no". |

Engineering choices inside the approved design (Eli may veto at lab review):
- One identical "user unavailable" screen for blocked (either direction), banned,
  deleted and unknown users. Nobody can tell a block from a ban (07 §7.2).
- Unblock: a short confirm sheet, no typed confirm.
- Saved posts: newest saved first; a saved post that became invisible (author blocked,
  banned, content removed) is dropped silently.
- "Show activity" (online status, 06 §3.2): a `בקרוב` row. No presence system exists.
- Display name 2–30 characters; bio 0–300.

## 3. Model

### 3.1 Profile states

A profile, for a given viewer, is either **visible** or **unavailable**.

```
unavailable ⇐ no profile row | deleted | banned (Phase 8) | block in either direction
visible     ⇐ otherwise (the owner always sees their own, even when suspended)
```

Suspension (`suspended_until > now()`) does not hide a profile (Phase 8 fork 16).

### 3.2 Avatar resolution

```
resolveProfileAvatar(viewer, profile):
  owner                                        → photo if set, else preset if set, else initial
  photo set and canViewProfilePhoto(viewer)    → photo
  preset set                                   → preset
  otherwise                                    → initial
```

`canViewProfilePhoto` is unchanged (owner always; levels check with the sex group lifted
when the viewer turned "filter applies to avatars" off; unresolved and removed withheld;
banned owner false per Phase 8). A filtered photo and "no photo" render identically, as
the 05 §2.6.1 neutral avatar, legal #17.

### 3.3 What appears on a profile

```
isProfilePost(post) = post.status = published
                  and post.sourceKind = 'profile'
                  and no audience is family_space
                  and not removed (Phase 8)
onProfile(viewer, post)   = isProfilePost(post) and canViewPost(viewer, post)
inGrid(viewer, post, media) = onProfile(viewer, post) and ∃ m ∈ media: canViewMedia(viewer, m)
```

The posts tab renders like the feed: a filtered item shows the filtered placeholder and
the text stays (05 §2.6.3). The grid shows only posts with at least one media item the
viewer may see (05 §2.6.2); its tile is the first such item.

### 3.4 Content-filter change flow

```
tap a level / toggle ─► warning sheet (step 1: what changes, effective now, changeable anytime)
                          ├─ ביטול (prominent) ─► nothing changes
                          └─ המשך (secondary) ─► typed confirm (step 2: type "מאשר")
                                                    ├─ exact match ─► write ─► toast "ההגדרה עודכנה"
                                                    └─ back ─► nothing changes
```

One change per flow. The same module (`apps/mobile/src/screens/settings/dangerous.ts`)
decides which settings are dangerous and builds the warning text; every entry point
(Content filter, Feed preferences, the Phase 4 "why" sheet) routes through it.

### 3.5 Blocking

- Block (post, profile or comment menu): confirm sheet with 07 §7.3's copy → `blocks`
  insert → trigger deletes follows both ways → toast. The current screen drops the user's
  content at once (the next read path returns nothing of theirs; the UI also removes it
  locally).
- Unblock (Settings → Privacy → Block list): short confirm → `blocks` delete. Follows are
  not restored.
- Mutual invisibility is already enforced in the DB (`visibility.is_blocked_with` in
  posts, comments, media and profiles RLS). Nothing new is needed on the read side
  beyond the profile states above.

## 4. Data tier

All new migrations are dated after Phase 8a's last migration. Every function follows the
Phase 4 rule: revoked from `public, anon`; granted to `authenticated` (and
`service_role` where needed). Every rule gets a PGlite parity test in
`packages/db-testing`.

### 4.1 Migration A — `profile_privacy`

- **Column privileges on `profiles`** (decision 12):
  - `revoke select, update on public.profiles from authenticated`;
  - `grant select (id, display_name, bio, avatar_media_id, avatar_preset, created_at, account_status)`;
    `account_status` stays readable because Phase 8's read-side hiding and the client's
    "unavailable" state use it. (Confirm in implementation that nothing else is needed:
    `/visibility-audit` on every reader of `profiles`.)
  - `grant update (display_name, bio, avatar_media_id, avatar_preset, default_post_exposure, who_can_follow, discoverable_in_search)`;
  - gender, gender-change columns, `show_*`, `account_status`, `suspended_until` are
    never client-writable. Phase 8's suspension column-check trigger stays as written.
  - RLS policies are unchanged; column grants sit on top of them.
- **`public.my_profile()`** (SECURITY DEFINER, own row only): every column the owner
  needs, including gender and the privacy settings. `buildViewerContext` reads gender from
  it instead of `profiles`.
- **`profiles_visible`** recreated (it is SECURITY INVOKER, so it can no longer read
  `gender` directly): `gender` becomes `case when p.id = auth.uid() then visibility.viewer_gender() end`
  (a new SECURITY DEFINER helper returning the caller's own gender); adds `avatar_preset`.
- **`profiles.avatar_preset text`**, check `avatar_preset in ('p01' … 'p12')`; check
  `num_nonnulls(avatar_media_id, avatar_preset) <= 1`.
- **Checks:** `char_length(display_name) between 2 and 30` (`not valid` then validated;
  the signup fallback name "New member" passes), `char_length(bio) <= 300`.
- Functions that already read other users' gender (`follow_suggestions`,
  `visibility.can_suggest_user`) are SECURITY DEFINER today; re-verify each still works
  with the narrowed grants.

### 4.2 Migration B — `blocks_and_follows`

- **`blocks_after_insert`** trigger (SECURITY DEFINER): delete `follows` where
  (follower, followed) is (blocker, blocked) or (blocked, blocker). Decision 13.
- **`public.my_blocked_users(p_cursor timestamptz default null, p_limit int default 30)`**
  (SECURITY DEFINER): `blocked_id, display_name, avatar_preset, blocked_at` for the
  caller's own `blocks` rows, newest first. The blocked user's profile is hidden from the
  blocker by RLS, so this is the only way to list them. No photo (the initial or preset
  only): a block list is not a reason to reveal a photo.
- **`follows_insert_self`** recreated: `follower_id = auth.uid()` and
  `visibility.can_follow(followed_id)`.
- **`visibility.can_follow(target)`** (SECURITY DEFINER): not self; not already
  following; `visibility.profile_visible(target)`; target's `who_can_follow = 'everyone'`
  (decision 7: an approval-only account can't be followed until Phase 7 builds requests).

### 4.3 Migration C — `profile_read_paths`

- **`visibility.profile_visible(target)`** (SECURITY DEFINER): target exists, status not
  in (`deleted`, `banned`), no block either way; true for self. Mirror of
  `canViewProfile`. Phase 8's profiles RLS already hides banned rows; this predicate is
  what functions and counts call.
- **`public.profile_card(p_target uuid)`** (SECURITY INVOKER, one row):
  - `state` (`visible` | `unavailable`); when unavailable, every other column is NULL;
  - `id, display_name, bio, member_since` (`created_at`);
  - `avatar_media_id, avatar_filtered, avatar_preset` from `profiles_visible`;
  - `follower_count, following_count, group_count`;
  - `is_self, viewer_follows, can_follow`.
- **`public.profile_posts(p_target uuid, p_before timestamptz default null, p_before_id uuid default null, p_limit int default 20)`**
  (SECURITY INVOKER): rows in the `feed_page` shape (post, author, audiences the caller
  satisfies, `post_media_json`, stats) where `visibility.is_profile_post(p.id)` and the
  `posts` RLS admits the row. Keyset on `(published_at, id)` descending.
- **`visibility.is_profile_post(post_id)`** (SECURITY DEFINER): published, source
  `profile`, no `family_space` audience, `removed_at is null`. Mirror of `isProfilePost`.
- **`public.profile_grid(p_target uuid, p_before …, p_limit int default 30)`** (SECURITY
  INVOKER): `post_id, media_id, storage_path` of the first media item per post whose
  `media_items_visible.storage_path` is not null; posts with none are skipped. Mirror of
  `inGrid`.
- **`public.saved_posts(p_before timestamptz default null, p_limit int default 20)`**
  (SECURITY INVOKER): the caller's `post_saves` joined to posts the caller can still see
  (`posts` RLS), in the feed shape plus `saved_at`, newest saved first.
- **`public.my_follow_list(p_kind text, p_before …, p_limit int default 30)`** (SECURITY
  INVOKER): `p_kind in ('following','followers')`; the caller's own edges joined to
  `profiles_visible` (so blocked, banned and deleted people drop out); `user_id,
  display_name, avatar_media_id, avatar_filtered, avatar_preset, followed_at`. No target
  parameter exists, so nobody can ask for another user's list.
- **`public.group_count(target uuid)`** (SECURITY DEFINER): NULL unless
  `profile_visible(target)`; for self, all memberships; for others, memberships in groups
  with `visibility in ('public','private_visible')`.
- **`follower_count` / `following_count`** replaced: NULL unless
  `profile_visible(target)`; count only edges whose other end is not `banned`/`deleted`
  (Phase 8 §4.4 left this to Phase 5).

### 4.4 Migration D — `avatar_visibility_fix`

- **Bug (found 2026-11-23):** `media_items_visible` decides `storage_path` for every row
  with `media_url_permitted(m, family_space, is_uploader)`, which never applies the
  avatar opt-out. A viewer with "filter applies to avatars" off gets the avatar id from
  `profiles_visible` (via `avatar_permitted`) but the storage policy refuses to sign the
  file. Fix: for rows with `profile_id is not null`, `url_ok` is
  `visibility.avatar_permitted(m.id)` (which already includes the uploader case and the
  Phase 8 `removed` / banned rules once 8a lands). Recreate the view on top of Phase 8's
  latest definition, changing only that branch.
- **Replacing an avatar** (trigger on `profiles` update of `avatar_media_id` or
  `avatar_preset`): delete the previous avatar's `media_items` row, so the orphan queue
  removes the object, **unless** it is `removed` or under a Phase 8 legal hold
  (moderation evidence). Its open review-queue task is closed by the existing cascade
  (verify in implementation; if the queue keeps a dangling reference, resolve it instead).
- `avatar_preset` set ⇒ `avatar_media_id` is nulled by the client in the same update
  (the check in §4.1 enforces at most one).

### 4.5 What is not changed

- `filter_settings`: unchanged. The typed `מאשר` is a UI safeguard; the database cannot
  verify that a word was typed. `updateFilterSettings` is the one writer.
- `hide_women_accounts`: stored, unenforced, no longer shown anywhere (decision 6).
- Phase 8's restrictive write guards already cover a suspended user's bio / avatar /
  name edits and a banned user's every write.

## 5. `visibility-policy` additions

Each rule: unit tests, SQL mirror, parity test.

| Rule | SQL mirror | Meaning |
|---|---|---|
| `canViewProfile(viewer, target: {userId, accountStatus})` | `visibility.profile_visible` | §3.1. Blocks come from `viewer.blockedUsers` (own edges) and the DB for the other direction, as today. |
| `isProfilePost(post)` | `visibility.is_profile_post` | §3.3. `PostContext` gains `removed` (Phase 8 adds it; reuse). |
| `canAppearInProfileGrid(viewer, post, media[])` | inside `profile_grid` | §3.3. |
| `canFollow(viewer, target: {userId, accountStatus, whoCanFollow})` | `visibility.can_follow` + follows insert policy | Not self, not following, profile visible, `whoCanFollow === "everyone"`. |
| `canViewFollowList(viewer, ownerId)` | structural (`my_follow_list` has no target) | Owner only (invariant #5). |
| `countsGroupMembership(viewer, ownerId, groupVisibility)` | `group_count` | Owner: any group. Others: `public` / `private_visible`. |
| `canViewProfileGender(viewer, ownerId)` | `profiles_visible`, `my_profile` | Owner only. |
| `resolveProfileAvatar(viewer, profile)` | `profiles_visible` + `media_items_visible` (fixed) | §3.2: `"photo" \| "preset" \| "initial"`. |

New types: `WhoCanFollow = "everyone" | "approval_required"`; `AvatarPreset` (`p01`…`p12`).

**Parity matrix additions:**
- viewer × target: self, stranger, follower, blocked-by-me, blocking-me, suspended,
  banned, deleted;
- who can follow: everyone / approval;
- posts: audience public / followers / group (member, non-member) / Family Space × source
  profile / group × removed or not;
- media: general, `sex` 1 and 2, other groups at 1/2, unclassified, pending review,
  removed;
- avatar: photo / preset / none × photo levels 0/1/2 × viewer opt-out on/off × owner
  banned;
- groups: public / private_visible / private_hidden × self / other;
- counts: NULL for an unavailable target; banned followers not counted.

## 6. API (`packages/api-client`)

Thin typed wrappers, tested against PGlite through `supabase-adapter` as in Phase 4.

- `profile.ts`:
  - `getProfileCard(s, targetId)`, `getProfilePosts(s, targetId, cursor)`,
    `getProfileGrid(s, targetId, cursor)`;
  - `getMyProfile(s)`, `updateProfile(s, { displayName?, bio? })`;
  - `updatePrivacy(s, { defaultPostExposure?, whoCanFollow?, discoverableInSearch? })`.
- `avatar.ts` (wired via `/wire-moderation`):
  - `setAvatarPhoto(s, userId, bytes, contentType)`: `uploadMedia` → insert
    `media_items { profile_id: userId, uploader_id: userId, storage_path }` (the insert
    trigger enqueues classification) → `profiles.update({ avatar_media_id, avatar_preset: null })`;
  - `getMyAvatarState(s, userId)`: own `media_items_visible` row → `resolveUploaderMediaState`;
  - `setAvatarPreset(s, preset)`, `removeAvatar(s)`.
- `people.ts`: `getSavedPosts`, `getMyFollowList(kind)`, `follow`, `unfollow`.
- `blocks.ts`: `blockUser`, `unblockUser`, `getMyBlockedUsers`.
- `viewer-context.ts`: gender from `my_profile()`.
- Reused: `updateFilterSettings`, `savePost` / `unsavePost`, `appealClassification`,
  `signOut`, `getSignedMediaUrl`.
- Errors from Phase 8's write guards map to the blocked sheet (Phase 8 §5.2), never a
  generic error.

## 7. Screens

All at 390×844, RTL, reduced-motion respected (sheets fade instead of slide). Lab names:

**Personal area (Profile tab)**
- `me`: header (avatar, name, `צפייה בפרופיל הציבורי שלי`); rows: inbox `בקרוב`,
  Family Spaces `בקרוב`, saved posts (count), my groups `בקרוב`, people (two rows with
  counts), settings.
- `following`, `followers`: own lists; following rows have `הסרת מעקב`; a line says only
  you see this list. `peopleEmpty`.
- `saved`: compact feed cards, newest saved first. `savedEmpty`. `savedMenu` (post menu
  with `הסרה מהשמורים`).

**Public profile**
- `profile`: another user, posts tab (header, bio two lines, three numbers, `מעקב` /
  `במעקב`, `אודות`, the Q5 message button; tabs `פוסטים` / `תמונות`).
- `profileGrid`: grid tab.
- `profileOwn`: own profile (`עריכת פרופיל` instead of follow; a compose entry).
- `profileFiltered`: neutral initial avatar, a post with the filtered placeholder.
- `profileEmpty`, `profileUnavailable`, `profileLoading` (skeleton), `profileError`.
- `profileMenu`: `דיווח על המשתמש`, `חסימת <name>`.
- `about`: full bio, member since.

**Block**
- `blockConfirm`: 07 §7.3 copy. `blockedToast`.
- `postMenuBlock`, `commentMenuBlock`: the Phase 4 menus with the block row added.

**Edit profile**
- `editProfile`: avatar with `שינוי תמונה`, name field, bio field with counter, save.
- `avatarSheet`: upload a photo / choose from gallery / remove.
- `avatarGallery`: the 12 presets.
- `avatarProcessing`, `avatarReview`: own avatar with the state strip and the line
  "meanwhile others see your initial".
- `avatarNotice`: the general notice card (Understood / Remove photo / Appeal).
- `editSuspended`: Phase 8's blocked sheet over edit profile.
- `editError`: save failed.

**Settings**
- `settings`: root, six categories, sign out.
- `settingsAccount`, `settingsPrivacy`, `feedPrefs`.
- `blockedList`, `blockedEmpty`, `unblockConfirm`.
- `filter`: four level pickers (Q2), the two toggles, the level-3 transparency line.
- `filterWarn` (step 1), `filterType` (step 2, empty), `filterTypeReady` (typed, enabled),
  `filterDone` (toast).
- `whyConfirm`: the Phase 4 "why" sheet toggle opening step 1.
- `signOut`: confirm.

**Onboarding**
- `onbDefaults`: the new step 3 in the locked onboarding visual language.
- `onbDefaultsSheet`: the read-only "what was set?" sheet.

## 8. Order of work

1. Plan and lab (this document). **Stop for Eli's lock.**
2. Wait for 8a to merge into `main`; rebase; export reference PNGs from the locked lab
   (Edge headless, 390×844, reduced motion forced).
3. ADRs via `/new-adr` (§10).
4. `visibility-policy` rules test-first (§5), then migrations A–D with SQL mirrors and
   parity; `/visibility-audit` on every changed read path (`profiles`,
   `profiles_visible`, `media_items_visible`, storage select, every new function, the
   follows insert policy).
5. api-client (§6) with PGlite tests; `/wire-moderation` for the avatar surface.
6. `packages/ui`: profile header, count row, tabs, grid tile, settings row and group,
   level picker, typed-confirm field, preset avatar renderer, people row.
7. Screens in order: personal area; public profile and About; edit profile and avatar;
   settings root, privacy, block list; content filter and double confirm (and the "why"
   sheet change); block menus; onboarding step 3. Remove the `hideWomenAccounts` row from
   onboarding.
8. Verify:
   - `pnpm typecheck && pnpm lint && pnpm test` green, output quoted;
   - `/visibility-audit` on every read path; `/wire-moderation` on the avatar;
   - pixel compare against the PNGs on Expo web at 390×844;
   - hosted migration apply needs Eli's approval;
   - Eli runs one device pass.
9. Update docs: `data-model.md` (Phase 5a notes), `visibility-model.md` (profile surfaces
   table), backlog (§I, §J, §K items closed or re-pointed), legal tracker notes (§10),
   roadmap row 5a.

## 9. Copy drafts (Eli's product copy; drafts until he signs them off)

Masculine generic, as Phase 4 (`תוכל`, not `תוכל/י`), except onboarding, which keeps its
own `תוכל/י` convention. Group names reuse the accepted `CONTENT_GROUP_LABELS_HE`.

- **Personal area:** `אזור אישי`; `צפייה בפרופיל הציבורי שלי`; `תיבת דואר`,
  `מרחבים משפחתיים`, `פוסטים שמורים`, `הקבוצות שלי`, `אנשים`, `אנשים שאני עוקב אחריהם`,
  `העוקבים שלי`, `הגדרות`; list note `רק אתה רואה את הרשימה הזו.`
- **Profile:** `עוקבים` / `נעקבים` / `קבוצות`; `מעקב` / `במעקב`; `אודות`;
  `עריכת פרופיל`; tabs `פוסטים` / `תמונות`; empty `עדיין אין כאן פוסטים.`; grid empty
  `אין עדיין תמונות להצגה.`; unavailable `משתמש זה אינו זמין.` (07 §7.2); About
  `חבר מאז <חודש שנה>`.
- **Block** (07 §7.3, verbatim): `אתה עומד לחסום את <שם>. אחרי החסימה, אף אחד מכם לא
  יראה את התוכן של השני.`; buttons `חסימה` / `ביטול`; toast `<שם> נחסם`. Unblock:
  `לבטל את החסימה של <שם>?` / `ביטול חסימה`.
- **Avatar:** `העלאת תמונה`, `בחירה מהגלריה`, `הסרת התמונה`; processing
  `התמונה בעיבוד. בינתיים אחרים רואים את האות הראשונה של שמך.`; review
  `התמונה בבדיקה. בינתיים אחרים רואים את האות הראשונה של שמך.`; notice: the accepted
  `CONTENT_NOTICE_HE` buttons, but the title says "in the current post", so the avatar
  needs its own title (new draft): `זוהה בתמונת הפרופיל שהעלית תוכן שמשתמשים רבים ברשת
  בחרו שלא לראות. עליך לדעת שבעקבות זאת חלק מהמשתמשים יראו במקומה את האות הראשונה של
  שמך.`; back action `הסרת התמונה`. Gallery: `גלריית אווטרים`, `בחר עיצוב. האות הראשונה
  של שמך תופיע עליו.`
- **Content filter:** intro `בחר מה מוצג לך. ההגדרות חלות רק עליך, ואפשר לשנות אותן בכל
  עת.` Level names (segments): `מוסתר` / `חלקי` / `מורחב`. One line per group and level:
  - נשים: `לא יוצגו לך תמונות שמופיעות בהן נשים.` / `יוצגו לך נשים בלבוש צנוע בלבד.` /
    `יוצגו לך גם נשים בלבוש שאינו צנוע.`;
  - אלימות: `לא יוצג לך תוכן אלים.` / `יוצגו לך נשק, ספורט קרב ותגרות קלות.` /
    `יוצגו לך גם קטטות, דם ופציעות.`;
  - סמלים דתיים: `לא יוצגו לך סמלים של דתות אחרות.` / `יוצג לך סמל שולי, כמו כנסייה
    בנוף.` / `יוצגו לך גם סמלים בולטים, טקסים ואנשי דת.`;
  - התמכרויות: `לא יוצג לך תוכן של התמכרויות.` / `יוצגו לך שכרות, עישון וקנאביס.` /
    `יוצגו לך גם סמים קשים והימורים.`
  - Level-3 line: `תוכן בוטה — עירום, אכזריות קשה או עבודה זרה — אינו מתפרסם ב-Safe·Place
    כלל.` (touches legal #27).
  - Toggles: `הסינון חל גם על תמונות פרופיל` (hint `כשכבוי, תמונות פרופיל של נשים יוצגו לך.
    שאר התחומים ממשיכים לחול.`); `הצגת פוסטים מוצעים` (hint `פוסטים ציבוריים מאנשים שאינך
    עוקב אחריהם`).
- **Double confirm** (pattern of 06 §4.3.1): step 1 title `שינוי סינון התוכן`; body built
  from the change, e.g. `אתה עומד לשנות את הסינון בתחום נשים מ"מוסתר" ל"חלקי". מעכשיו
  יוצגו לך תמונות של נשים בלבוש צנוע. השינוי ייכנס לתוקף מיד, ואפשר לשנות שוב בכל עת.`
  (the lab carries four variants: loosen, tighten, avatars, suggested posts); a
  from → to line above it; buttons `ביטול` (prominent) / `המשך`. Step 2 title `אישור
  סופי`, `כדי לאשר, הקלד את המילה מאשר`, button `אישור השינוי`, link `חזרה`. Toast
  `ההגדרה עודכנה`.
- **Privacy:** `חשיפת פוסטים כברירת מחדל`: `ציבורי` / `עוקבים בלבד` / `קבוצות בלבד`
  (hint `כל פוסט חדש יתחיל מהבחירה הזו. אפשר לשנות בכל פוסט בנפרד.`); `מי יכול לעקוב
  אחריי`: `כולם` / `רק באישור`; `מי יכול למצוא אותי`: `כולם` / `רק העוקבים שלי` /
  `אף אחד` (hint `משפיע על הצעות למעקב, ובהמשך גם על החיפוש.`); `רשימת חסומים`;
  `הצגת פעילות`.
- **Sign out:** `להתנתק מ-Safe·Place במכשיר הזה?` / `התנתקות` / `ביטול`.
- **Onboarding step 3:** title `ברירות המחדל שלך` (kept); body `שמרנו עבורך הגדרות סינון
  תוכן מומלצות. תוכל/י לראות ולשנות אותן בכל עת בהגדרות › סינון תוכן.`; link
  `מה הוגדר?`; button `הבנתי, המשך` (kept). Sheet title `הגדרות הסינון שלך`, rows per
  group with the level label, footer `אפשר לשנות בכל עת בהגדרות.`

## 10. ADRs, legal and docs

**ADRs** (numbers after Phase 8's 0020–0025):

| # | Title |
|---|---|
| 0026 | Profile read paths and column privacy: `profile_card` / `profile_posts` / `profile_grid` / `saved_posts` / `my_follow_list`; profile states; gender and privacy columns closed with column grants and `my_profile()`; counts guarded by `profile_visible` |
| 0027 | Block side effects: follows deleted both ways, not restored; `my_blocked_users`; follow insert through `can_follow` |
| 0028 | Onboarding step 3 simplified to a message plus a read-only sheet; `hideWomenAccounts` withdrawn from every screen until defined |

**Legal tracker** (🔴 stays 🔴; engineering notes, not sign-off):
- **#3** signup flow: step 3 no longer lists the defaults on the screen; they are one tap
  away (decision 16). Counsel should see this against master §6.2.3's transparency
  rationale.
- **#5** declared gender: now readable only by its owner and by server-side rules (an
  improvement in proportionality).
- **#16** counts: the groups number joins followers / following; hidden groups are never
  counted for others.
- **#17** neutral avatar: a filtered photo is indistinguishable from no photo; presets
  added.
- **#22** discoverability: the setting ships; it affects follow suggestions now and
  search in Phase 7.
- **#25** is adjacent (double confirm for message separation, Phase 7) and reuses the
  confirm built here.
- **#27** the level-3 transparency line on the filter screen describes prohibited
  content to users.

**Product clarifications for Eli** (spec not edited; add a note when Eli confirms the
wording):
- master §6.2.3: step 3 is a message plus a sheet (decision 16).
- master §4.3.2 / §6.2.3 and onboarding: "accounts defined as female" withdrawn until
  defined (decision 6).
- 06 §3.2: "groups only" default exposure waits for 5b; "only with approval" waits for
  Phase 7.

## 11. Open questions

None blocking. Raised during the lab review if Eli wants them:
- Lab panel Q1–Q5 (visual).
- The copy drafts in §9.

## Progress log

### 2026-11-22 / 23 — planning session

- Grounded on 05, 06 (structure, §3, §4), 07 §7, master §2, §3.4–3.6, §4.3, §6.2.3, the
  profile/author parts of 01 and 03, the architecture docs, ADRs 0005, 0007, 0014–0019,
  backlog §I/§J/§K, the legal tracker, the Phase 8 plan, migrations, `visibility-policy`,
  api-client, the onboarding defaults screen, the mobile profile/author placeholders and
  `packages/ui`.
- Found: `media_items_visible` does not apply the avatar opt-out when signing avatar
  files (§4.4); `profiles` exposes every user's gender and privacy columns to any
  signed-in user (§4.1).
- 16 forks settled with Eli (§2). Design approved in four sections.
- Lab built: `docs/design/phase-5a-personal/personal-lab.html`, 45 phone screens.
  - Assembled from the Phase 4 feed lab: its head, phone CSS and helper JS (icons,
    scene, avatar, source label, card, interaction bar, bottom nav) are copied verbatim,
    with Phase 4's locked choices; Phase 8's phone pieces (blocked sheet, appeal form)
    are copied verbatim for `editSuspended`. Phase 5a CSS and screens are appended.
  - Every screen rendered with Edge headless (`--window-size=390,844
    --force-prefers-reduced-motion`, `?bare=1&screen=<name>`) and checked by eye.
    Fixed in that pass: the onboarding sheet inherited white text; two presets had a
    white letter on a light fill; the avatar notice reused the post wording ("in the
    current post"), so it got an avatar-specific draft (§9).
  - No image of a person anywhere: avatar photos and post media are abstract scenes;
    presets are geometric patterns.
- Waiting for Eli: lab review and lock (Q1–Q5), copy drafts (§9).
