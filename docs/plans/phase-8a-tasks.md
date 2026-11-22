# Phase 8a — Implementation tasks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship milestone 8a of `docs/plans/phase-8-admin-portal.md`:
- the data tier;
- penalty enforcement;
- the review area;
- admin cases, penalties, appeals, the user page and the audit log;
- the phone surfaces;
- the staff bootstrap script.

**Architecture:**
- Postgres is the authority. Staff reach data only through SECURITY DEFINER functions
  in an exposed `console` schema, which check role and aal2 and write the audit log.
- Every visibility and staff-shaping rule is a pure function in
  `packages/visibility-policy` with a SQL mirror. PGlite parity tests prove the two
  agree.
- The console is a Vite + React DOM SPA (`apps/moderation-console`) that matches the
  locked lab pixel for pixel.

**Tech stack:**
- Supabase (Postgres 15+, RLS, Storage, Auth MFA); PGlite + vitest for DB tests;
- TypeScript strict; Vite 5 + React 18 + React Router 6 for the console;
- Expo / React Native for the 3 phone surfaces.

**Source of truth:** the phase plan §2–§7 (decisions, model, data tier, clients,
screens) and §10 (Eli's answers), plus `docs/design/phase-8-admin/admin-lab.html` and
`reference/*.png` (locked). Where this file and the phase plan disagree, the phase plan
wins: fix this file.

**How each task is run:**
- TDD. Write the listed tests first, see them fail, implement, see them pass, then run
  `pnpm --filter <pkg> test` and `typecheck`, then commit.
- SQL follows the house style of the existing migrations:
  - `security definer set search_path = ''`;
  - fully qualified names;
  - `revoke all … from public, anon` and an explicit `grant … to authenticated,
    service_role`;
  - a header comment explaining *why*.
- Each migration gets a PGlite test file in `packages/db-testing/src/__tests__/`.
- Enum `add value` statements go in their own migration file, because PGlite applies
  each file in one transaction (see `20261030100000_review_reasons.sql`).

---

### Task 0: ADRs and doc updates (no code)

**Files:**
- Create: `docs/decisions/0020-staff-identity-and-roles.md` … `0025-dedupe-override-propagation.md`
  (titles in the phase plan §8, template `docs/decisions/0000-template.md`).
- Modify: `docs/decisions/README.md` (index).
- Modify: `docs/legal/legal-tracker.md`:
  - add #29–#32 (phase plan §9);
  - add Phase 8 notes on #7, #9, #21, #27;
  - change the count to 32.
- Modify: `docs/decisions/open-questions-backlog.md`:
  - §K: dedupe override → resolved by ADR 0025;
  - SLA targets → set (§3.6 of the phase plan; Shabbat pause);
  - windows/decay → ADR 0023;
  - reporter notification → stays "no" (Eli).

- [ ] Write the six ADRs (Context / Decision / Alternatives / Consequences). Each cites the forks in phase plan §2 it records.
- [ ] Update the tracker, the backlog and the ADR README.
- [ ] Commit `docs(phase-8): ADRs 0020-0025, legal #29-32, backlog`.

### Task 1: visibility-policy — account and lifecycle rules

**Files:**
- Modify: `packages/visibility-policy/src/types.ts`, `src/rules.ts`, `src/index.ts`.
- Modify: `packages/shared-types/src/entities.ts` (`AccountStatus` gains `banned`).
- Test: `packages/visibility-policy/src/__tests__/enforcement.test.ts` (new); extend
  `rules.test.ts`, `post-rules.test.ts`, `uploader-state.test.ts`.

**Interfaces:**
```ts
export type MediaClassification = "unclassified" | "general" | "pending_review" | "contains_women" | "removed";
export type AccountState = { status: "active" | "banned"; suspendedUntil: Date | null };
export type WriteAction = "post" | "comment" | "message" | "message_request" | "profile_edit"
  | "media_upload" | "interaction" | "report" | "appeal";
export function accountWriteAllowed(account: AccountState, action: WriteAction, now: Date): boolean;
// PostContext / CommentContext gain: authorBanned: boolean; removed: boolean
// canViewProfilePhoto photo arg gains: ownerBanned: boolean
// UploaderMediaState gains "removed"
```

**Tests:**
- `accountWriteAllowed`:
  - banned → false for every action except `appeal`;
  - suspended (`suspendedUntil > now`) → false for post, comment, message,
    message_request, profile_edit, media_upload; true for interaction, report, appeal;
  - suspendedUntil in the past or null → all true.
- `canViewMedia`: `removed` → false for a viewer **and for the uploader**; the other
  lifecycle values are unchanged.
- `canViewPost` / `canViewComment`:
  - `authorBanned` → false for everyone, including the author;
  - `removed` → false for everyone, including the author;
  - existing cases unchanged.
- `canViewProfilePhoto`: owner banned → false, including the owner.
- `resolveUploaderMediaState({classification:'removed'})` → `"removed"`.

- [ ] Write the tests; run `pnpm --filter @safeplace/visibility-policy test` and see them FAIL.
- [ ] Implement; tests PASS; `typecheck` across the workspace (callers of changed contexts: api-client viewer/post builders, mobile). Fix callers by passing the new fields.
- [ ] Commit `feat(visibility-policy): account enforcement and removed lifecycle rules`.

### Task 2: visibility-policy — staff rules, ladder, SLA

**Files:** Create `packages/visibility-policy/src/staff.ts` (re-exported from index);
test `src/__tests__/staff.test.ts`.

**Interfaces:**
```ts
export type StaffRole = "reviewer" | "admin" | "senior_admin";
export interface StaffActor { userId: string; role: StaffRole; active: boolean; aal: "aal1" | "aal2"; reviewEntryAcknowledged: boolean }
export interface ReviewTaskRecord { id: string; reason: ReviewReason; contextKind: ContextKind; text: string | null;
  groupName: string | null; uploaderId: string; reporterId: string | null; reportCategory: string | null;
  reporterNote: string | null; uploaderNote: string | null; aiLevels: Partial<Record<ContentGroup, number | "uncertain">> | null;
  claimedBy: string | null; claimedUntil: Date | null; priorDeciders: readonly string[] }
export type ContextKind = "public" | "followers" | "group" | "family" | "message" | "profile" | "comment";
export type AiAnswerMode = "blind" | "blind_then_feedback" | "shown";
export function staffAllowed(actor: StaffActor, min: StaffRole): boolean;           // active && aal2 && rank>=min
export function canSignReviewMedia(actor: StaffActor, task: ReviewTaskRecord, now: Date): boolean;
export function canDecideReviewTask(actor: StaffActor, task: ReviewTaskRecord, now: Date): boolean;
export function reviewerTaskView(task: ReviewTaskRecord, mode: AiAnswerMode): ReviewerTaskView; // uploader "A", reporter "B"; family/message → no group name; aiLevels only when mode==="shown"
export function adminCaseView(c: CaseRecord): AdminCaseView;  // media as {id, levels|null, removed} chips, never a path; reporter {reliability}, identity hidden
export function canDecideAppeal(actor: StaffActor, penalty: PenaltyType): boolean; // permanent_ban ⇒ senior_admin
export function ladderProposal(activeStrikes: number, ladder: readonly PenaltyType[]): PenaltyType; // ladder[min(active, len-1)]
export function slaDue(created: Date, minutes: number, pauses: readonly {start: Date; end: Date}[]): Date; // working minutes, skipping pauses
export function slaState(created: Date, due: Date, now: Date, pauses, atRiskRatio: number): "ok" | "risk" | "late";
```

**Tests:**
- `staffAllowed`:
  - aal1 → false;
  - inactive → false;
  - reviewer cannot do admin; admin can do reviewer; senior can do all.
- `canSignReviewMedia`:
  - reviewer with an active claim → true;
  - claim expired → false;
  - another reviewer's claim → false;
  - admin with a claim but without acknowledgement → false;
  - admin with a claim and acknowledgement → true.
- `canDecideReviewTask`: a reviewer in `priorDeciders` → false (two-eyes, fork 7);
  otherwise as in `canSignReviewMedia`.
- `reviewerTaskView`:
  - never contains `uploaderId` or `reporterId` (deep-scan the keys);
  - a family/message context drops `groupName`;
  - `aiLevels` is present only in mode `shown`.
- `adminCaseView`: the JSON never contains `storage_path` or any `/`-shaped object path.
- `canDecideAppeal`: admin and a permanent ban → false; senior → true; admin and a 7d
  suspension → true.
- `ladderProposal`: 0→warning, 1→suspension_24h, 2→7d, 3→ban, 9→ban.
- `slaDue`:
  - no pauses → created + minutes;
  - a pause straddling the window adds its overlap;
  - created inside a pause starts the clock at the pause end.

- [ ] Tests FAIL → implement → PASS → commit `feat(visibility-policy): staff rules, ladder proposal, SLA with pauses`.

### Task 3: harness support for staff JWTs

**Files:** Modify `packages/db-testing/src/harness.ts`; seed helper
`packages/db-testing/src/staff-seed.ts` (new).

- `asStaff(userId, { aal = "aal2", sessionId = "s1" })`: role `authenticated`, claims
  `{sub, role, aal, session_id, app_metadata:{staff:true}}`.
- `seedStaff(db)`: inserts 3 auth users with `raw_app_meta_data = {"staff":true}` (keys
  `STAFF.reviewer`, `STAFF.reviewer2`, `STAFF.admin`, `STAFF.senior`), plus
  `staff.members` rows (after Task 4 exists). Export ids.

- [ ] Implement with the next task (its tests use it); commit together.

### Task 4: migration `20261122100000_staff_identity.sql`

Contents (phase plan §4.1):
- schema `staff`;
- `staff.staff_role` enum;
- `staff.members`, `staff.review_entries`;
- `handle_new_user` early return for staff. Re-create it from its latest body
  (`20261030100100_content_levels.sql`) verbatim plus the guard;
- `staff.current_role()`, `staff.require(min staff.staff_role)`, `visibility.is_staff()`;
- moving the `moderation_actions` FKs to `auth.users`;
- dropping `appeal_different_moderator`.

**Test:** `staff-identity.test.ts`.
- `current_role()` is null for a user, for aal1 and for a deactivated member; it returns
  the role for aal2.
- `require('admin')` raises for a reviewer.
- A staff auth user gets no profile row.
- Clients have no grants on `staff.*`: `select` from `staff.members` as `authenticated`
  is denied.

- [ ] Test FAIL → migration → PASS → commit `feat(db): staff identity, roles and aal2 guard`.

### Task 5: migrations `20261122100100_phase8_enum_values.sql` + `20261122100200_account_enforcement.sql`

- Enum values: `media_classification` + `removed`; `account_status` + `banned`.
- Enforcement (phase plan §4.4):
  - `profiles.suspended_until`; `posts/comments/messages.removed_at`;
  - `visibility.account_write_allowed(action text)`;
  - restrictive policies on every client-writable table (list in plan §4.4);
  - a trigger on `profiles` that blocks changes to `display_name/bio/avatar_media_id`
    while suspended;
  - `post_visible` / `comment_visible` gain the banned-author and `removed_at` checks;
  - `profiles_select` hides banned profiles (except none: the banned user also cannot
    read their own row; they use `my_account_restriction`);
  - `media_url_permitted` / `levels_visible` / `avatar_permitted` refuse `removed`,
    including for the uploader;
  - `media_levels_match_lifecycle` allows `removed`;
  - `find_resolved_by_hash` ignores `removed` sources.

**Tests:**
- `enforcement.parity.test.ts`: for each `WriteAction` × {active, suspended, expired
  suspension, banned}, the DB outcome of a representative insert/update equals
  `accountWriteAllowed`. Use seeded users with direct `update profiles set …` through
  `raw`.
- `removed-content.parity.test.ts`:
  - a viewer matrix × {post removed, comment removed, author banned, media removed}
    agrees with `canViewPost` / `canViewComment` / `canViewMedia`;
  - the uploader of removed media gets `storage_path` null.
- Re-run the whole db-testing suite: the existing parity suites must stay green.

- [ ] Tests FAIL → migrations → PASS (full `pnpm --filter @safeplace/db-testing test`) → commit `feat(db): suspension and ban enforcement, removed content`.

### Task 6: migration `20261122100300_moderation_console.sql`

Contents (phase plan §4.3):
- **Tables:** lanes and claims on `review_queue`, `review_skips`, `media_decisions`,
  `conduct_cases`, the new `moderation_actions` columns, `moderation.rules` seeded with
  the 11 keys and the accepted Hebrew names from the lab, `legal_holds`,
  `authority_reports`, `audit_log` (append-only trigger), `moderation_config`,
  `sla_pauses`.
- **Functions:** `moderation.sla_due(created_at, minutes)` (mirror of `slaDue`),
  `moderation.audit(...)`.
- **Report routing v2:** replace `enqueue_report_for_review` per phase plan §3.5.
- **Pipeline:** `complete_classification_job` / `fail_classification_job` /
  `appeal_classification` set `lane` and `sla_due_at`.
- **Scheduled:** `purge_removed_media()` and `purge_audit_log()` (schedule guarded as in
  `20261020130100`).

**Tests:**
- `report-routing-v2.test.ts`: each row of the plan §3.5 table.
- `sla.parity.test.ts`: `moderation.sla_due` equals `slaDue` on 10 generated cases with
  pauses.
- `audit-log.test.ts`: update/delete raise for every role, including service.
- Existing `report-routing.test.ts`: update to the new routing; keep its "ten reports,
  ten items" assertion.

- [ ] FAIL → migration → PASS → commit `feat(db): moderation console tables, routing v2, SLA`.

### Task 7: migration `20261122100400_console_review_api.sql`

Contents (phase plan §4.2, review block):
- `console` schema;
- `review_list`, `review_claim`, `review_release`, `review_get`, `review_media_path`,
  `review_log_reveal`, `review_decide`, `review_skip`, `review_my_history`,
  `review_enter`;
- the storage SELECT policy calling `visibility.can_sign_review_media(name)`.

`review_decide`:
- writes `media_decisions` for the item and every SHA-256 copy;
- sets levels and classification, or `removed`;
- resolves the task and the copies' open tasks;
- a prohibited verdict opens a `prohibited_media` conduct case for this task's uploader
  only;
- resolves classification appeals;
- returns `ai_levels` in mode `blind_then_feedback`.

**Test:** `console-review.test.ts`.
- Role gates and aal1 are refused.
- A claim's lock is respected, and the lock expiry is derived.
- Skip hides the task from the skipper; the second skip marks it stuck.
- Without a claim, the media path is refused.
- An admin without `review_enter` is refused.
- Propagation to 2 SHA copies.
- A prohibited verdict leads to `removed` and a case.
- Two-eyes on a classification appeal of a reviewer decision.
- The audit row exists for each call.
- `review_get` output passes the same anonymization check as `reviewerTaskView`
  (parity).

- [ ] FAIL → migration → PASS → commit `feat(db): console review API`.

### Task 8: migration `20261122100500_console_admin_api.sql`

Contents (phase plan §4.2, admin and app-facing blocks):
- `cases_list`, `case_take`, `case_release`, `case_get`, `case_message_context`,
  `case_reveal_reporter`, `case_decide`, `appeal_decide`;
- `legal_hold_set`, `legal_hold_release`, `authority_report_record`;
- `user_get`, `user_search`, `audit_list`;
- `public.my_account_restriction`, `public.appeal_penalty`;
- `appeal_classification` accepts `removed`.

**Test:** `console-admin.test.ts`.
- **Ladder:**
  - the proposal from active strikes;
  - expired strikes are ignored;
  - "lower with reason" requires the reason;
  - permanent ban requires `confirm_name`.
- **Direct `minors_risk`:** ban + hold + authority record required.
- **Message context:**
  - 5 messages, then +10 only with a reason;
  - media appears only as chips.
- **Grouped decision** resolves the selected sibling reports.
- **False report** opens a case against the reporter.
- **Appeals:**
  - an admin cannot decide a ban appeal; a senior can;
  - overturn restores the content and status and voids the strike;
  - reduce replaces the action.
- **`my_account_restriction`** for none / suspended / banned.
- **`appeal_penalty`:**
  - once per action;
  - allowed when banned.
- **`user_get`** has no follower or membership lists.
- **`audit_list`** is scoped per role.
- **`case_get`** passes the `adminCaseView` parity check (no paths).

- [ ] FAIL → migration → PASS → commit `feat(db): console admin API and penalty appeals`.

### Task 9: scripts

**Files:**
- `services/moderation-pipeline/scripts/bootstrap-staff.ts` (service role: creates the
  auth user with `app_metadata.staff=true`, inserts `staff.members`, prints the invite
  link from `auth.admin.generateLink({type:'invite'})`);
- `services/moderation-pipeline/scripts/seed-sla-pauses.ts` (uses `@hebcal/core` with
  Jerusalem: candle-lighting to havdalah for Shabbat and Yom Tov, the next 12 months;
  upsert into `moderation.sla_pauses`).

**Tests:** pure helper `shabbatWindows(from, to)` unit-tested (a known Friday/Saturday
pair; Pesach first day).

- [ ] FAIL → implement → PASS → commit `feat(moderation): staff bootstrap and SLA pause seeding scripts`.

### Task 10: `@safeplace/console-client`

**Files:** `packages/console-client/{package.json,tsconfig.json,src/index.ts,src/review.ts,src/admin.ts,src/account.ts,src/__tests__/*.test.ts}`.

- Typed wrappers over every `console.*` RPC: `supabase.schema('console').rpc(...)`.
- Errors map to `{code: 'forbidden'|'not_claimed'|'claim_expired'|'needs_senior'|'needs_reason'|'not_found'|'network'}`.
- `account.ts` (used by mobile, so it lives in `api-client` instead):
  `getAccountRestriction`, `appealPenalty`.

**Tests:** against PGlite through `supabase-adapter` (pattern of
`api-client-flows.test.ts`): one happy path per wrapper and error mapping.

- [ ] FAIL → implement → PASS → commit `feat(console-client): typed console RPC wrappers`.

### Task 11: `apps/moderation-console` scaffold and shell

**Files:**
- `apps/moderation-console/{package.json,index.html,vite.config.ts,tsconfig.json}`;
- `src/main.tsx`, `src/App.tsx` (router + role guard);
- `src/theme/tokens.css` (generated from `@safeplace/design-tokens` by
  `scripts/tokens-css.ts`, test asserts sync);
- `src/components/*` (Button, Field, Check, Radio, Pill, Tabs, Table, SlaPill, Dialog,
  Drawer, Empty, Skeleton, Shell [side rail locked], Icon);
- `src/copy/*.ts`;
- root `package.json` script `console`.

Layout values come from the lab CSS (`.desk`, `.c-*` rules), verbatim.

**Tests:** vitest + @testing-library/react:
- the role guard routes a reviewer away from `/admin/*`;
- `Shell` renders the nav for each role;
- the `SlaPill` state classes.

- [ ] FAIL → implement → PASS → commit `feat(console): app scaffold, tokens, shell, components`.

### Task 12: console auth screens

`login`, `mfa`, `mfaEnroll`, `deactivated`, `noAccess` (lab names).
- Supabase `signInWithPassword`, `mfa.listFactors`, `enroll`, `challenge`, `verify`.
- aal2 is required before any route.

**Tests:** form state machine (aal1 → mfa; no factor → enroll; deactivated error →
deactivated screen).

- [ ] FAIL → implement → PASS → commit.

### Task 13: review area screens

`rQueue`, `rQueueEmpty`, `rLoading`, `rTask` (+ revealed / graphic / multi /
lockExpired / error states), `rProhibited`, `rSkip`, `rFeedback`, `rHistory`,
`rAsAdmin`, `aEnterReview` (lab).

Media is fetched by signed URL (60 s) only for the claimed task. It renders with CSS
blur+grayscale until revealed; `draggable=false`; the context menu is blocked; nothing
goes to storage. Keyboard map per phase plan §5.1.

**Tests:**
- the level picker's keyboard;
- submit is disabled until 4 levels are chosen;
- reveal calls `review_log_reveal`;
- a lock-expired banner when `claimed_until` passes.

- [ ] FAIL → implement → PASS → commit.

### Task 14: admin area screens (8a)

`aCases`, `aCasesEmpty`, `aLoading`, `aError`, `aCaseReport`, `aCaseMessage`,
`aExpandReason`, `aCaseProhibited`, `aCaseAppeal` (both kinds), `aPenalty`,
`aBanConfirm`, `aMinors`, `aUser`, `aAudit`, `aAuditEntry`. `/admin` redirects to cases
in 8a.

**Tests:**
- the penalty dialog's proposal and "lower needs reason";
- the ban confirm enables only on an exact name;
- the minors form requires a reference;
- the appeal "requires senior" state for an admin on a ban.

- [ ] FAIL → implement → PASS → commit.

### Task 15: mobile surfaces

**Files:**
- `packages/api-client/src/account.ts` (`getAccountRestriction`, `appealPenalty`);
- `apps/mobile/src/screens/restriction/*` (banner, blocked sheet, appeal-sent, banned
  screen, `copy.ts`);
- hook into the app layout (banned → replaces the app);
- feed (banner);
- compose / comment / "+" (open the sheet instead of failing);
- the `removed` state in post media (placeholder `המדיה הוסרה`).

**Tests:**
- api-client flows against PGlite;
- mobile model tests for the error → sheet mapping.

- [ ] FAIL → implement → PASS → commit.

### Task 16: verification and docs

- [ ] `pnpm typecheck && pnpm lint && pnpm test` from the root, uncached (`pnpm turbo run typecheck lint test --force`); quote the totals.
- [ ] Pixel compare:
  - console screens: Vite dev server + the `scripts/pixel-compare` flow at 1440×900
    against `docs/design/phase-8-admin/reference/`;
  - phone screens: Expo web at 390×844;
  - in WSL use Edge headless.
- [ ] `/visibility-audit` on: posts, comments, profiles, `media_items_visible`, storage policies, every `console.*` function.
- [ ] Docs:
  - `moderation-pipeline.md` §4–7;
  - `visibility-model.md` §4b "Staff access";
  - `data-model.md` Phase 8 notes;
  - `content-categories.md` §2;
  - `apps/moderation-console/README.md`.
- [ ] Progress log in the phase plan; hosted migration apply only with Eli's approval (and his `console` exposed-schema step); bootstrap Eli's senior-admin account.
