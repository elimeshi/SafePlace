# Phase 4 — Feed, Compose, Single Post: implementation handoff

Written 2026-10-19 at the end of the planning session, for the cloud sessions that
implement this phase. Everything below was decided with Eli. Do not re-litigate it.
Anything not covered here is an open question, so ask Eli rather than guess
(CLAUDE.md §3, standing rule).

Branch: `phase-4-feed` (= Phase 3 tip `6a8dc34` + a tree-neutral merge of `origin/main`).

## 0. State at handoff

- Suite green uncached: `pnpm turbo run typecheck lint test --force` gave 23/23 tasks and
  330 tests passed, 3 skipped (the live api-client suite, which self-skips without
  `SUPABASE_TEST_*`).
- The classification pipeline end to end and `media_items_visible` withholding were
  confirmed hermetically (`packages/db-testing` worker-end-to-end, media-visibility
  parity, classification-lifecycle).
- Expo patches bumped (expo 54.0.37, expo-constants 18.0.14), and `expo-doctor` passes
  18/18.
- **Still waiting on Eli (do not work around these):**
  1. Fast-forward `main` to `b8460a3` and push it. The safety check blocked this.
  2. The hosted Supabase project was resumed, but the Phase 3 migrations
     (`20260922000001`–`07`) have probably never been applied to it. Applying them, and
     the Phase 4 ones, needs Eli's explicit OK each time, or Eli runs them.
  3. To run the worker live, `services/moderation-pipeline/.env.local` (gitignored)
     needs `SUPABASE_SERVICE_ROLE_KEY` and `VISION_MODEL_API_KEY`. The worker is not
     deployed anywhere yet (ADR 0009) and must be before the pilot.
  4. Android device runs happen on Eli's PC (WSL2 + adb, see repo memory). Cloud
     sessions verify on Expo web plus the hermetic suites, then hand back for the device
     pass.

## 1. Design: locked, pixel-exact

- **Source of truth:** `docs/design/phase-4-feed/feed-lab.html`, plus
  `docs/design/phase-4-feed/reference/*.png` (390×844, locked variants). Open the lab in
  a browser. `?bare=1&screen=<name>` renders one screen. Screen names: `feed scrolled
  menu why compose exposure composeGroup notice post share own empty error`.
- Eli: *"exactly how I want the result to look like, pixel by pixel"*. Implement in RN
  until the Expo-web render at a 390 viewport is indistinguishable from the reference
  PNG. Measurements, radii, colours, font sizes and spacing are all in the lab's CSS;
  read them from there, don't eyeball.
- **Locked choices:**
  - Bottom tabs: Home / Search / Profile. Search and Profile open a "coming soon"
    placeholder screen.
  - Soft cards: radius 24, shadow only, no border.
  - An active like is indigo `#2E3A8C`.
  - Space-card header: solid group colour.
  - Family Space card: brand gradient (cyan → indigo) with a house icon.
  - The "+" in the statuses rail is a gradient fill.
  - Feed ground is flat `#F3F5FC`. Compose is a white sheet.
  - Filtered-media placeholder: soft indigo panel with an eye icon.
- **Copy:**
  - Filtered placeholder: label `מדיה מסוננת לפי ההעדפות שלך` (existing `PostCard`
    default; keep its hint).
  - Hebrew masculine generic everywhere, never gendered by the user's declared gender.
  - Personal followers-only posts get a neutral source label `לעוקבים`.
  - Copy lives in per-feature `copy.ts` modules, never as literals in component logic
    (ADR 0007).
- Icons beyond the current 26 glyphs (link, send, mute, flag, user-x, help, globe,
  clock, thumbs-down, trash, refresh, wifi-off, family, chevron-up, arrow-right) are
  Lucide paths already written into the lab's `G` table. Port them into
  `packages/ui/src/content/Icon.glyphs.ts`.
- **Not yet designed, so design these in the lab first and get Eli's OK before building
  them in RN:**
  - the "+" menu sheet: `פוסט`, plus `סטטוס` greyed out with `בקרוב`
  - the report sheet (categories from `ReportCategory`)
  - the share-to-group quote card
  - the group / Family Space list inside the exposure picker
  - the comment composer in reply mode (`@name` chip)
  - the own-post and own-comment menus
  - the "coming soon" tab placeholder
  - the loading skeleton
  - the collapsed-strip expand/collapse motion

  Follow the lab's existing conventions (same tokens, sheet anatomy, row style).

## 2. Product decisions (all confirmed by Eli)

| # | Decision |
|---|---|
| Ranking | **Deferred to its own session** ("per-user, super smart niche detection"). For now the order is **random**, seeded once per feed visit so pages are stable (keyset on `md5(seed‖id), id`); pull-to-refresh draws a new seed. Spaces rail and follow suggestions are random too. Keep it behind one seam (a single SQL function plus the api-client call) that the ranking session replaces. Write no weights and no `feed_config`. |
| Signals | Explicit only: like, comment, save, share-to-group. **No time-on-post, no open or visit logging.** Add time-on-post to the backlog. |
| Likes | **Number only, never a list** (invariant #5 wins over `03` §4.1). The counter is not tappable. Same for comment likes. Backlog §G stays open. |
| Statuses | No table, no creation, no viewer. The rail shows only "+" with an empty hint. The "+" menu has `פוסט` live and `סטטוס` disabled with `בקרוב`. |
| Polls | Out of Phase 4. |
| Tagging | Out of Phase 4 (flow undecided; legal item #11; depends on the undefined `hideWomenAccounts`). |
| Suggested posts | Public personal posts from authors you don't follow. Not from groups: public-group posts stay members-only in RLS until Phase 5. At most 1 in 5, gated on `showSuggestedPosts`. No candidates from the follow graph or group co-membership, because the "why" text would leak edges (invariant #5). |
| Suggestions off-switch | The §7.1 toggle ("show only content from people and groups I follow") lives in the "why am I seeing this?" sheet until Settings ships (Phase 6). |
| "Less like this" | While ordering is random, it stops suggesting that author (same effect as "don't suggest"), but is stored as its own kind so the ranking session can treat it properly. |
| Follow suggestions | Authors whose posts you liked or commented on but don't follow, plus active public posters. Respects the target's `discoverable_in_search` and the viewer's `genderSeparationInSearch`, via a new `visibility-policy` rule. Rail is sticky at the bottom near the end of the feed and can be dismissed. |
| Sharing | External: copy link, public posts only, no media, no preview, opening it requires sign-in (legal item #13). Internal: share-to-group only. Creates a quote post (`posts.quoted_post_id`); media is never duplicated, and each viewer's filter still applies to the original. The `03` §5.3 table becomes a `visibility-policy` rule. Status and message rows show greyed `בקרוב`. |
| Uploader notice timing | **Classify while composing:** attaching media creates an author-only **draft** post and inserts the `media_items` row, so classification runs while the user types. Publish never waits. If the result arrives before Publish → inline notice (Confirm / Back / Appeal). If not → the notice appears afterwards on the author's own post (Understood / Remove media / Appeal). Abandoned drafts get purged by a function (unscheduled, like the score sweep). |
| Family Space posts | **Never in the main feed** (`01` §2.3.1). They show only in the spaces-rail cards (latest-post preview; the carve-out applies there) and on the single-post screen. |
| Compose entry | The feed "+" is the only live entry in Phase 4 (profile context). The group and Family Space contexts get built, with exposure locked (`02` §4.3), and are testable by route param; they're wired from group pages in Phase 5. |
| Defaults | 20 top-level comments, then "load more" (replies of loaded comments come in full). No post length cap; long posts fold behind "read more" in the feed. Your own posts appear in your feed, and a just-published post is pinned to the top locally for that session. Group-card, source-label and author taps go to placeholder routes until Phase 5. |
| Deferred | Post edit, comment edit/delete (backlog §F/§G), saved-posts screen (Phase 5), group-card long-press, next/previous post. |

## 3. Data tier (one or two migrations, `20261019xxxxxx_*`)

Every table gets RLS in the same migration, indexes on its read-path columns, a PGlite
parity test in `packages/db-testing`, and its rule mirrored in `packages/visibility-policy`
with tests.

- `post_likes(post_id, user_id, created_at)`, PK on both. SELECT only your own rows.
  INSERT only if the post is visible to you (an EXISTS against `posts`, so RLS is
  inherited) and published. DELETE only your own.
- `comment_likes(comment_id, user_id, created_at)`, same rules.
- `post_saves(post_id, user_id, created_at)`, rows visible only to their owner.
- `user_mutes(muter_id, muted_id, created_at)`, rows visible only to their owner. A mute
  only removes that author from your feed; it is not a block.
- `suggestion_feedback(viewer_id, target_user_id, kind ∈ {less_like_this, dont_suggest},
  created_at)`, rows visible only to their owner.
- `posts.status ∈ {draft, published}` (default `published`) plus `published_at`. Drafts
  are visible only to their author (fold this into the posts SELECT predicate). Feed,
  comments and likes all require `published`. Add `purge_abandoned_drafts(interval)`.
- `posts.quoted_post_id` (`on delete set null`), plus an insert check through
  `visibility.can_share_internally`.
- `comments.reply_to_user_id`, plus a trigger: the parent must be on the same post, and
  a reply to a reply is re-parented onto the level-1 root with `reply_to_user_id` set
  (`03` §3.1, two levels, no third).
- **RLS gaps to fix:**
  - `posts_update_own` lets an author widen a post's audience or move it into a group
    they're not in. Lock the exposure/source columns once published, re-check
    membership, and allow no published→draft transition.
  - Add a source↔exposure consistency check (source group ⇒ exposure is that same
    group; same for Family Space).
- **Counts (number without list):**
  - One batched `post_stats(post_ids uuid[])` returning like count, comment count,
    viewer_liked and viewer_saved. It's SECURITY DEFINER, so it must filter ids through
    a SQL `visibility.post_visible(...)` predicate.
  - Rewrite `posts_select_exposure` to call that same predicate, so there's one source
    in SQL.
  - Comment counts exclude blocked authors, exactly as `comments_select_via_post` does.
- **New `visibility-policy` rules (each with tests and SQL parity):**
  - `canViewPost`: exposure, blocks, drafts.
  - `canViewComment`
  - `postFeedPlacement` → `followed | suggested | none` (Family Space → none; muted →
    none; suggested only if public, personal, not followed, not muted, not
    dont_suggest/less_like_this, and `showSuggestedPosts`).
  - `canSharePostInternally(post, targetGroup)`
  - `canCopyExternalLink`
  - `canSuggestUserToFollow`: composes `canDiscoverUserInSearch` plus the target's
    `discoverable_in_search`.
- Feed read path: one SECURITY INVOKER function (RLS decides visibility), with media
  resolved through `media_items_visible`. A filtered viewer gets
  `storage_path = null, is_filtered = true` and never a path.
- **Parity matrix for the feed:** filtered viewer, unfiltered viewer, author, blocked
  pair, group member vs non-member, Family Space member (excluded from the feed;
  carve-out in the rail card and single post), drafts, muted author, suggestions on/off.

## 4. Order of work

1. Data tier + policy rules + parity tests (above). Then run `/visibility-audit` on
   every read path.
2. ADRs via `/new-adr`:
   - random feed ordering and the ranking seam (pagination by seeded keyset)
   - explicit-only interaction signals
   - classify-while-composing drafts
   - likes are number-only

   Update `visibility-model.md` §4 if a surface changes, and `data-model.md`.
3. api-client:
   - feed page, spaces rail, follow suggestions
   - comments (two-level, paginated)
   - like / save / share / mute / suggestion feedback
   - compose: draft → attach → poll classification via `resolveUploaderMediaViews` →
     publish
   - copy link (`expo-clipboard`) and media picker (`expo-image-picker`). Both are in
     Expo Go SDK 54; re-run `expo-doctor` after adding them.
4. UI kit:
   - restyle `PostCard`, `SourceLabel`, `InteractionBar`, `Avatar` to the lab
   - new pieces: statuses rail, space card, collapsed strip, follow rail, bottom tabs,
     bottom sheet + row, exposure chip, state strip, comment bubble, comment box, empty
     state
   - pure-function style tests in the existing shape
   - extend `/gallery` with RTL and motion on/off
5. Screens via `/new-screen`:
   - feed: 4 zones, collapse-on-scroll (`01` §6), sticky dismissible follow rail,
     reduced-motion respected
   - compose: run `/wire-moderation` and report its 5 checkpoints
   - single post: comment media also goes through `/wire-moderation`
6. Verify:
   - `pnpm typecheck && pnpm lint && pnpm test` from the root, output quoted
   - pixel comparison against `docs/design/phase-4-feed/reference/*.png` on Expo web at
     390 wide. In the cloud use Playwright/Chromium mobile emulation; on Eli's PC, Edge
     headless with `--force-prefers-reduced-motion`.
   - then hand back for the Android device run

## 5. Legal 🔴 on these surfaces (doesn't block development; flag before production)

#7 LLM scanning (now also of draft media), #10 location tag, #12 comment media, #13 the
external link, #16 public counts. See `docs/legal/legal-tracker.md`.
