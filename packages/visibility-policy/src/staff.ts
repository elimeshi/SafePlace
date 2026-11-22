/**
 * Staff console rules (Phase 8 plan §3, §4.5). Reviewers classify media and
 * never see people; admins judge people and never see media. Each rule is
 * mirrored in SQL by the console RPCs and parity-tested in packages/db-testing.
 */
import type { ContentGroup, ContentLevels } from "./types";

export type StaffRole = "reviewer" | "admin" | "senior_admin";

export interface StaffActor {
  userId: string;
  role: StaffRole;
  active: boolean;
  aal: "aal1" | "aal2";
  /** An admin confirmed the "possibly improper media" warning this session (plan §2 fork 1). */
  reviewEntryAcknowledged: boolean;
}

export type ReviewReason =
  | "ai_medium_confidence"
  | "classification_failed"
  | "user_report"
  | "ai_classification_appeal"
  | "ai_prohibited_content"
  | "ai_refusal"
  | "admin_request";

export type ContextKind = "public" | "followers" | "group" | "family" | "message" | "profile" | "comment";

/** Senior-admin setting (plan §2 fork 9): whether a reviewer sees the AI's answer. */
export type AiAnswerMode = "blind" | "blind_then_feedback" | "shown";

export type PenaltyType = "warning" | "suspension_24h" | "suspension_7d" | "permanent_ban" | "content_removed";

export interface ReviewTaskRecord {
  id: string;
  reason: ReviewReason;
  contextKind: ContextKind;
  text: string | null;
  groupName: string | null;
  uploaderId: string;
  reporterId: string | null;
  reportCategory: string | null;
  reporterNote: string | null;
  uploaderNote: string | null;
  aiLevels: Partial<Record<ContentGroup, number | "uncertain">> | null;
  claimedBy: string | null;
  claimedUntil: Date | null;
  /** Reviewers who decided this media before: an appeal of their decision needs other eyes. */
  priorDeciders: readonly string[];
}

export interface ReviewerTaskView {
  id: string;
  reason: ReviewReason;
  contextKind: ContextKind;
  text: string | null;
  groupName: string | null;
  uploaderLabel: "A";
  reporterLabel: "B" | null;
  reportCategory: string | null;
  reporterNote: string | null;
  uploaderNote: string | null;
  aiLevels?: ReviewTaskRecord["aiLevels"];
}

export interface CaseMedia {
  id: string;
  storagePath?: string;
  levels: ContentLevels | null;
  removed: boolean;
}

export interface CaseRecord {
  id: string;
  subjectUserId: string;
  text: string | null;
  media: readonly CaseMedia[];
  reporterId: string | null;
  reporterReportsLast30d: number;
  reporterDismissedRatio: number;
  [k: string]: unknown;
}

export interface AdminCaseView {
  id: string;
  subjectUserId: string;
  text: string | null;
  media: readonly { id: string; levels: ContentLevels | null; removed: boolean }[];
  reporter: { hidden: true; reportsLast30d: number; dismissedRatio: number } | null;
}

const RANK: Readonly<Record<StaffRole, number>> = { reviewer: 0, admin: 1, senior_admin: 2 };

/** Every staff call needs an active account and TOTP (aal2) — plan §2 fork 5. */
export function staffAllowed(actor: StaffActor, min: StaffRole): boolean {
  return actor.active && actor.aal === "aal2" && RANK[actor.role] >= RANK[min];
}

/**
 * Whether the actor may get a signed URL for a task's media: only while they
 * hold the claim, and an admin only after the review-entry warning.
 */
export function canSignReviewMedia(actor: StaffActor, task: ReviewTaskRecord, now: Date): boolean {
  return (
    staffAllowed(actor, "reviewer") &&
    task.claimedBy === actor.userId &&
    task.claimedUntil !== null &&
    task.claimedUntil.getTime() > now.getTime() &&
    (actor.role === "reviewer" || actor.reviewEntryAcknowledged)
  );
}

/** As canSignReviewMedia, plus two pairs of eyes: a prior decider never decides again (plan §2 fork 7). */
export function canDecideReviewTask(actor: StaffActor, task: ReviewTaskRecord, now: Date): boolean {
  return canSignReviewMedia(actor, task, now) && !task.priorDeciders.includes(actor.userId);
}

/**
 * What a reviewer is shown about a task: text yes, identity no (plan §2 fork 10).
 * Built field by field so a new identity column on the record can never leak.
 * A Family Space or message thread name would identify a family, so it is dropped.
 */
export function reviewerTaskView(task: ReviewTaskRecord, mode: AiAnswerMode): ReviewerTaskView {
  const view: ReviewerTaskView = {
    id: task.id,
    reason: task.reason,
    contextKind: task.contextKind,
    text: task.text,
    groupName: task.contextKind === "family" || task.contextKind === "message" ? null : task.groupName,
    uploaderLabel: "A",
    reporterLabel: task.reporterId === null ? null : "B",
    reportCategory: task.reportCategory,
    reporterNote: task.reporterNote,
    uploaderNote: task.uploaderNote,
  };
  if (mode === "shown") view.aiLevels = task.aiLevels;
  return view;
}

/**
 * What an admin is shown about a case: media as chips only (no path, so no
 * way to load the image), the reporter as reliability numbers only — their
 * identity is behind a separate, logged click (plan §3.1).
 */
export function adminCaseView(c: CaseRecord): AdminCaseView {
  return {
    id: c.id,
    subjectUserId: c.subjectUserId,
    text: c.text,
    media: c.media.map((m) => ({ id: m.id, levels: m.levels, removed: m.removed })),
    reporter:
      c.reporterId === null
        ? null
        : { hidden: true, reportsLast30d: c.reporterReportsLast30d, dismissedRatio: c.reporterDismissedRatio },
  };
}

/** Any admin may decide a penalty appeal, the original decider included; a permanent ban needs a senior admin. */
export function canDecideAppeal(actor: StaffActor, penalty: PenaltyType): boolean {
  return staffAllowed(actor, penalty === "permanent_ban" ? "senior_admin" : "admin");
}

/** The step the system proposes for a ladder offense (plan §3.4): the top step repeats. */
export function ladderProposal(activeStrikes: number, ladder: readonly PenaltyType[]): PenaltyType {
  const step = ladder[Math.min(activeStrikes, ladder.length - 1)];
  if (step === undefined) throw new Error("ladderProposal: empty ladder");
  return step;
}

type Pause = { start: Date; end: Date };

/** Pauses sorted and merged into disjoint [start, end) millisecond windows. */
function mergedPauses(pauses: readonly Pause[]): [number, number][] {
  const sorted = pauses
    .map((p): [number, number] => [p.start.getTime(), p.end.getTime()])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/** Working milliseconds between two instants, pauses excluded. */
function workingMs(from: number, to: number, merged: readonly [number, number][]): number {
  if (to <= from) return 0;
  let paused = 0;
  for (const [s, e] of merged) paused += Math.max(0, Math.min(e, to) - Math.max(s, from));
  return to - from - paused;
}

/**
 * The SLA deadline: `minutes` of working time after `created`, skipping
 * pause windows. A task created inside a pause starts its clock at the pause's end.
 */
export function slaDue(created: Date, minutes: number, pauses: readonly Pause[]): Date {
  let cursor = created.getTime();
  let remaining = minutes * 60_000;
  for (const [s, e] of mergedPauses(pauses)) {
    if (e <= cursor) continue;
    if (s > cursor) {
      if (remaining <= s - cursor) break;
      remaining -= s - cursor;
    }
    cursor = e;
  }
  return new Date(cursor + remaining);
}

/** Late at the deadline; at risk once `atRiskRatio` of the working window has elapsed (plan §3.6). */
export function slaState(
  created: Date,
  due: Date,
  now: Date,
  pauses: readonly Pause[],
  atRiskRatio: number
): "ok" | "risk" | "late" {
  if (now.getTime() >= due.getTime()) return "late";
  const merged = mergedPauses(pauses);
  const total = workingMs(created.getTime(), due.getTime(), merged);
  const elapsed = workingMs(created.getTime(), now.getTime(), merged);
  return elapsed >= atRiskRatio * total ? "risk" : "ok";
}
