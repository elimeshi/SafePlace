# Phase 8 — Admin and human-review portal: plan and implementation handoff

Written 2026-11-14 in the Phase 8 planning session. Every decision below was made with
Eli, one fork at a time (§2 lists them). Do not re-litigate them. Anything not covered
here is an open question (§10): ask Eli, don't guess (CLAUDE.md §3).

Branch: `phase-8-admin`, from `origin/main` @ `d513d50` (Phase 4 and the classifier
cascade are merged into main).

Status: **plan approved in sections; design lab built, waiting for Eli's review and
lock.** Reference PNGs are exported from the locked lab. Implementation starts only
after that.

## 0. What this phase delivers

- **One internal web app with two areas:**
  - a **review area** where a hired team classifies images;
  - an **admin area** where admins judge people (cases, penalties, appeals), watch
    operations, tune the pipeline and manage staff.
- **Database enforcement of penalties:** suspension and ban.
- **Three small phone surfaces**, so a restricted user knows why and can appeal.

It closes pilot blocker 2 (roadmap): today nobody can work `moderation.review_queue`
without SQL, and `account_status` is enforced nowhere.

Built in two milestones (§7):
- **8a** — data tier, enforcement, phone surfaces, review area, admin cases, penalties,
  appeals, user page, audit log, staff bootstrap script.
- **8b** — dashboards, reviewer stats, classifier health, abuse patterns, settings UI,
  staff-management UI.

## 1. Design: lab, then lock

- **Lab:** `docs/design/phase-8-admin/admin-lab.html`, in the conventions of
  `docs/design/phase-4-feed/feed-lab.html`:
  - single HTML file with the lab panel on the left;
  - `?bare=1&screen=<name>` renders one screen;
  - real Hebrew copy;
  - tokens from `packages/design-tokens`.
- **Frames:** desktop screens at **1440×900**, phone screens at **390×844**.
- **Images:** anything image-related is a placeholder (striped or blurred block). The
  lab contains no real image.
- **Screen names:** listed in §6 and in the lab panel.
- **After Eli locks it:**
  - reference PNGs go to `docs/design/phase-8-admin/reference/*.png`;
  - implementation must match them pixel by pixel (`scripts/pixel-compare`, at
    1440×900 for console screens and 390×844 for phone screens).
- **Copy status:**
  - Hebrew copy for staff screens is engineering-drafted. Eli edits it in the lab.
  - Copy users see (the three phone screens, rule names shown to users) is Eli's
    product copy; the lab carries drafts marked as such.

## 2. Product decisions (Eli, 2026-11-05 … 2026-11-14)

| # | Fork | Decision |
|---|---|---|
| 1 | Who works where | Two scopes. A **review area** for a hired image team. An **admin area** with dashboards and everything system-admin. Reviewers never reach the admin area. An admin may enter the review area after a warning ("this leads to possibly improper media") and an explicit confirm. |
| 2 | Work split | **The team classifies media; admins judge people.** Reviewers only answer media questions: set the four group levels, or mark the image prohibited. They never penalize, never see user history. Everything about people lives in the admin area. A level-3 verdict removes the media and opens a conduct case; the admin decides the penalty from the verdict without seeing the image. |
| 3 | Sites | **One web app, two areas** (`/review`, `/admin`), one login, role-gated. |
| 4 | Devices | **Desktop-first** for both areas, 1440×900, usable down to 1280. |
| 5 | Staff identity | **Dedicated staff accounts with 2FA.** Not app accounts: no profile, invisible in the app. Created by invite only. The first senior admin (Eli) is bootstrapped by script. TOTP 2FA required, and the database rejects staff calls without it. Instant deactivation. |
| 6 | Roles | `reviewer` / `admin` / `senior_admin` (§3.2). Eli is the first senior admin. |
| 7 | Two pairs of eyes | **Applies to reviewers only.** An uploader's appeal of a reviewer's decision goes to a different reviewer. Admin decisions may be appealed to any admin, including the original decider. A permanent-ban appeal needs a senior admin. (Clarifies `07` §6.3, see §9.) |
| 8 | Image display | **Blurred until revealed, graded.** Every image loads blurred and grayscale; reveal and colour are separate toggles. AI-prohibited and refusal items carry a "possibly graphic" strip. Short-lived signed URL, no download, no caching. |
| 9 | AI answer | A **senior-admin setting** with three modes: `blind` / `blind_then_feedback` / `shown`. Default `blind_then_feedback`. Needed for HR and for tuning. |
| 10 | Reviewer context | **Text yes, identity no.** The reviewer sees the post or comment text, where it was posted, the task reason, and the report category and note. Uploader and reporter appear as "User A/B". No avatar, no history. |
| 11 | Prohibited verdict | **One reviewer is enough.** The uploader's appeal is the second pair of eyes. |
| 12 | Can't decide | No "unsure" answer. The on-screen rubric says: when torn, **choose the stricter level**. **Skip** takes a reason; after 2 skips the task is marked *stuck* and counted on the admin dashboard. |
| 13 | Task distribution | **Browsable list plus claim.** Claiming locks the task for 10 minutes. No thumbnails in the list. |
| 14 | Missed women | Re-levelling a missed image (e.g. sex 0 → 1) **is not an offense**. The image is re-filtered; no strike. Only deliberate evasion can become a conduct case, and an admin decides it. (Clarifies `07` §5.1, see §9.) |
| 15 | Ladder | **Expiring strikes.** One upheld minor offense is one strike, active 90 days. Active strikes map to a penalty: 1 warning, 2 suspension 24h, 3 suspension 7d, 4 permanent ban. The system proposes the step. The admin may go lower with a written reason. A ladder-reached permanent ban needs an explicit typed confirm. |
| 16 | Enforcement | **Suspended** (24h/7d): can browse, like, save, follow, report and appeal. Cannot post, comment, message, send a message request, or change avatar or bio. Existing content stays visible. **Banned:** can sign in only to a "blocked" screen with the details and an appeal form. Profile, posts and comments are hidden from everyone while banned and restored if an appeal overturns the ban. |
| 17 | Delivery | **Notices wait for the Phase 7 inbox.** Exception (17b): the user is told **only where they are blocked**. That means a suspension banner, a sheet when they try to post (with an appeal form), and a banned screen (with an appeal form). Warnings and content removals reach users silently until the inbox ships. Reporters are never told the outcome (`07` §3.4 starting point). |
| 18 | Dashboards | **Moderation operations plus basic counts:** queues, SLA, stuck tasks, appeals, reviewer throughput, classifier health and cost, worker lag; users, signups, posts and reports per day. All computed from data already stored. **No behavioural analytics or new instrumentation** (CLAUDE.md §8). |
| 19 | Dedupe override | **A reviewer decision propagates to every SHA-256-identical copy** and closes their open tasks. A prohibited verdict removes all copies. A conduct case opens only for the uploader in the decided task. Closes backlog §K. |
| 20 | SLA lanes | Four lanes; times are settings. `urgent` 1h, `images` 4h, `standard` 24h, `appeals` 72h (§3.6). At risk at 75% of the window. |
| 21 | Abuse patterns | **Flags to admins, never automatic.** A nightly job computes signals; crossing a threshold opens a *pattern* case that shows numbers. An admin dismisses it, warns, or opens a conduct case; false reporting is a ladder offense (`07` §3.5). Message-request signals are wired now and go live with Phase 7. |
| 22 | Removed media and authorities | Removed media is hidden from everyone, the uploader included. **Bytes are kept 90 days, then deleted.** A legal hold freezes deletion until a senior admin releases it; "minors risk" sets the hold automatically. **Reporting to authorities is offline:** the admin records agency, date and reference number, and a senior admin is notified. The console never sends anything outside. |
| 23 | Audit log | **Everything, append-only.** Senior admins read all of it, admins read conduct entries, and reviewers see only their own history. Retention is 2 years as a placeholder (legal). |
| 24 | Settings | Senior admins edit pipeline thresholds and models, the AI-answer mode, ladder, SLA, abuse thresholds and hold days. Every change asks for a reason and is audit-logged. **Region blur is shown locked** ("off, waiting for a product decision"); no toggle. |
| 25 | Message reports | The admin sees an **in-console chat-style transcript**: the reported message plus the 5 before it. "Show 10 earlier" asks for a reason and is audit-logged. Text only; media shows as a chip ("media, reviewed separately"). The other party is anonymized. A deep link into the app was considered and rejected: staff are not app users, app RLS lets only participants read a thread, and the app shows media unblurred. |
| 26 | Reviewer quality | **Passive stats only**, no QA sampling: tasks per hour, skips, agreement with the AI (meaningful when the mode is blind), and the share of their decisions changed on appeal. |
| 27 | Scope | Plan and lab cover both areas now. Built in two milestones, 8a and 8b (§7). |

Engineering choices made while writing this plan, inside the approved design. Eli can
veto any of them at lab review:
- Staff RPCs live in an exposed `console` schema (§10 q8 has the alternative).
- Suspension and claim expiry are derived from timestamps, so no cron is needed.
- Write guards are restrictive RLS policies, so no existing policy is rewritten.
- Report routing follows §3.5.
- `moderation_actions` is reused as the decision, strike and appeal record.

## 3. Model

### 3.1 Two kinds of work

| | Media task (review area) | Conduct case (admin area) |
|---|---|---|
| Table | `moderation.review_queue` (existing; "task") | `moderation.conduct_cases` (new) |
| Question | "What levels does this image have?" | "Did this person break a rule, and what follows?" |
| Sources | AI medium band, refusal, prohibited, failed classification, classification appeal, `contains_women` report, `dangerous_content` report on content with media, an admin's "send media for review" | Reports (text, user, message; `dangerous_content` also), a prohibited verdict, an abuse pattern, a penalty appeal |
| Decided by | reviewer (an admin may act as one after the entry warning) | admin; a permanent-ban appeal needs a senior admin |
| Sees media | yes (blurred until revealed) | **never**: labels and chips only |
| Sees people | no (User A/B) | yes (subject, history; the reporter's identity behind a logged click) |

### 3.2 Roles

| Capability | reviewer | admin | senior_admin |
|---|---|---|---|
| Review area: list, claim, decide, skip, own history | ✓ | ✓ (after the entry warning, per session) | ✓ (same) |
| Admin area: cases, penalties, appeals, user page, legal hold, authorities record | — | ✓ | ✓ |
| Decide a permanent-ban appeal; release a legal hold | — | — | ✓ |
| Dashboards (8b) | — | ✓ | ✓ |
| Audit log | own history only | conduct entries | everything |
| Settings, staff management (8b) | — | read | edit |

### 3.3 Media task lifecycle

```
pending ──claim──► in_review (claimed_by, claimed_until = now()+10m)
   ▲                 │  │  │
   │   lock expires  │  │  └─ skip(reason) ─► pending, skip_count+1; on 2 ─► stuck = true (still claimable)
   └─────────────────┘  │
                        └─ decide ─► resolved
                              ├─ levels (0..2 ×4) ─► media general/contains_women + levels
                              │                     ─► same to every SHA-256 copy; close their open tasks
                              └─ prohibited(group) ─► media `removed` (+ all copies)
                                                    ─► conduct case `prohibited_media` for this uploader
```

- **Claims are derived, not swept.** A task is claimable when `claimed_until is null or
  claimed_until < now()`.
- **A reviewer's skips hide the task from that reviewer.**
- **Classification appeal of a reviewer decision:** the RPC refuses claim and decide by
  any reviewer who decided that media before (`media_decisions`).
- **AI decisions:** any reviewer may decide.

### 3.4 Conduct case lifecycle and the ladder

- **Kinds:** `report`, `prohibited_media`, `abuse_pattern`, `penalty_appeal`.
- **Statuses:** `pending → in_review (taken, 30-min lock) → resolved`.
- **Decisions** (each writes `public.moderation_actions` rows and the audit log):
  - **Dismiss.** For a report case, optionally mark it *false report*, which opens a
    `report` case against the reporter with rule `false_reporting`. It is not an
    automatic strike.
  - **Remove content** (text: post, comment or message gets `removed_at`). Can combine
    with a penalty.
  - **Ladder offense:**
    - `proposed = ladder[active_strikes + 1]`, where `active_strikes` counts actions
      with `strike_expires_at > now()` and an appeal status other than `overturned`.
    - The admin may pick a lower step with a reason.
    - Reaching `permanent_ban` requires typing the user's display name to confirm.
    - The decision records one strike (`strike_expires_at = now() + strike_days`).
  - **Direct penalty** (`07` §5.2): pick a rule with a direct track.
    - `minors_risk`: permanent ban, legal hold on the content, and an authorities record
      is required. Senior admins are notified on their dashboard.
    - `physical_threat`: permanent ban.
    - `severe_harassment`: 7-day suspension or ban, admin's choice.
    - `dangerous_misinformation`: content removal plus a warning or a suspension.
    - Direct penalties record no strike unless the admin ticks "also counts as a strike".
  - **Send media for review:** creates a media task in lane `images` (or `urgent`) for
    the case's media; the case stays open showing "waiting for review".
- **Penalty appeal** (from the phone screens): opens a `penalty_appeal` case in lane
  `appeals`.
  - Any admin may decide it, except a permanent ban, which needs a senior admin.
  - **Uphold:** nothing changes.
  - **Reduce:** pick a lower penalty. The original action becomes `overturned` and a new
    action is recorded.
  - **Overturn:** the strike is void, removed content is restored, and suspension or ban
    is lifted.

**Rule catalogue** (`moderation.rules`, seeded; the Hebrew names are Eli's copy):

| key | track | default |
|---|---|---|
| `prohibited_media_sex` / `_violence` / `_religion` | ladder | strike |
| `harassment` | ladder | strike |
| `spam` | ladder | strike |
| `misinformation` | ladder | strike |
| `false_reporting` | ladder | strike |
| `classifier_evasion` | ladder | strike |
| `other_inappropriate` | ladder | strike |
| `severe_harassment` | direct | 7-day suspension or ban |
| `physical_threat` | direct | ban |
| `minors_risk` | direct | ban + hold + authorities |
| `dangerous_misinformation` | direct | removal + warning/suspension |

### 3.5 Report routing (replaces `moderation.enqueue_report_for_review`)

| Report category | Target has media? | Creates |
|---|---|---|
| `contains_women` | yes | one media task per resolved media item, lane `images`; **no conduct case** (fork 14) |
| `contains_women` | no | conduct case, lane `standard` (the admin sees there is no media and dismisses or acts) |
| `dangerous_content` | yes | media tasks in lane `urgent` **and** a conduct case in lane `urgent`; the case shows the media verdict when it lands |
| `dangerous_content` | no | conduct case, lane `urgent` |
| `harassment`, `spam`, `misinformation`, `other` | any | conduct case, lane `standard`; media shows as chips with a "send for review" action |
| any, target `user` | — | conduct case, lane `standard` (the avatar is a chip with "send for review") |

- **One report, one case.** Ten reports on one post are ten cases, as today; collapsing
  them would turn report volume into a signal (`07` §3.1).
- **The case view lists "other open reports on the same content"** and lets the admin
  resolve them together. This is a human choice, never automatic. (Confirm with Eli,
  §10.)
- **Message-request reports** (`09` §3.5) arrive as `message` targets once Phase 7 wires
  them.

### 3.6 SLA lanes

| Lane | Default | Contents |
|---|---|---|
| `urgent` | 1h | AI `ai_prohibited_content` / `ai_refusal` tasks; every `dangerous_content` report |
| `images` | 4h | AI `ai_medium_confidence`, `classification_failed`, `ai_classification_appeal`, `contains_women` reports, "send for review" |
| `standard` | 24h | other report cases, `prohibited_media` and `abuse_pattern` cases |
| `appeals` | 72h | `penalty_appeal` cases |

- `sla_due_at` is set at creation from `moderation_config` and is not recomputed when
  the config changes.
- At risk at 75% of the window; breached at 100%.
- Lists sort by `sla_due_at`.

## 4. Data tier

All new migrations are dated `20261114xxxxxx_*` or later. Every function follows the
Phase 4 rule: revoked from `public, anon`; granted to `authenticated` and `service_role`
only where needed. Every rule gets a PGlite parity test in `packages/db-testing`.

### 4.1 Staff (migration `staff_identity`)

- **Schema `staff`:** no client grants, RLS on.
- **`staff.members`:**
  - `user_id` (PK, references `auth.users`), `display_name`;
  - `role staff_role ('reviewer','admin','senior_admin')`;
  - `active bool`, `invited_by`, `created_at`, `deactivated_at`.
- **`staff.review_entries(user_id, session_id, acknowledged_at)`:** an admin's
  per-session acknowledgement of the media warning. `session_id` is the JWT
  `session_id` claim.
- **`handle_new_user`:** returns early when `new.raw_app_meta_data ->> 'staff' = 'true'`,
  so staff get no profile and no filter settings.
- **Guard functions** (SECURITY DEFINER, `search_path = ''`):
  - `staff.current_role()`: returns the role only when the caller is an active member
    AND `auth.jwt() ->> 'aal' = 'aal2'`; null otherwise.
  - `staff.require(min_role)`: raises otherwise.
  - `visibility.is_staff()`: app-facing RPCs treat a staff caller as no user.
- **`moderation_actions.decided_by_moderator_id` and
  `appeal_decided_by_moderator_id`:** the FKs move from `profiles` to `auth.users`.
  Drop the constraint `appeal_different_moderator` (fork 7). Reviewer two-eyes moves to
  §4.3.

### 4.2 The console API surface

**`console` schema.**
- Functions only. The schema is added to PostgREST's exposed schemas: `config.toml`
  `api.schemas`, and on hosted the API settings, which is Eli's dashboard step.
- Usage is granted to `authenticated`.
- Every function starts with `staff.require(...)`, writes `moderation.audit_log`, and
  returns purpose-shaped rows.
- No staff role gets table grants anywhere.

**Review** (reviewer and up; an admin also needs a `review_entries` row for the current
session):
- `console.review_list(lane?, include_stuck?)`: id, lane, reason, age, `sla_due_at`,
  context kind, media count, is_appeal, stuck. **No text, no media.**
- `console.review_claim(task_id)` and `console.review_release(task_id)`.
- `console.review_get(task_id)`:
  - requires the caller's active claim;
  - returns the anonymized task (`reviewerTaskView`, §4.5);
  - returns `ai_levels` only when the AI-answer mode is `shown`.
- `console.review_media_path(task_id, media_item_id)`:
  - returns `storage_path` under an active claim;
  - audit-logs a `media_open` row.
  - A new `storage.objects` SELECT policy lets a staff caller sign a path only when
    `visibility.can_sign_review_media(path)` holds (active claim on a task holding that
    path; admin also acknowledged).
  - Signed URL TTL is 60 s, set by the client and enforced again by the policy.
- `console.review_log_reveal(task_id, media_item_id, kind)`:
  - `kind` is `reveal` or `colour`;
  - best-effort UI telemetry for the audit log;
  - the blur is a wellbeing measure, not an access control.
- `console.review_decide(task_id, decision jsonb)`:
  - `decision` is `{levels:{sex,violence,religion,addictions}}` or
    `{prohibited:group}`;
  - see §3.3;
  - returns `ai_levels` when the mode is `blind_then_feedback`.
- `console.review_skip(task_id, reason)`: `reason` is one of `need_other_opinion`,
  `personal_conflict`, `cannot_view`.
- `console.review_my_history(limit, before)`.
- `console.review_enter()` (admin): writes `review_entries` and audit.

**Admin** (admin and up):
- `console.cases_list(filter)`: kind, lane, status, SLA, subject handle, summary.
- `console.case_take(id)` and `console.case_release(id)`.
- `console.case_get(id)`:
  - `adminCaseView`: text, media **chips** (`id, group levels or 'pending'`; never a
    path), report data, the reporter's reliability numbers;
  - other open reports on the same target;
  - the subject's history summary.
- `console.case_message_context(case_id, before_count)`:
  - 5 by default; each extra 10 needs a reason and an audit row.
- `console.case_reveal_reporter(case_id, reason)`.
- `console.case_decide(id, decision jsonb)`: dismiss, false_report, remove_content,
  ladder, direct, send_media; see §3.4.
- `console.appeal_decide(case_id, outcome, reduced_to?, note)`.
- `console.legal_hold_set(target, reason)`.
- `console.legal_hold_release(hold_id, reason)`: senior admin only.
- `console.authority_report_record(case_id, agency, reported_on, reference, note)`.
- `console.user_get(user_id)`:
  - status, suspended until, active strikes with expiry;
  - actions with their appeal state;
  - counts: reports filed, % dismissed, reports received;
  - **no follower lists, no content lists** (invariant #5 holds for staff too);
  - links to the cases that concern this user.
- `console.user_search(q)`: exact match on display name, user id, or a reported content
  id.
- `console.audit_list(filter)`: scoped by role, §3.2.
- **8b:**
  - `console.dash_ops()`, `console.dash_reviewers(range)`, `console.dash_classifier(range)`;
  - `console.classification_log(filter)`: rows from `classification_scores` and
    `classification_jobs`, metadata only;
  - `console.config_get()`, `console.config_set(key, value, reason)`;
  - `console.staff_list()`, `console.staff_set_role(...)`, `console.staff_deactivate(...)`.

**App-facing** (in `public`, granted to `authenticated`):
- `public.my_account_restriction()`: `{state: none|suspended|banned, until, rule_key,
  action_id, content_ref, appeal_state}`. It is the only thing the phone screens read.
- `public.appeal_penalty(action_id, note)`:
  - text only, at most 1000 characters;
  - one appeal per action;
  - allowed for suspended and banned callers;
  - opens a `penalty_appeal` case.
- `public.appeal_classification`: extended to accept `removed` media (the uploader's
  appeal of a prohibited verdict). It goes to a reviewer other than the decider.

**Staff invite (8b; 8a uses the bootstrap script).**
- Creating an auth user needs the service role. It is a small HTTP handler beside the
  classification worker (same deploy, same `Request → Response` shape as ADR 0009):
  `POST /staff/invite`.
- It verifies the caller's JWT is an active `senior_admin` at `aal2`.
- It calls `auth.admin.generateLink({type: 'invite'})` with `app_metadata.staff = true`,
  inserts `staff.members`, and returns the **one-time link for the senior admin to pass
  on**. No SMTP needed (backlog §D).
- Bootstrap: `services/moderation-pipeline/scripts/bootstrap-staff.ts <email>
  senior_admin`, run with the service role.

### 4.3 Moderation tables (migration `moderation_console`)

- **`moderation.review_queue` (tasks), added columns:**
  - `lane moderation.lane`, `sla_due_at`;
  - `claimed_by`, `claimed_until`;
  - `skip_count int`, `stuck bool generated (skip_count >= 2)`.
  - `assigned_to` is dropped; `claimed_by` replaces it.
  - Existing `user_report` rows without media are migrated into `conduct_cases` (hosted
    has no real users, so expect none).
- **`moderation.review_skips(task_id, reviewer_id, reason, created_at)`.**
- **`moderation.media_decisions`:**
  - `id`, `media_item_id`, `task_id`, `reviewer_id`;
  - `levels jsonb | null`, `prohibited_group | null`;
  - `previous_classification`, `previous_levels`;
  - `propagated_from uuid null`, `ai_levels jsonb`, `ai_mode`, `created_at`.
  - One row per media item touched, including copies, so an overturn can restore the
    previous state.
- **`moderation.conduct_cases`:**
  - `id`, `kind`, `lane`, `status`, `sla_due_at`;
  - `subject_user_id`, `post_id`, `comment_id`, `message_id`, `media_decision_id`;
  - `report_id`, `report_category`, `reporter_id`, `reporter_note`;
  - `appeal_action_id`, `appeal_note`;
  - `pattern jsonb` (the signal numbers);
  - `taken_by`, `taken_until`, `resolution`, `resolved_by`, `created_at`, `resolved_at`.
- **`public.moderation_actions`, added columns:**
  - `case_id`, `rule_key` (references `moderation.rules`);
  - `strike_expires_at`, `ends_at` (suspension end);
  - `content_ref jsonb` (what triggered it, for the user-facing detail);
  - `appeal_note`, `appeal_decided_at`, `reduced_to_action_id`.
  - Penalty enum: unchanged.
  - The existing SELECT-own policy stays; the phone screens use
    `my_account_restriction` instead.
- **`moderation.rules(key, track, default_penalty, name_he, description_he)`.**
- **`moderation.legal_holds`:**
  - `id`, `media_item_id | post_id | comment_id | message_id | user_id`;
  - `reason`, `set_by`, `set_at`, `released_by`, `released_at`.
- **`moderation.authority_reports`:**
  - `id`, `case_id`, `agency`, `reported_on date`, `reference`, `note`;
  - `recorded_by`, `created_at`.
- **`moderation.abuse_signals(user_id, computed_at, signals jsonb)`:** the latest row
  per user. (8b.)
- **`moderation.audit_log`:**
  - `id bigserial`, `at`, `actor_id`, `actor_role`, `action text`;
  - `target_kind`, `target_id`, `detail jsonb`, `reason`;
  - **append-only:** insert only through `moderation.audit(...)`; no UPDATE or DELETE
    grant to anyone; a trigger raises on update or delete.
  - Retention: `purge_audit_log()` deletes rows older than `audit_retention_days` (730,
    placeholder, legal #31).
  - The purge itself is audit-logged.
- **`moderation.moderation_config`:** one row, like `pipeline_config`.
  - `ai_answer_mode`, `claim_minutes 10`, `case_lock_minutes 30`;
  - `sla_urgent_minutes 60`, `sla_images_minutes 240`, `sla_standard_minutes 1440`,
    `sla_appeals_minutes 4320`, `sla_at_risk_ratio 0.75`;
  - `strike_days 90`, `ladder jsonb ['warning','suspension_24h','suspension_7d','permanent_ban']`;
  - `removed_media_hold_days 90`, `audit_retention_days 730`;
  - `abuse_*` thresholds (8b);
  - `price_per_1k jsonb` (cost estimate per model id).
- **Lifecycle additions:**
  - `public.media_classification` gains `removed`. `media_levels_match_lifecycle`
    allows levels to be either null or kept on `removed`.
  - `posts.removed_at`, `comments.removed_at`, `messages.removed_at`.
  - `public.account_status` gains `banned`.
  - `profiles.suspended_until timestamptz`.
  - The existing enum value `suspended` is left unused and documented as such: a
    suspension is `suspended_until > now()` and needs no expiry job.
- **Pipeline:**
  - `complete_classification_job` and `fail_classification_job` set `lane` and
    `sla_due_at` on the tasks they file.
  - `find_resolved_by_hash` ignores `removed` sources.
  - The dedupe copy of a decided item copies the reviewer's levels; that already holds,
    since the source row carries them.
- **Scheduled** (pg_cron when present, guarded as in `20261020130100`):
  - `purge_removed_media()` daily: removed media past hold days and not under a legal
    hold → delete the row; the existing orphan queue removes the object.
  - `purge_audit_log()` monthly.
  - `run_abuse_signals()` nightly (8b).
  - Suspensions and claims need no job (derived).

### 4.4 Enforcement in the database

`visibility.account_write_allowed(action text)` mirrors `accountWriteAllowed`:
- banned → false for every action except `appeal`;
- suspended → false for `post`, `comment`, `message`, `message_request`,
  `profile_edit`, `media_upload`.

**Restrictive policies** (`as restrictive`, ANDed with the existing permissive ones,
so no existing policy is rewritten):
- **On every client-writable table, the caller must not be banned:** `posts`,
  `comments`, `messages`, `message_requests`, `media_items`, `profiles`,
  `filter_settings`, `follows`, `blocks`, `post_likes`, `comment_likes`, `post_saves`,
  `user_mutes`, `suggestion_feedback`, `reports`, `group_members`,
  `family_space_members`, `groups`, `family_spaces`, `polls`, `poll_options`,
  `post_tags`, `post_audiences`, `conversations`, and `storage.objects` insert.
- **The caller must not be suspended:** `posts` and `comments` insert/update, `messages`
  and `message_requests` insert, `media_items` insert, `profiles` update of
  `display_name`/`bio`/`avatar_media_id` (a column-checking trigger, since RLS cannot
  see which columns changed), `post_audiences`.
- **Exempt even when banned:** `reports_insert` is guarded for banned callers only
  (suspended users may report).

**SECURITY DEFINER writers re-check `account_write_allowed`:**
- `appeal_classification` (suspended: allowed; banned: allowed only for removed media
  appeals);
- `appeal_penalty` (always allowed);
- the like/save RPCs if any.

**Read-side hiding of banned users and removed content:**
- `visibility.post_visible` and `comment_visible`: false when the author is `banned` or
  the row has `removed_at`.
- `profiles` RLS: banned profiles are hidden like `deleted` ones.
- `media_items_visible` / `media_url_permitted`: `removed` is never permitted, including
  the uploader carve-out.
- `post_stats` / `comment_stats` already filter through the predicates.
- `follower_count` and the counts exclude banned users: decide in implementation by
  calling `profile_visible`. Parity covers it.
- A banned user's own session sees nothing but `my_account_restriction`, which is what
  the app shows.

### 4.5 `visibility-policy` additions (each rule tested, SQL-mirrored, parity-tested)

- `AccountStatus` gains `banned`; `Viewer` and the author contexts gain
  `suspendedUntil`.
- `accountWriteAllowed(account, action, now) → boolean` (§4.4).
- **Changed:**
  - `canViewMedia`: the uploader carve-out excludes `removed`.
  - `canViewPost` / `canViewComment`: author banned or content removed → false.
  - `canViewProfilePhoto`: banned owner → false.
  - `resolveUploaderMediaState`: gains `removed` (uploader sees "media removed").
- **New staff rules:**
  - `reviewerTaskView(task) → ReviewerTaskView`: strips identities (User A/B), keeps
    text, context kind and group name. A Family Space becomes "private family space"
    with no name; messages become "private message". Includes `aiLevels` per mode.
  - `adminCaseView(case) → AdminCaseView`: media as chips only (no path, no thumbnail);
    the reporter as reliability numbers plus `reporterHidden: true`.
  - `canSignReviewMedia(staff, task, now)`: role, active claim, and an admin's session
    acknowledgement.
  - `canDecideReviewTask(staff, task, priorDeciders)`: two-eyes for appeals of a
    reviewer decision.
  - `canDecideAppeal(staff, action)`: a permanent ban needs `senior_admin`.
  - `ladderProposal(activeStrikes, ladder)`.
- **Parity matrix:**
  - viewer × author {active, suspended, banned}, content {live, removed};
  - uploader of removed media;
  - staff caller on app RPCs (treated as no user);
  - reviewer without claim or with an expired claim;
  - admin without and with entry acknowledgement;
  - the reviewer who decided, on an appeal;
  - admin vs senior on a permanent-ban appeal;
  - aal1 vs aal2;
  - deactivated staff.

## 5. Clients

### 5.1 `apps/moderation-console` (ADR 0021)

- **Stack:**
  - Vite + React 18 + React DOM, TypeScript strict, React Router.
  - `@supabase/supabase-js` with `persistSession`; the MFA calls are `mfa.enroll`,
    `challenge` and `verify`.
  - `dir="rtl" lang="he"` on `<html>`.
- **Reuse:** `@safeplace/design-tokens` (CSS variables generated from it),
  `@safeplace/shared-types`, `@safeplace/visibility-policy` (the staff rules, for UI
  defence-in-depth).
- **New package `@safeplace/console-client`:** typed wrappers over the `console.*`
  RPCs, the same pattern as `api-client`. Kept separate so the mobile app never
  bundles staff calls.
- **Components** are ported from `design-reference/components` (DOM already): Button,
  TextField, Checkbox, Toggle, Avatar (initials only, no avatar images in the console),
  Icon (Lucide).
- **New components:** table, lane tabs, SLA pill, blurred media frame, level picker,
  dialog, drawer, toast, stat tile, sparkline.
- **Copy** in `src/copy/*.ts` (ADR 0007 pattern); no Hebrew literals in components.
- **Routes:**
  - `/login`, `/login/mfa`, `/login/enroll`;
  - `/review`, `/review/task/:id`, `/review/history`;
  - `/admin` (dashboard, 8b; in 8a it redirects to cases), `/admin/cases`,
    `/admin/cases/:id`, `/admin/users/:id`, `/admin/audit`;
  - `/admin/enter-review` (warning);
  - 8b: `/admin/reviewers`, `/admin/classifier`, `/admin/settings`, `/admin/staff`.
  - A reviewer hitting `/admin/*` gets the "no access" screen. The server refuses anyway.
- **Media handling in the browser:**
  - fetch a signed URL only for the claimed task;
  - render in a `<canvas>` or `<img>` with CSS `filter: blur(28px) grayscale(1)` until
    revealed;
  - `draggable=false`, the context menu is blocked, `Cache-Control` honoured;
  - no `localStorage` of paths;
  - the URL is revoked from memory on leave.
  - The blur is a wellbeing measure; the access control is the claim.
- **Keyboard** (review item): `0`/`1`/`2` per focused group, `Tab` between groups,
  `R` reveal, `C` colour, `Enter` submit, `S` skip, `P` prohibited. All shown in a
  shortcut legend.
- **Reduced motion:** every transition becomes opacity-only under
  `prefers-reduced-motion`.
- **Deploy:** static host (Vercel, beside the worker). Part of Phase 6a's production
  plumbing; 8a ships it runnable locally (`pnpm console`).

### 5.2 Mobile (3 surfaces + 1 state)

- **Suspension banner** at the top of the feed, while `my_account_restriction().state =
  'suspended'`: "your account is limited until {time}", with a "details" link.
- **Blocked sheet:**
  - Opened by the banner, or when the user taps post, comment or "+".
  - Shows: reason (rule name), what content triggered it (text excerpt or "image in
    post from {date}"), until when, and the appeal form (one text field, 1000
    characters).
  - After an appeal: "appeal received" state.
- **Banned screen:**
  - Replaces the whole app after sign-in when `state = 'banned'`.
  - Shows the details, the appeal form, an appeal-received state, and sign out.
- **Removed-media state** on the uploader's own post: a neutral placeholder, "the media
  was removed" (reusing the filtered-placeholder frame), via
  `resolveUploaderMediaState`. No appeal button until the Phase 7 inbox (fork 17).
  Confirm with Eli, §10.
- **Write failures** caused by enforcement map to the blocked sheet, never to a generic
  error.
- All copy lives in `copy.ts`. This is user-facing product copy, so Eli signs it off.

## 6. Screens (lab names)

**Console — sign-in (both areas)**
- `login`: email + password.
- `mfa`: 6-digit code.
- `mfaEnroll`: first sign-in; QR placeholder, secret, verify.
- `noAccess`: a reviewer on an admin URL.
- `deactivated`: the account was deactivated.

**Review area**
- `rQueue`: lane tabs with counts and SLA pills; the task table (reason, context,
  media count, age, SLA countdown, claim); "show stuck" filter; claimed-by-me strip.
- `rQueueEmpty`: no tasks in the lane.
- `rLoading`: skeleton.
- `rTask`: the item view.
  - Blurred image(s) with reveal and colour toggles.
  - Context panel: reason, text, where posted, report note.
  - Level picker (4 groups × 0/1/2, with the rubric line per level).
  - Prohibited and Skip buttons.
  - Claim timer.
  - Variants in the lab panel: reason (`ai_medium_confidence`, `ai_refusal`,
    `ai_prohibited_content`, `classification_failed`, `user_report`,
    `ai_classification_appeal`); context (public, group, family, message, profile photo,
    comment); AI-answer mode.
- `rTaskRevealed`: same, revealed and in colour.
- `rTaskGraphic`: the "possibly graphic" strip; the reveal needs a hold.
- `rTaskMulti`: a post with 3 images; one decision per image.
- `rProhibited`: dialog picking the group (sex/violence/religion) with the level-3
  definition; confirm.
- `rSkip`: dialog with 3 reasons.
- `rFeedback`: after submit in `blind_then_feedback`, "AI thought: …" compared per
  group, then auto-advance.
- `rLockExpired`: "your claim expired" banner with a re-claim button.
- `rHistory`: my decisions (time, reason, decision summary, appealed or changed).
- `rError`: failed to load the task or the media.
- `rAsAdmin`: an admin in the review area; persistent amber banner "you are in the
  media area" and an exit link.

**Admin area**
- `aEnterReview`: the warning interstitial with checkbox and confirm.
- `aCases`: lane tabs (urgent / standard / appeals / patterns) with counts; table
  (kind, subject, summary, reports-on-same-target, SLA, taken-by); filters.
- `aCasesEmpty`.
- `aCaseReport`: report case on a text post.
  - Content, the report (category, note, reporter reliability), other open reports on
    the same content.
  - Subject summary: strikes, last decisions.
  - Decision bar: Dismiss, Remove content, Penalty, Send media for review.
- `aCaseMessage`: message report; transcript with the reported message highlighted,
  "show 10 earlier".
- `aExpandReason`: reason dialog for expanding the transcript.
- `aCaseProhibited`: case from a prohibited verdict.
  - Verdict card: group, level-3 definition, reviewer (staff name), time. The image is
    a chip, never shown.
  - Same decision bar.
- `aCasePattern`: abuse pattern: the signal numbers, recent reports filed with
  outcomes, decision.
- `aCaseAppeal`: penalty appeal: original action, rule, content, the user's appeal
  text; Uphold / Reduce / Overturn. Permanent ban → "requires senior admin" state for a
  plain admin.
- `aPenalty`: penalty dialog.
  - Rule picker (ladder / direct), proposed step from active strikes, "go lower"
    requiring a reason, preview of what the user will see (the phone sheet copy).
- `aBanConfirm`: permanent-ban typed confirm.
- `aMinors`: `minors_risk` direct flow: ban, automatic legal hold, authorities record
  form (agency, date, reference, note).
- `aUser`: user page.
  - Header: display name, id, status pill, suspended-until.
  - Strikes timeline with expiries; actions and appeals.
  - Counts: reports filed, % dismissed, reports received; open cases.
  - Legal holds.
- `aAudit`: filters (actor, action, target, date); table.
- `aAuditEntry`: detail drawer with old → new for settings.
- `aError`: generic load failure.
- `aLoading`: skeleton.

**Admin area — 8b**
- `aDashboard`:
  - Tiles: urgent at-risk/breached, images queue, standard queue, appeals waiting,
    stuck tasks, worker lag.
  - Charts: queue by lane over 7 days, SLA attainment.
  - Platform counts: users, signups/day, posts/day, reports/day.
  - Cost estimate this month.
- `aReviewers`: per-reviewer table: tasks/hour, decided, skips, agreement with AI,
  changed on appeal; range picker.
- `aClassifier`:
  - Per-group rates: auto general, auto flagged, human, refusals, prohibited.
  - Escalation rate, dedupe hit rate, average latency.
  - Per-upload log table (time, media id, provider/model, verdict, confidence, band,
    resolved, latency, dedupe source). No images.
- `aSettings`: tabs: pipeline (thresholds, models, escalation, batch), review
  (AI-answer mode, claim minutes), SLA, ladder, abuse, retention. Region blur shown
  locked.
- `aSettingConfirm`: reason + confirm dialog showing old → new.
- `aStaff`: staff table (name, role, active, 2FA, last sign-in) with actions.
- `aInvite`: invite dialog showing the resulting one-time link with a copy button.

**Phone (390×844)**
- `mBanner`: feed with the suspension banner.
- `mBlockedSheet`: the sheet with details and appeal form.
- `mAppealSent`: the sheet after the appeal.
- `mBanned`: the banned screen.
- `mRemovedMedia`: own post with the removed-media placeholder.

## 7. Order of work

### Milestone 8a (closes pilot blocker 2)

1. **ADRs** via `/new-adr` (§8) first. They fix vocabulary for everything else.
2. **Data tier**, test-first in `packages/db-testing`:
   - migrations `staff_identity`, `moderation_console`, `account_enforcement`,
     `report_routing_v2`;
   - policy rules (§4.5) with unit tests, then SQL mirrors, then parity;
   - `/visibility-audit` on every changed read path (posts, comments, profiles,
     media_items_visible, storage) and on every `console.*` RPC.
3. **Pipeline touch-ups:** lane and SLA on filed tasks; dedupe ignores `removed`; the
   `bootstrap-staff` script; `purge_removed_media`.
4. **`@safeplace/console-client`** with tests against PGlite through
   `supabase-adapter`, as `api-client` does.
5. **`apps/moderation-console`:**
   - scaffold, tokens as CSS vars, ported components, copy modules;
   - login + MFA;
   - review area (all 8a screens), then admin cases, case views, penalty, appeal,
     minors flow, user page, audit, enter-review.
6. **Mobile:** `my_account_restriction` in api-client; banner, sheet, banned screen,
   removed-media state; map enforcement errors.
7. **Verify:**
   - `pnpm typecheck && pnpm lint && pnpm test` green, output quoted;
   - pixel compare: console at 1440×900 in Chromium, phone at 390×844 on Expo web;
   - hosted migration apply needs Eli's approval and the exposed-schema setting;
   - bootstrap Eli's senior-admin account;
   - Eli runs one end-to-end pass with a test uploader account. Eli works only text
     cases; image tasks need a reviewer.

### Milestone 8b

1. `moderation.abuse_signals` + `run_abuse_signals()` + pattern cases; parity tests
   ensure nothing happens to a user automatically.
2. Dashboard RPCs (SQL aggregates only), reviewer stats, classifier health and the
   per-upload log.
3. Settings (`config_get/set`, reason + audit, region blur locked) and staff management
   (the `/staff/invite` handler, roles, deactivation).
4. Screens `aDashboard`, `aReviewers`, `aClassifier`, `aSettings`, `aSettingConfirm`,
   `aStaff`, `aInvite`. Verify as in 8a.

**Phase 5 handoff (profile, groups, Family Spaces):**
- a profile screen shows "user unavailable" for banned (and blocked) users;
- bio and avatar edits respect suspension (the guard already exists);
- avatar upload's media tasks show context "profile photo" (already modelled);
- group admins' own moderation (`04` §5.2) is a separate thing from staff moderation
  and stays out of this console.

## 8. ADRs to write (8a step 1)

| # | Title |
|---|---|
| 0020 | Staff identity and roles: separate auth accounts flagged in `app_metadata`, no profile, invite-only, TOTP required (aal2 check in SQL), three roles, deactivation |
| 0021 | Moderation console stack and the media lock: Vite + React DOM SPA; `console` RPC schema; no table grants; signed media only under an active claim; admin entry acknowledgement per session; blur as wellbeing, not access control |
| 0022 | Media tasks vs conduct cases: reviewers classify, admins judge; anonymized reviewer view; two-eyes for reviewers only (relaxes `appeal_different_moderator`); report routing table |
| 0023 | Strikes ladder and enforcement: expiring strikes, proposals, direct track, derived suspension (`suspended_until`), `banned` status, restrictive RLS write guards, read-side hiding |
| 0024 | Removed media, legal hold, authorities records: `removed` lifecycle value, 90-day hold, purge, offline authorities reporting |
| 0025 | Dedupe override propagation: a reviewer decision applies to every SHA-256 copy; closes backlog §K |

Docs to update in 8a:
- `moderation-pipeline.md` §4–7;
- `visibility-model.md`: a new §4b "Staff access" (the explicit exception
  `apps/moderation-console/README.md` asked for);
- `data-model.md` (Phase 8 notes);
- `content-categories.md` §2 (who removes level 3);
- the backlog (§K items closed or re-pointed);
- the legal tracker (§9).

## 9. Legal and product flags

**Legal tracker (🔴 stays 🔴; this is engineering, not sign-off):**
- **Touched:**
  - #9 moderation policy;
  - #21 staff structure (a hired team views images; the blur and reveal log are our
    mitigations; wellbeing is still HR/legal);
  - #27 level-3 removal basis;
  - #7 automated scanning (humans now see flagged media; reveal log).
- **New items to add:**
  - **#29** retention of removed media (90 days) and legal holds;
  - **#30** reporting to authorities: procedure, which agency, what is preserved, and
    who decides;
  - **#31** audit log retention (2 years placeholder) and staff-activity logging
    (reveals, sign-ins) as employee monitoring;
  - **#32** suspension and ban: hiding a banned user's content, appeal rights, and the
    ToS basis for each rule in the catalogue.
- **Before production:** penalties (#9, #27, #32), the authorities flow (#30) and the
  hired team (#21) must be 🟢.

**Product clarifications for Eli** (the spec is not edited; add a note to the spec when
Eli confirms the wording):
- `07` §5.1: a missed women image is not an offense (fork 14). The ladder's example
  list should drop "content with women that passed the AI" or narrow it to deliberate
  evasion.
- `07` §6.3: "a different moderator" applies to reviewers' media decisions; admin
  decisions may be re-decided by any admin; a permanent ban needs a senior admin
  (fork 7).
- `07` §5.3: decisions reach users through the Phase 7 inbox; until then, only the
  blocked surfaces (fork 17).
- `07` §6.2: "evidence (screenshots)" in an appeal is **not** built. Screenshots are
  media: they would need the pipeline, and an admin could not view them. 8a appeals are
  text only. See §10.

## 10. Open questions (ask Eli; none blocks 8a's data tier)

1. **Grouped reports:** may the case view show "N other open reports on this content"
   and resolve them together (§3.5)? The lab shows it. It is a human choice, but it
   does show report volume to the admin.
2. **Appeal evidence:** text only for now. Should screenshots ever be attachable? If
   so, they go through the pipeline and are reviewed by the team, not the admin.
3. **Removed-media placeholder on the uploader's own post** (§5.2): show it, or let the
   media silently disappear until the inbox?
4. **Rule names and descriptions in Hebrew** (users see them on the blocked sheet):
   Eli's copy. Drafts are in the lab.
5. **Suspended users and groups/Family Spaces:** can a suspended user still join a
   group or accept a Family Space invite? Planned: yes; only creation of content is
   blocked.
6. **Second admin before the pilot?** Not required by the rules any more (fork 7), but
   a single admin is a single point of failure for 1-hour urgent cases.
7. **Hired team sizing and shifts:** drives whether a 1-hour urgent SLA is real at
   night and on Shabbat. The SLA clock currently runs 24/7; pausing it on Shabbat would
   be a settings addition.
8. **Exposing the `console` schema on hosted** is a dashboard setting (Eli). The
   alternative is `public.console_*` functions with no config change.
9. **The reporter identity reveal** in admin cases: planned behind a logged click with
   a reason. Confirm, or never show it?

## Progress log

### 2026-11-14 — planning session

- Grounded on spec 07, master §3–4.4, `09` §3.5/§6, the architecture docs, ADRs
  0004/0009/0011/0018/0019, backlog §K, the legal tracker and the moderation
  migrations.
- 27 forks settled with Eli (§2). Design approved in three sections.
- Lab: `docs/design/phase-8-admin/admin-lab.html`, waiting for review and lock.
