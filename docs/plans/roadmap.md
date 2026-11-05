# Safe-Place — roadmap to a complete live app

Written 2026-11-05 from a full read of `docs/product`, the backlog, the legal tracker,
the architecture docs, the migrations and the app tree (branch `phase-4-feed` @ `9f741e4`).
Every phase session starts by reading this file, then its own `docs/plans/<phase>.md`.

## How we work (Eli, 2026-11-05)

- **One phase at a time, with full attention.** No parallel phases. The foundations are
  solid because each phase had one owner, a settled plan and a locked design.
- **Fresh Claude session per phase.** State lives in the repo (this file, the phase plan
  and its progress log, ADRs, backlog), never in chat history.
- **Each phase starts with a deep plan and a full design lab**, before any code:
  - Brainstorm the decisions with Eli, one question at a time; ask on every real fork.
  - Write `docs/plans/<phase>.md` (decisions, data tier, policy rules, API, screens,
    order of work, legal items touched, open questions).
  - Build a design lab in `docs/design/<phase>/` in the same conventions as
    `docs/design/phase-4-feed/feed-lab.html` (single HTML file, every screen and state,
    `?bare=1&screen=<name>` renders one screen at 390 wide, real Hebrew copy, tokens
    from `packages/design-tokens`). Eli reviews, tweaks and **locks** it; reference PNGs
    are exported from the locked lab.
  - Implementation starts only after the plan and the lab are approved, and must match
    the lab pixel by pixel (`scripts/pixel-compare`).
- Implementation sessions work from the plan, append a dated progress log, and end with
  `pnpm typecheck && pnpm lint && pnpm test` green and a summary for Eli.

## Where we stand

**Built and verified (Phases 0–4 + classifier cascade):** design tokens and `packages/ui`;
data tier with RLS and PGlite parity (340 DB tests); `visibility-policy` (113 tests);
onboarding; feed (random seeded order behind one seam), compose (drafts,
multi-audience, place name, one image), single post (two-level comments, likes as a
number, share to group, copy link, report, mute); four-group classifier (Haiku 5.5,
SHA-256 dedupe, levels, uploader notice, classification appeal); draft purge and orphan
sweep. Hosted Supabase at 21 migrations.

**Database only (no API, no screens):** groups, Family Spaces, messages
(`conversations`, `messages`, `message_requests`), blocks, polls, tagging,
`moderation_actions`, `reports` → `review_queue`.

**Not started:** profile / personal area (05), settings (06), search (08), messages UI
(09), notifications and inbox, statuses (needs its own spec), desktop web, the staff
moderation console (07).

**Pilot blockers today:**
1. No screen lets a user change the content filter (invariant #3).
2. Nobody can work the review queue: reports, AI-uncertain, refusal and level-3 items
   land in `moderation.review_queue`, reachable only with SQL and the service role.
   `account_status = 'suspended'` is not enforced anywhere.
3. The classification worker is not deployed or scheduled (ADR 0009); uploads stay
   unclassified until someone runs it by hand.

**Production plumbing missing:** separate prod Supabase project (today dev = prod), app
builds (no `eas.json`, icons), error monitoring, web host and base URL for copy-link,
custom SMTP and the email-confirm deep link (backlog §D), encrypted session store
(ADR 0008), backups, a migration step in CI.

**Legal:** all 28 tracker items are 🔴. Built surfaces already gated: #7, #26–28
(classifier), #10 (location), #12 (comment media), #13 (external link), #16 (counts).
#1–5 and #9 gate any launch. See `docs/legal/legal-tracker.md`.

**Housekeeping:** `main` lacks Phase 4 and the classifier; merge `phase-4-feed` → `main`
(Eli's call) before the next phase branches.

## Phase order

| # | Phase | Why here |
|---|---|---|
| 8 | **Admin and human-review portal** (spec 07) | Every report must reach a human (07 §3.1); the pipeline already routes items there; every later phase feeds this queue. Also closes pilot blocker 2. |
| 6a | **Settings slice + production plumbing** | Filter toggle with double confirm, sign out, block; deploy and schedule the worker; prod environment, builds, monitoring. Closes blockers 1 and 3. May swap with phase 8 (small, and fixes invariant #3). |
| — | *Decision point:* small closed pilot, or continue straight on | Decide after 6a. |
| 5 | Profile, groups, Family Spaces (04, 05) | Invites, mutual consent, space admin control, avatar upload (through the pipeline). |
| 6 | Full settings (06) | Gender change, account deletion (legal #19, #20), remaining controls. |
| 7 | Search, messages, notifications and inbox (08, 09) | The inbox also delivers moderation decisions (07 §5.3). |
| — | Then | Statuses, polls, tagging, real ranking session, desktop web, legal clearance, public launch. |

## Phase 8 starting facts (admin and human-review portal)

What spec 07 requires: human review of AI medium-confidence items and of every report
(§2.1, §3.1); report-abuse monitoring (§3.5); hired staff only (§4.1); a review view
with content, context, uploader, reason, reporter note and uploader history (§4.2);
SLAs 1h / 24h / 72h, placeholders (§4.3); the graduated ladder warning → 24h → 7d →
permanent with repeat windows and decay (§5.1); direct penalties incl. minors-risk ban
and report to authorities (§5.2); a decision notice with appeal link (§5.3); appeals
decided by a different moderator, permanent-ban appeals by a senior (§6.3–6.4);
blocking (§7); message reports and harassment detection (09 §6.3–6.4). Open in 07 §8:
moderator tooling, log retention, notifying the reporter.

What exists: `moderation.review_queue` (reasons `ai_medium_confidence`,
`classification_failed`, `user_report`, `ai_classification_appeal`,
`ai_prohibited_content`, `ai_refusal`; status, `assigned_to`, `resolution`),
`classification_appeals`, `classification_jobs`, `classification_scores` (90-day,
levels, no free text per ADR 0011), `pipeline_config`, `redactions`, `public.reports`
with the enqueue trigger, `public.moderation_actions` (penalty enum, appeal status,
different-moderator check), `account_status` enum. `apps/moderation-console` is a
placeholder.

What is missing: staff identity, roles and senior moderators; staff access rules (all of
`moderation.*` is service-role only); functions to resolve an item, re-level media and
apply a penalty; suspension enforcement in RLS and write guards; ladder and decay
logic; audit log; SLA timers; uploader history; report-abuse scoring; authorities
reporting process; decision delivery (needs an inbox); override propagation to deduped
copies (backlog §K). Legal items #21 (staff structure) and #27 (level-3 removal).

Constraint to design around: Eli never views or labels images (religious reasons);
the console's image handling, who may see what, and how reviewers are staffed must
respect that.
