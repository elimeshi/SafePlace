import { describe, expect, it } from "vitest";
import {
  adminCaseView,
  canDecideAppeal,
  canDecideReviewTask,
  canSignReviewMedia,
  ladderProposal,
  reviewerTaskView,
  slaDue,
  slaState,
  staffAllowed,
} from "../staff";
import type { CaseRecord, PenaltyType, ReviewTaskRecord, StaffActor, StaffRole } from "../staff";

const NOW = new Date("2026-11-22T12:00:00Z");
const at = (hhmm: string) => new Date(`2026-11-22T${hhmm}:00Z`);
const min = (n: number) => n * 60_000;

function actor(overrides: Partial<StaffActor> = {}): StaffActor {
  return { userId: "rev-1", role: "reviewer", active: true, aal: "aal2", reviewEntryAcknowledged: false, ...overrides };
}

function task(overrides: Partial<ReviewTaskRecord> = {}): ReviewTaskRecord {
  return {
    id: "task-1",
    reason: "user_report",
    contextKind: "group",
    text: "post text",
    groupName: "Chesed group",
    uploaderId: "uploader-uuid-123",
    reporterId: "reporter-uuid-456",
    reportCategory: "contains_women",
    reporterNote: "please check",
    uploaderNote: null,
    aiLevels: { sex: 1, violence: 0, religion: "uncertain", addictions: 0 },
    claimedBy: "rev-1",
    claimedUntil: new Date(NOW.getTime() + min(10)),
    priorDeciders: [],
    ...overrides,
  };
}

describe("staffAllowed", () => {
  it("needs aal2", () => expect(staffAllowed(actor({ aal: "aal1" }), "reviewer")).toBe(false));
  it("needs an active account", () => expect(staffAllowed(actor({ active: false }), "reviewer")).toBe(false));
  it("ranks reviewer < admin < senior_admin", () => {
    expect(staffAllowed(actor(), "reviewer")).toBe(true);
    expect(staffAllowed(actor(), "admin")).toBe(false);
    expect(staffAllowed(actor({ role: "admin" }), "reviewer")).toBe(true);
    expect(staffAllowed(actor({ role: "admin" }), "admin")).toBe(true);
    expect(staffAllowed(actor({ role: "admin" }), "senior_admin")).toBe(false);
    for (const r of ["reviewer", "admin", "senior_admin"] as StaffRole[]) {
      expect(staffAllowed(actor({ role: "senior_admin" }), r)).toBe(true);
    }
  });
});

describe("canSignReviewMedia", () => {
  it("allows the holder of an active claim", () => expect(canSignReviewMedia(actor(), task(), NOW)).toBe(true));
  it("refuses an expired claim", () => {
    expect(canSignReviewMedia(actor(), task({ claimedUntil: new Date(NOW.getTime() - 1) }), NOW)).toBe(false);
    expect(canSignReviewMedia(actor(), task({ claimedUntil: NOW }), NOW)).toBe(false);
  });
  it("refuses someone else's claim, or no claim", () => {
    expect(canSignReviewMedia(actor(), task({ claimedBy: "rev-2" }), NOW)).toBe(false);
    expect(canSignReviewMedia(actor(), task({ claimedBy: null, claimedUntil: null }), NOW)).toBe(false);
  });
  it("refuses aal1 or a deactivated reviewer", () => {
    expect(canSignReviewMedia(actor({ aal: "aal1" }), task(), NOW)).toBe(false);
    expect(canSignReviewMedia(actor({ active: false }), task(), NOW)).toBe(false);
  });
  it("an admin needs the review-entry acknowledgement", () => {
    expect(canSignReviewMedia(actor({ role: "admin" }), task(), NOW)).toBe(false);
    expect(canSignReviewMedia(actor({ role: "admin", reviewEntryAcknowledged: true }), task(), NOW)).toBe(true);
    expect(canSignReviewMedia(actor({ role: "senior_admin" }), task(), NOW)).toBe(false);
  });
});

describe("canDecideReviewTask", () => {
  it("allows the claim holder who has not decided this media before", () => {
    expect(canDecideReviewTask(actor(), task({ priorDeciders: ["rev-9"] }), NOW)).toBe(true);
  });
  it("refuses a prior decider (two pairs of eyes)", () => {
    expect(canDecideReviewTask(actor(), task({ priorDeciders: ["rev-1"] }), NOW)).toBe(false);
  });
  it("refuses whatever canSignReviewMedia refuses", () => {
    expect(canDecideReviewTask(actor(), task({ claimedBy: "rev-2" }), NOW)).toBe(false);
  });
});

describe("reviewerTaskView", () => {
  it("never carries the uploader or reporter id, in any mode", () => {
    for (const mode of ["blind", "blind_then_feedback", "shown"] as const) {
      const json = JSON.stringify(reviewerTaskView(task(), mode));
      expect(json).not.toContain("uploader-uuid-123");
      expect(json).not.toContain("reporter-uuid-456");
      expect(json).not.toContain("uploaderId");
      expect(json).not.toContain("reporterId");
    }
  });
  it("labels the people A and B", () => {
    const v = reviewerTaskView(task(), "blind");
    expect(v.uploaderLabel).toBe("A");
    expect(v.reporterLabel).toBe("B");
    expect(reviewerTaskView(task({ reporterId: null, reason: "ai_medium_confidence" }), "blind").reporterLabel).toBeNull();
  });
  it("keeps text, reason, category and notes", () => {
    const v = reviewerTaskView(task(), "blind");
    expect(v).toMatchObject({ text: "post text", reason: "user_report", reportCategory: "contains_women", reporterNote: "please check" });
  });
  it("drops the name of a Family Space or a message thread, keeps a group's", () => {
    expect(reviewerTaskView(task(), "blind").groupName).toBe("Chesed group");
    expect(reviewerTaskView(task({ contextKind: "family", groupName: "Cohen family" }), "blind").groupName).toBeNull();
    expect(reviewerTaskView(task({ contextKind: "message", groupName: "thread" }), "blind").groupName).toBeNull();
  });
  it("includes aiLevels only in shown mode", () => {
    expect("aiLevels" in reviewerTaskView(task(), "blind")).toBe(false);
    expect("aiLevels" in reviewerTaskView(task(), "blind_then_feedback")).toBe(false);
    expect(reviewerTaskView(task(), "shown").aiLevels).toEqual(task().aiLevels);
  });
});

describe("adminCaseView", () => {
  const c: CaseRecord = {
    id: "case-1",
    subjectUserId: "subject-1",
    text: "a post",
    media: [{ id: "m1", storagePath: "media/subject-1/secret-path.jpg", levels: null, removed: true }],
    reporterId: "reporter-uuid-456",
    reporterReportsLast30d: 4,
    reporterDismissedRatio: 0.5,
    internalNote: "extra field",
  };
  it("never carries a storage path or the reporter id", () => {
    const json = JSON.stringify(adminCaseView(c));
    expect(json).not.toContain("secret-path");
    expect(json).not.toContain("storagePath");
    expect(json).not.toContain("reporter-uuid-456");
    expect(json).not.toContain("reporterId");
  });
  it("shows media as chips and the reporter as numbers", () => {
    expect(adminCaseView(c)).toEqual({
      id: "case-1",
      subjectUserId: "subject-1",
      text: "a post",
      media: [{ id: "m1", levels: null, removed: true }],
      reporter: { hidden: true, reportsLast30d: 4, dismissedRatio: 0.5 },
    });
  });
  it("reporter is null when nobody reported", () => {
    expect(adminCaseView({ ...c, reporterId: null }).reporter).toBeNull();
  });
});

describe("canDecideAppeal", () => {
  it("a permanent ban needs a senior admin", () => {
    expect(canDecideAppeal(actor({ role: "admin" }), "permanent_ban")).toBe(false);
    expect(canDecideAppeal(actor({ role: "senior_admin" }), "permanent_ban")).toBe(true);
  });
  it("anything else needs an admin", () => {
    expect(canDecideAppeal(actor({ role: "admin" }), "suspension_7d")).toBe(true);
    expect(canDecideAppeal(actor(), "warning")).toBe(false);
  });
  it("still needs aal2 and an active account", () => {
    expect(canDecideAppeal(actor({ role: "senior_admin", aal: "aal1" }), "permanent_ban")).toBe(false);
    expect(canDecideAppeal(actor({ role: "admin", active: false }), "warning")).toBe(false);
  });
});

describe("ladderProposal", () => {
  const ladder: PenaltyType[] = ["warning", "suspension_24h", "suspension_7d", "permanent_ban"];
  it("maps active strikes to the next step, capped at the top", () => {
    expect(ladderProposal(0, ladder)).toBe("warning");
    expect(ladderProposal(1, ladder)).toBe("suspension_24h");
    expect(ladderProposal(2, ladder)).toBe("suspension_7d");
    expect(ladderProposal(3, ladder)).toBe("permanent_ban");
    expect(ladderProposal(9, ladder)).toBe("permanent_ban");
  });
});

describe("slaDue", () => {
  it("adds the window when there are no pauses", () => {
    expect(slaDue(at("10:00"), 60, [])).toEqual(at("11:00"));
  });
  it("skips a pause straddling the window", () => {
    expect(slaDue(at("10:00"), 60, [{ start: at("10:30"), end: at("11:00") }])).toEqual(at("11:30"));
  });
  it("ignores pauses wholly before or after the window", () => {
    expect(slaDue(at("10:00"), 60, [{ start: at("08:00"), end: at("09:00") }, { start: at("12:00"), end: at("13:00") }])).toEqual(at("11:00"));
  });
  it("starts the clock at the pause's end when created inside it", () => {
    expect(slaDue(at("10:00"), 60, [{ start: at("09:30"), end: at("10:15") }])).toEqual(at("11:15"));
  });
  it("merges overlapping, unsorted pauses", () => {
    const pauses = [
      { start: at("10:40"), end: at("11:10") },
      { start: at("10:30"), end: at("10:50") },
    ];
    // 30 working minutes, pause 10:30–11:10, then 30 more.
    expect(slaDue(at("10:00"), 60, pauses)).toEqual(at("11:40"));
  });
});

describe("slaState", () => {
  const created = at("10:00");
  const due = at("11:00");
  it("is ok before the risk point", () => expect(slaState(created, due, at("10:30"), [], 0.75)).toBe("ok"));
  it("is at risk from the risk point", () => {
    expect(slaState(created, due, at("10:45"), [], 0.75)).toBe("risk");
    expect(slaState(created, due, at("10:59"), [], 0.75)).toBe("risk");
  });
  it("is late at and after due", () => {
    expect(slaState(created, due, at("11:00"), [], 0.75)).toBe("late");
    expect(slaState(created, due, at("12:00"), [], 0.75)).toBe("late");
  });
  it("a pause delays the risk point", () => {
    const pauses = [{ start: at("10:10"), end: at("10:40") }];
    const pausedDue = slaDue(created, 60, pauses); // 11:30
    expect(pausedDue).toEqual(at("11:30"));
    // 10:50 is 50 wall minutes in but only 20 working minutes: ok, not risk.
    expect(slaState(created, pausedDue, at("10:50"), pauses, 0.75)).toBe("ok");
    // Risk at 45 working minutes: 10:10 + 30 pause + 35 = 11:15.
    expect(slaState(created, pausedDue, at("11:14"), pauses, 0.75)).toBe("ok");
    expect(slaState(created, pausedDue, at("11:15"), pauses, 0.75)).toBe("risk");
  });
});
