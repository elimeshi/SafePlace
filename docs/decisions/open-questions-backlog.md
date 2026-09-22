# Open Questions Backlog

This file compiles every point the product specs in `docs/product/` marked
"⏳ לתכנון בהמשך" (to be planned later) — **97 items** across all 11
documents (plus a few surfaced during implementation, marked inline with the
phase that raised them). These are deliberate, explicit deferrals made during
the characterization phase, not gaps that were missed. Treat an item here as
"already flagged, not yet decided" rather than as an invitation to invent an
answer silently while implementing.

When an item gets resolved, either:
- write an ADR in `docs/decisions/` and link it here, or
- update the relevant `docs/product/*.md` file directly if it's a small
  product clarification (note the change at the top of that file), and
  strike it from this list.

Each item links back to its exact source section for full context — this
file gives the short version.

## A. Out of scope until after the MVP is built

Per the master spec's own framing (`00-master-spec.md`, intro and §8.2),
these are explicitly **not** part of the product characterization and
should not block or distract from implementation:

- Revenue model — ads vs. subscription vs. other (`00-master-spec.md` §7.3)
- How ads would be integrated without harming experience/values, if chosen (§7.3)
- Operating costs — servers, LLM, moderation staffing (§7.3)
- Growth model (§7.3)
- LLM vendor selection for content classification (§7.4) — **resolved**: ADR
  0002 for hosting, ADR 0004 (amended in Phase 3) for the vision model and the
  swappable provider seam
- Media storage architecture details (§7.4) — partially addressed by ADR
  0002 (Supabase Storage), but CDN/scaling specifics remain open
- Broader security/privacy compliance program beyond what's specified
  per-feature (§7.4, §7.6)
- Scalability strategy (§7.4)
- Launch strategy — closed/open/phased rollout (§7.5)
- Initial target audiences within the Haredi community (§7.5)
- Branding and public communications strategy (§7.5)
- Partnerships with community figures/organizations (§7.5)
- Full privacy policy document (§7.6) — note: many *specific* privacy
  decisions are already made per-feature; see `docs/legal/legal-tracker.md`
- Breach/leak incident response policy (§7.6)
- Minor-safety protection mechanisms beyond standard moderation (§7.6)
- Anti-harassment mechanisms beyond what's specified (§7.6)

## B. Resolved by an ADR

- Tech stack — server, client, database (`00-master-spec.md` §7.4) → see
  `docs/decisions/0001-client-platform.md` and `0002-backend-platform.md`

## C. Design-pending (blocked on the Claude Design session)

See ADR 0003. All of these are placeholder-until-locked:

- Final color palette, fonts, general visual tone (`00-master-spec.md` §5.1.1, §6.3.5)
- Source-label exact visual design (`01-feed-spec.md` §4.2)
- Desktop layout in full, including side columns (`01-feed-spec.md` §5.2)
- Group color palette (12–16 colors) and icon gallery, built and cataloged (`01-feed-spec.md` §8)

## D. Onboarding & account

- Whether to offer "prefer not to say" for gender, pending legal input — if
  required, step 3 would show manual preference selection instead of
  assigned defaults (`00-master-spec.md` §6.2.2)
- Final legal sign-off on default-display wording and policy (§3.6.2)
- Session-store hardening before production: evaluate an encrypted-at-rest
  store (`expo-secure-store`, with JWT chunking) vs. the current AsyncStorage
  default, and decide whether to drop the legacy `NEXT_PUBLIC_*` env keys now
  that the client reads `EXPO_PUBLIC_*` (see ADR 0008)
- Auto-return from the email-confirmation link via a `safeplace://` deep link,
  so the user lands back in the app signed-in instead of manually returning to
  sign in (Phase 2 ships the manual path; `00-master-spec.md` §6.2)

## E. Feed

- Status-creation "+" button: status-only vs. a menu offering both
  status and full post (recommendation: single tap offers both) (`01-feed-spec.md` §2.1.1)
- Exact algorithm weights — interaction/activity/recency — to be tuned via
  MVP field testing; starting point 40/30/30 (§2.1.3, §2.3.2, §3.3)
- Long-press or direct-post-tap behavior on a group preview card (§2.2.2)
- Ads — deferred; when introduced, subject to the same classification and
  labeling rules as organic content (§2.3.1)
- Bottom follow-suggestion rail: persistent sticky vs. dismissible (§2.4.3, §6.4)
- Full transparency/"why am I seeing this" mechanism detail (§3.4)

## F. Post creation

- Full status/story creation screen (media-first, ephemeral UX) — separate
  spec needed (`02-post-creation-spec.md` §1.3)
- Whether to add a quick-create entry point on the main feed itself for
  personal posts (currently: no, deferred pending user feedback) (§2.1)
- Maximum post length and feed-view truncation behavior (§3.2)
- Poll mechanics — max options, duration, result visibility before voting (§3.4)
- Full tagging flow — pre-approval, notification, decline handling (§3.6)

## G. Single post / comments

- Initial comment count shown + "load more" pagination threshold (proposed: 20) (`03-single-post-spec.md` §3.2)
- Whether like-lists are always public or user-configurable (currently: public, to be revisited) (§4.1)
- Comment edit/delete UX and "edited" labeling (§7)
- Internal share quote-card exact visual treatment (§5.5)
- Optional next/previous post navigation within the single-post screen (§6.3)

## H. Groups

- Post ordering within a group page: chronological vs. algorithmic
  (proposed: chronological) (`04-group-page-spec.md` §2.3)
- Default posting policy by group type, to be set alongside the group
  creation flow (§5.1)
- Extended admin powers — sub-admins, ownership transfer, admin departure (§5.2)
- Full group creation flow, screen by screen (§5.3)

## I. Personal area / public profile

- Long-press on the profile icon as a shortcut to the public profile (§1.3)
- Which fields are available on the extended "About" page (§2.4)
- Saved-posts filtering/tagging, Instagram-collections-style (§3.1.4)
- Full family space creation and management flow (§5.4)

## J. Settings

- Synchronization between the default post-exposure setting here and the
  same control surfaced in the post-composer (`06-settings-spec.md` §3.2)
- Supported language list beyond Hebrew-only MVP (§3.5)
- **`hideWomenAccounts` filter flag — semantics undefined.** The flag exists in
  `FilterSettings` (data-model + shared-types) but no rule in
  `packages/visibility-policy` consumes it (only `hideContentWithWomen`,
  `filterAppliesToAvatars`, and the two `genderSeparation*` flags are). Per
  invariant #2 ("if the policy package doesn't expose the check you need, add it
  there first"), Phase 1 deliberately does **not** invent an RLS meaning for it
  — hiding whole accounts by a gender attribute also brushes against invariant
  #1 (classify content, not users), so its exact, legally-defensible semantics
  need product + legal definition before any enforcement is written. Until then
  the column is stored but unenforced. Raised during Phase 1 (data layer).

## K. Moderation

- Exact AI confidence thresholds — placeholder direction is conservative
  toward over-flagging rather than under-flagging (`07-moderation-spec.md` §2.1).
  **Still open, but no longer blocked on a deploy:** the values live in
  `moderation.pipeline_config` and are retunable while the service runs, and
  the data needed to set them is being retained (ADR 0011).
- Video frame-sampling strategy — how many frames, chosen how, and how their
  verdicts combine. MVP classifies images only and routes video to human
  review (ADR 0010, raised Phase 3)
- Scheduling the retention sweep for `moderation.classification_scores`; the
  function exists, the schedule does not (ADR 0011, raised Phase 3)
- Whether an illustration, statue or mannequin depicting a woman counts as a
  depiction, and where childhood ends for classification purposes. The
  classifier prompt answers both conservatively today; both are community
  questions rather than engineering ones (raised Phase 3, see
  `services/moderation-pipeline/src/classifier-prompt.ts`)
- Whether to notify a reporter of the outcome of their report (currently: no) (§3.4)
- Moderation SLA targets — proposed: 1h for danger/minor-safety content,
  24h standard, 72h appeals (§4.3)
- Exact repeat-violation windows and penalty decay rules (§5.1)

## L. Search

- Final ranking weights — proposed: word-match 40%, popularity 30%,
  closeness 20%, recency 10% (`08-search-spec.md` §4.1)
- Anti-manipulation/anti-spam detection system (§4.3)
- Search history storage: local-only (current direction) vs. server (§5.2)
- Final recommended-categories list (§5.3)
- In-space search within a group or family space (§6.3)

## M. Messages

- Auto-expiry for unanswered message requests (currently: none for MVP) (`09-messages-spec.md` §3.5)
- Read-receipt default behavior — shown by default, toggleable (§4.2)
- Auto-deleting conversations (WhatsApp-style disappearing messages) (§5.2.4)
- Voice messages — in or out of MVP (§7)
- Group conversations (more than 2 participants) (§7)
- End-to-end encryption (§7)
- Conversation export/backup (§7)
