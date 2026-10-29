# Classifier Cascade — implementation plan & handoff

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single "women" classification with four per-group ordinal ladders (sex / violence / religion / addictions) classified by Claude Haiku 5.5 in one call, with hash dedupe in front, Sonnet 5.5 escalation behind, and viewer-side per-group levels enforced at every layer.

**Architecture:** The `media_classification` enum stays as the lifecycle state; four nullable `*_level` columns sit beside it on `media_items`, and four `max_*_level` columns on `filter_settings` (with `hide_content_with_women` kept as a generated column so existing SQL readers do not change). `packages/visibility-policy` is the single rule; the SQL mirror is re-proved by `packages/db-testing`. The pipeline keeps the `ClassifierProvider` seam (ADR 0004): a new output shape, a new rubric, a resize + cache + refusal-aware Anthropic provider, an escalation decorator and a dedupe step in the worker.

**Tech Stack:** TypeScript strict, vitest, Supabase/Postgres (PGlite in tests), `@anthropic-ai/sdk` ^0.128 (`messages.parse` + `jsonSchemaOutputFormat`), `sharp`, pnpm + turbo.

Written 2026-10-30 at the end of the research session, for the cloud sessions that implement it. Everything in §1 was decided with Eli — do not re-litigate it. Anything not covered is an open question: ask Eli, don't guess (CLAUDE.md §3).

Authority: `docs/decisions/0018-multi-group-content-classification.md`, `docs/decisions/0019-hash-dedupe-verdict-reuse.md`, `docs/architecture/content-categories.md`.

Branch: start from `phase-4-feed` tip `4312478` (this plan's docs are committed on top of it on `worktree-classifier-cascade-plan`). Work on a branch named `classifier-cascade`.

---

## 0. State at handoff

- Pipeline today: Claude Haiku 4.5 via `services/moderation-pipeline/src/providers/anthropic.ts`, one verdict (`woman_present | no_woman | uncertain`) + confidence, projected to a probability and banded by `pipeline_config.low_max / high_min` (0.2 / 0.8). Images only (ADR 0010). Region blur built and off (ADR 0012). Classification starts on draft attach (ADR 0015).
- Suite was green at `4312478` (`pnpm turbo run typecheck lint test --force`). Hosted Supabase has every migration through `20261021100000_audit_fixes.sql` applied. DB is empty of real users.
- The worker is not deployed (ADR 0009) and needs `SUPABASE_SERVICE_ROLE_KEY` + `VISION_MODEL_API_KEY` in `services/moderation-pipeline/.env.local`.
- **Budget:** Eli's Anthropic key will carry a **$5 monthly cap**. At ~$0.12–0.18 per 1,000 images (Haiku 5.5, 768 px, cached rubric) that is ~30k images — enough for every eval run and all development. The eval harness (Task 7) refuses to run without an explicit image cap.
- **Eli never views or labels images** (religious reasons). No task in this plan asks anyone at Safe-Place to look at an image; the eval uses dataset metadata and a stronger model as reference. No nudity or gore is ever collected.

## 1. Decisions (all confirmed by Eli, 2026-10-30)

| # | Decision | Where it lands |
|---|---|---|
| a | Level 3 (nudity, gore/self-harm, idolatry/missionary) = prohibited; human review, never a viewer toggle. Levels 1–2 = viewer filters. | `resolveMediaOutcome`, `complete_classification_job`, `review_reason` |
| b | `sex` stays gender-conditioned (male 0, female 1). Violence/religion/addictions default 0 for everyone. | `DEFAULT_FILTER_SETTINGS`, `handle_new_user` |
| c | Family Spaces lift `sex` only. | `viewerSatisfiesClassification`, `visibility.levels_visible` |
| d | Addictions has no "alcohol present" level: 1 = drunkenness/smoking/cannabis, 2 = hard drugs/gambling, no 3. | `MAX_LEVEL_BY_GROUP`, rubric, `media_items` CHECK |
| e | Escalation: medium/uncertain → Claude Sonnet 5.5 before a human. Config flag. | `createEscalatingClassifier`, `pipeline_config.escalation_model_id` |
| f | Category spec lives in `docs/architecture/content-categories.md` until Eli writes product-spec text. | done |
| g | One general uploader notice card for any group ≥ 1, with a "what was found" details affordance. | `CONTENT_NOTICE_HE`, `noticeGroupsFor`, mobile notice |
| — | Layer 3 = Haiku 5.5 via API; layer 1 (dedupe) now; layer 2 (gate), self-hosting, video, blur for new groups: deferred. | `pipeline_config.model_id`, ADR 0019, §Deferred |

## 2. Still owed by Eli (does not block any task)

- Confirm female default `sex` level **1** (modest women visible). Default `1` is implemented; change one constant if he says 2.
- Hebrew product copy. Drafts are marked `DRAFT` in Task 13; ship behind them, replace when he answers.
- Product-spec entries for the three new groups (`docs/product/`), legal-tracker items 26–28.

## 3. Order of work and gates

1. **Docs (this commit).**
2. **Phase D1 — pipeline types, rubric, provider, escalation, hashes** (Tasks 1–6). Pure code behind the seam; nothing in the DB changes. Suite stays green with the stub.
3. **Phase F — eval** (Task 7). Run Haiku 5.5 on ≤ 1,000 public images (≈ $0.20). **Gate:** per-group abstain rate and agreement with reference are reported; cost per 1k confirmed. Adjust rubric/thresholds before touching the schema.
4. **Phase B — visibility-policy** (Task 8).
5. **Phase C — data tier + parity** (Tasks 9–10). **Gate:** `packages/db-testing` green, parity suites extended with levels.
6. **Phase D2 — worker + stores + handler** (Task 11).
7. **Phase E — api-client + mobile** (Tasks 12–13).
8. **Apply to hosted** (same procedure as phase-4: each migration file in its own transaction, recorded in `supabase_migrations.schema_migrations`), set `model_id = 'claude-haiku-5-5'`, run the worker on a few dev uploads, read the logs.

Each task: write the failing test → run it → implement → run → commit. Commit messages in English, conventional prefix, with the attribution trailer the session was given.

---

## 4. Tasks

### Task 1: Content-group types in `packages/visibility-policy`

**Files:**
- Modify: `packages/visibility-policy/src/types.ts`
- Modify: `packages/visibility-policy/src/index.ts` (re-export is `export * from "./types"` — verify, else add the new names)
- Test: `packages/visibility-policy/src/__tests__/content-groups.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/visibility-policy/src/__tests__/content-groups.test.ts
import { describe, expect, it } from "vitest";
import {
  CONTENT_GROUPS,
  DEFAULT_FILTER_SETTINGS,
  MAX_LEVEL_BY_GROUP,
  PROHIBITED_LEVEL,
  isContentLevels,
} from "../types";

describe("content groups", () => {
  it("lists the four groups in a stable order", () => {
    expect(CONTENT_GROUPS).toEqual(["sex", "violence", "religion", "addictions"]);
  });

  it("caps addictions at 2 and the rest at the prohibited level", () => {
    expect(MAX_LEVEL_BY_GROUP).toEqual({ sex: 3, violence: 3, religion: 3, addictions: 2 });
    expect(PROHIBITED_LEVEL).toBe(3);
  });

  it("defaults: only sex differs by gender; hideContentWithWomen mirrors sex === 0", () => {
    for (const gender of ["male", "female"] as const) {
      const s = DEFAULT_FILTER_SETTINGS[gender];
      expect(s.contentLevels.violence).toBe(0);
      expect(s.contentLevels.religion).toBe(0);
      expect(s.contentLevels.addictions).toBe(0);
      expect(s.hideContentWithWomen).toBe(s.contentLevels.sex === 0);
    }
    expect(DEFAULT_FILTER_SETTINGS.male.contentLevels.sex).toBe(0);
    expect(DEFAULT_FILTER_SETTINGS.female.contentLevels.sex).toBe(1);
  });

  it("isContentLevels accepts a full in-range record and nothing else", () => {
    expect(isContentLevels({ sex: 0, violence: 2, religion: 1, addictions: 2 })).toBe(true);
    expect(isContentLevels({ sex: 0, violence: 2, religion: 1 })).toBe(false);
    expect(isContentLevels({ sex: 0, violence: 2, religion: 1, addictions: 3 })).toBe(false);
    expect(isContentLevels(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it** — `pnpm --filter @safeplace/visibility-policy test -- content-groups` → FAIL (`CONTENT_GROUPS` not exported).

- [ ] **Step 3: Implement** — add to `types.ts` after `Gender`:

```ts
/**
 * The four classification groups (ADR 0018). Order is stable and is the order
 * every per-group structure in the product uses.
 */
export const CONTENT_GROUPS = ["sex", "violence", "religion", "addictions"] as const;
export type ContentGroup = (typeof CONTENT_GROUPS)[number];

/** A level the MODEL may report. 3 is prohibited content and never auto-publishes. */
export type ContentLevel = 0 | 1 | 2 | 3;
/** A level a VIEWER may accept. There is no viewer setting that opts into 3. */
export type ViewerMaxLevel = 0 | 1 | 2;

export const PROHIBITED_LEVEL = 3;

/** The top of each ladder. Addictions has two steps (Eli dropped "alcohol present"). */
export const MAX_LEVEL_BY_GROUP: Readonly<Record<ContentGroup, ContentLevel>> = {
  sex: 3,
  violence: 3,
  religion: 3,
  addictions: 2,
};

/** Resolved levels of one media item. NULL on the row until classified. */
export type ContentLevels = Readonly<Record<ContentGroup, ContentLevel>>;
/** The viewer's maximum accepted level per group. */
export type ViewerContentLevels = Readonly<Record<ContentGroup, ViewerMaxLevel>>;

export function isContentLevels(value: unknown): value is ContentLevels {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return CONTENT_GROUPS.every((g) => {
    const n = v[g];
    return Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_LEVEL_BY_GROUP[g];
  });
}
```

Change `FilterSettings`:

```ts
export interface FilterSettings {
  /**
   * DERIVED: equals `contentLevels.sex === 0`. Kept so existing readers keep
   * working; the DB holds it as a generated column. Never write it — write
   * `contentLevels.sex`.
   */
  hideContentWithWomen: boolean;
  /** Maximum accepted level per group (ADR 0018). */
  contentLevels: ViewerContentLevels;
  hideWomenAccounts: boolean;
  showSuggestedPosts: boolean;
  genderSeparationInMessages: boolean;
  genderSeparationInSearch: boolean;
  filterAppliesToAvatars: boolean;
}
```

And the defaults:

```ts
export const DEFAULT_FILTER_SETTINGS: Record<Gender, FilterSettings> = {
  male: {
    hideContentWithWomen: true,
    contentLevels: { sex: 0, violence: 0, religion: 0, addictions: 0 },
    hideWomenAccounts: true,
    showSuggestedPosts: true,
    genderSeparationInMessages: false,
    genderSeparationInSearch: false,
    filterAppliesToAvatars: true,
  },
  female: {
    hideContentWithWomen: false,
    // 1 = modest women visible, immodest not. Assumption carried from the old
    // boolean; Eli to confirm (open-questions-backlog.md §K).
    contentLevels: { sex: 1, violence: 0, religion: 0, addictions: 0 },
    hideWomenAccounts: false,
    showSuggestedPosts: true,
    genderSeparationInMessages: false,
    genderSeparationInSearch: false,
    filterAppliesToAvatars: false,
  },
};
```

Add `contentLevels` to every `FilterSettings` literal the typecheck now flags (rules tests, `packages/db-testing/src/seed.ts` `withFilter`, api-client fixtures, mobile fixtures). Where a fixture sets `hideContentWithWomen: X`, set `contentLevels.sex` to `X ? 0 : 1`.

- [ ] **Step 4: Run** — `pnpm turbo run typecheck test --filter=@safeplace/visibility-policy...` → PASS.
- [ ] **Step 5: Commit** — `feat(visibility): content groups, levels and per-group viewer maxima (ADR 0018)`

### Task 2: New classifier output shape and the per-group outcome

**Files:**
- Modify: `services/moderation-pipeline/src/classifier.ts`
- Modify: `services/moderation-pipeline/src/classification.ts`
- Modify: `services/moderation-pipeline/src/index.ts` (exports)
- Test: `services/moderation-pipeline/src/__tests__/classification.test.ts` (extend), `classifier.test.ts` (adjust)

- [ ] **Step 1: Failing tests** — append to `classification.test.ts`:

```ts
import { resolveMediaOutcome, groupProbabilityFrom } from "../classification";
import type { ClassifierOutput } from "../classifier";

const verdicts = (
  over: Partial<Record<"sex" | "violence" | "religion" | "addictions", { level: 0 | 1 | 2 | 3 | "uncertain"; confidence: number }>>
): ClassifierOutput => ({
  kind: "verdicts",
  groups: {
    sex: { level: 0, confidence: 0.95 },
    violence: { level: 0, confidence: 0.95 },
    religion: { level: 0, confidence: 0.95 },
    addictions: { level: 0, confidence: 0.95 },
    ...over,
  },
});

describe("groupProbabilityFrom", () => {
  it("projects level 0 below the midpoint and level >= 1 above it", () => {
    expect(groupProbabilityFrom({ level: 0, confidence: 0.9 })).toBeCloseTo(0.05);
    expect(groupProbabilityFrom({ level: 2, confidence: 0.9 })).toBeCloseTo(0.95);
    expect(groupProbabilityFrom({ level: "uncertain", confidence: 1 })).toBe(0.5);
  });
});

describe("resolveMediaOutcome", () => {
  it("all clear → general with zero levels", () => {
    const o = resolveMediaOutcome(verdicts({}), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("general");
    expect(o.levels).toEqual({ sex: 0, violence: 0, religion: 0, addictions: 0 });
    expect(o.reviewReason).toBeNull();
  });

  it("confident woman → contains_women with sex level", () => {
    const o = resolveMediaOutcome(verdicts({ sex: { level: 1, confidence: 0.9 } }), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("contains_women");
    expect(o.levels?.sex).toBe(1);
  });

  it("a confident non-sex level alone is still 'general' lifecycle with levels set", () => {
    const o = resolveMediaOutcome(verdicts({ violence: { level: 2, confidence: 0.9 } }), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("general");
    expect(o.levels?.violence).toBe(2);
  });

  it("any medium-band or uncertain group → pending_review, levels null, undecided lists it", () => {
    const o = resolveMediaOutcome(verdicts({ religion: { level: 1, confidence: 0.3 } }), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("pending_review");
    expect(o.levels).toBeNull();
    expect(o.reviewReason).toBe("ai_medium_confidence");
    expect(o.undecided).toEqual(["religion"]);
    const u = resolveMediaOutcome(verdicts({ sex: { level: "uncertain", confidence: 0 } }), DEFAULT_THRESHOLDS);
    expect(u.undecided).toEqual(["sex"]);
  });

  it("level 3 anywhere → pending_review with ai_prohibited_content, even when confident", () => {
    const o = resolveMediaOutcome(verdicts({ violence: { level: 3, confidence: 0.99 } }), DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("pending_review");
    expect(o.reviewReason).toBe("ai_prohibited_content");
    expect(o.undecided).toEqual([]);
  });

  it("a level above the group's ladder is treated as uncertain", () => {
    const o = resolveMediaOutcome(verdicts({ addictions: { level: 3, confidence: 0.99 } }), DEFAULT_THRESHOLDS);
    expect(o.undecided).toEqual(["addictions"]);
  });

  it("refusal → pending_review with ai_refusal", () => {
    const o = resolveMediaOutcome({ kind: "refused" }, DEFAULT_THRESHOLDS);
    expect(o.classification).toBe("pending_review");
    expect(o.reviewReason).toBe("ai_refusal");
    expect(o.levels).toBeNull();
  });

  it("bands match the old single-axis math: 0.6 confidence is the auto boundary", () => {
    expect(resolveMediaOutcome(verdicts({ sex: { level: 1, confidence: 0.6 } }), DEFAULT_THRESHOLDS).classification).toBe("contains_women");
    expect(resolveMediaOutcome(verdicts({ sex: { level: 1, confidence: 0.59 } }), DEFAULT_THRESHOLDS).classification).toBe("pending_review");
  });
});
```

- [ ] **Step 2: Run** — `pnpm --filter @safeplace/moderation-pipeline test -- classification` → FAIL.

- [ ] **Step 3: Implement.** `classifier.ts` — replace `ClassifierVerdict`/`ClassifierOutput` with:

```ts
import {
  CONTENT_GROUPS,
  type ContentGroup,
  type ContentLevel,
} from "@safeplace/visibility-policy";

export type { ContentGroup, ContentLevel };

/** One group's answer. 'uncertain' is a first-class answer (routes to a human). */
export interface GroupVerdict {
  level: ContentLevel | "uncertain";
  /** The model's own certainty in that level, 0..1. */
  confidence: number;
}

export type ClassifierVerdicts = Record<ContentGroup, GroupVerdict>;

/**
 * Either an answer per group, or a refusal: the model declined to describe
 * the image at all. A refusal is information ("it saw something it will not
 * talk about"), never a transport error, so it is a value here, not a throw.
 */
export type ClassifierOutput =
  | { kind: "verdicts"; groups: ClassifierVerdicts }
  | { kind: "refused" };

export const UNCERTAIN_VERDICT: GroupVerdict = { level: "uncertain", confidence: 0 };

export function allUncertain(): ClassifierOutput {
  return {
    kind: "verdicts",
    groups: Object.fromEntries(CONTENT_GROUPS.map((g) => [g, UNCERTAIN_VERDICT])) as ClassifierVerdicts,
  };
}
```

Keep `ClassifierInput` and `ClassifierProvider` unchanged. Rewrite the stub:

```ts
export interface StubClassifierOptions {
  byMediaItemId?: Record<string, ClassifierOutput>;
  /** Fallback for ids not listed. Defaults to all-uncertain (routes to a human). */
  fallback?: ClassifierOutput;
}

export function createStubClassifier(options: StubClassifierOptions = {}): ClassifierProvider {
  const fallback = options.fallback ?? allUncertain();
  return {
    name: "stub",
    classify: async ({ mediaItemId }) => options.byMediaItemId?.[mediaItemId] ?? fallback,
  };
}

/** Convenience for tests: every group 0 except the ones given. */
export function verdictsOf(
  over: Partial<ClassifierVerdicts>,
  confidence = 0.95
): ClassifierOutput {
  const groups = Object.fromEntries(
    CONTENT_GROUPS.map((g) => [g, over[g] ?? { level: 0, confidence }])
  ) as ClassifierVerdicts;
  return { kind: "verdicts", groups };
}
```

`womanProbabilityFrom(output)` stays exported (the redaction recheck uses it) and becomes `output.kind === "refused" ? 0.5 : groupProbabilityFrom(output.groups.sex)`.

`classification.ts` — add:

```ts
import {
  CONTENT_GROUPS,
  MAX_LEVEL_BY_GROUP,
  PROHIBITED_LEVEL,
  type ContentGroup,
  type ContentLevel,
  type ContentLevels,
} from "@safeplace/visibility-policy";
import type { ClassifierOutput, GroupVerdict } from "./classifier";

const UNDECIDED = 0.5;

/** Same projection the single axis used: a confident 0 sits near 0, a confident ≥1 near 1. */
export function groupProbabilityFrom(v: GroupVerdict): number {
  if (v.level === "uncertain") return UNDECIDED;
  if (!Number.isFinite(v.confidence) || v.confidence < 0 || v.confidence > 1) return UNDECIDED;
  return v.level === 0 ? UNDECIDED - v.confidence / 2 : UNDECIDED + v.confidence / 2;
}

export type ReviewReason = "ai_medium_confidence" | "ai_prohibited_content" | "ai_refusal";

export interface MediaOutcome {
  classification: MediaClassification;
  /** Resolved levels, or null whenever the item goes to a human. */
  levels: ContentLevels | null;
  reviewReason: ReviewReason | null;
  /** Groups the model could not settle — what an escalation re-asks. */
  undecided: ContentGroup[];
}

export function resolveMediaOutcome(
  output: ClassifierOutput,
  thresholds: ClassificationThresholds = DEFAULT_THRESHOLDS
): MediaOutcome {
  if (output.kind === "refused") {
    return { classification: "pending_review", levels: null, reviewReason: "ai_refusal", undecided: [] };
  }

  const resolved: Partial<Record<ContentGroup, ContentLevel>> = {};
  const undecided: ContentGroup[] = [];
  for (const g of CONTENT_GROUPS) {
    const v = output.groups[g];
    const offLadder = v.level !== "uncertain" && v.level > MAX_LEVEL_BY_GROUP[g];
    const band = offLadder ? "medium" : resolveConfidenceBand(groupProbabilityFrom(v), thresholds);
    if (v.level === "uncertain" || band === "medium") {
      undecided.push(g);
    } else {
      resolved[g] = v.level;
    }
  }

  if (undecided.length > 0) {
    return { classification: "pending_review", levels: null, reviewReason: "ai_medium_confidence", undecided };
  }
  const levels = resolved as ContentLevels;
  if (CONTENT_GROUPS.some((g) => levels[g] === PROHIBITED_LEVEL)) {
    return { classification: "pending_review", levels: null, reviewReason: "ai_prohibited_content", undecided: [] };
  }
  return {
    classification: levels.sex >= 1 ? "contains_women" : "general",
    levels,
    reviewReason: null,
    undecided: [],
  };
}
```

Leave `resolveConfidenceBand` and `resolveClassificationFromBand` in place (the redaction recheck still uses the band). Update `index.ts` exports: `GroupVerdict`, `ClassifierVerdicts`, `allUncertain`, `verdictsOf`, `groupProbabilityFrom`, `resolveMediaOutcome`, `MediaOutcome`, `ReviewReason`. Fix `classifier.test.ts` and `worker.test.ts` compile errors by using `verdictsOf(...)` where they built `{verdict, confidence}` (the worker's behaviour changes in Task 11; for now make the existing worker read `resolveMediaOutcome` so its tests keep passing — see Step 3b).

- [ ] **Step 3b: Minimal worker adaptation (keeps the suite green until Task 11).** In `worker.ts` `processJob`, replace the three lines computing `womanProbability/band/classification` with:

```ts
const outcome = resolveMediaOutcome(output, deps.thresholds);
const classification = outcome.classification;
const womanProbability = womanProbabilityFrom(output);
```

and pass `verdict: output.kind === "refused" ? "refused" : "levels"` for now (the store signature changes in Task 11). Widen `CompletedClassification.verdict` to `string`.

- [ ] **Step 4: Run** — `pnpm --filter @safeplace/moderation-pipeline test` → PASS.
- [ ] **Step 5: Commit** — `feat(moderation): per-group classifier output and media outcome (ADR 0018)`

### Task 3: The four-group rubric and output schema

**Files:**
- Modify: `services/moderation-pipeline/src/classifier-prompt.ts`
- Test: `services/moderation-pipeline/src/__tests__/classifier-prompt.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { CLASSIFIER_OUTPUT_SCHEMA, CLASSIFIER_SYSTEM_PROMPT } from "../classifier-prompt";

describe("classifier prompt", () => {
  it("is long enough to be cached on Haiku 5.5 (minimum cacheable prefix 512 tokens ≈ 2,000 chars)", () => {
    expect(CLASSIFIER_SYSTEM_PROMPT.length).toBeGreaterThan(2400);
  });
  it("asks for every group and only string-enum levels", () => {
    for (const g of ["sex", "violence", "religion", "addictions"]) {
      expect(CLASSIFIER_OUTPUT_SCHEMA.properties[g as "sex"].properties.level.enum).toContain("uncertain");
    }
    expect(CLASSIFIER_OUTPUT_SCHEMA.properties.addictions.properties.level.enum).not.toContain("3");
    expect(CLASSIFIER_OUTPUT_SCHEMA.required).toEqual(["sex", "violence", "religion", "addictions"]);
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — replace the file's prompt and schema. The `sex` definitions are the existing text, moved verbatim; keep the file's header comment (it is still "spec text, reviewed by Eli").

```ts
export const CLASSIFIER_SYSTEM_PROMPT = `You classify images for a social platform whose users each choose what kinds of content they are shown. Your only job is to report what the image contains, in four independent groups. You are not judging the image, the person who uploaded it, or anyone shown in it, and nothing you say removes or blocks anything: every answer below is a description that a viewer's own settings are compared against.

For EACH of the four groups report a level and a confidence. Levels are ordinal: report the HIGHEST level that is visibly depicted. If nothing in the group is depicted, the level is 0. If you cannot tell, the level is "uncertain" — a correct and expected answer, not a failure. A person reviews every uncertain image, so answering "uncertain" costs a little time and answering wrongly costs a user the thing they asked the platform for.

GROUP "sex" — adult women and sexual content.
  0: no adult woman is visibly depicted and nothing sexual is shown.
  1: an adult woman is visibly depicted, dressed in covering clothing. ANY visible depiction counts, however small or partial: a face, hair, a hand, an arm, a figure seen from behind, a recognisable silhouette; whether she is the subject or one person among many in the background; whether the image is a photograph, a drawing, an illustration, a cartoon, a painting, a statue, a mannequin or a doll; and when the image is a photograph of another image, a screenshot, a poster or a magazine cover.
  2: an adult woman is depicted in revealing or tight clothing, swimwear, underwear, or in a pose or framing whose purpose is to be alluring or suggestive, with no nudity.
  3: nudity (exposed breasts, buttocks or genitals of any adult), or a sexual act, explicit or implied.
  ADULTS: a clearly young child is not an adult woman. When you cannot confidently place someone on one side of adolescence, answer "uncertain" rather than guessing. Text that names a woman with no image of one is 0. An object associated with women with no person depicted is 0. For level 1 the clothing does not matter: presence is the question. Only levels 2 and 3 are about exposure.

GROUP "violence" — violence, injury and death.
  0: nothing violent is depicted.
  1: a weapon is shown (a gun, a knife as a weapon, a club) without being used; a combat sport; a mild scuffle or threatening posture; a historical or illustrated battle with no blood or injury.
  2: people fighting or attacking; visible blood; a visible injury or wound; a person being hurt; destruction aimed at people.
  3: gore (mutilation, exposed organs, large amounts of blood), a dead body or the moment of death, torture, or self-harm (cutting, hanging, suicide, or instructions for it).
  A kitchen knife used for cooking is 0. A toy weapon obviously used as a toy is 0. Sports with contact but no injury (football, boxing in a ring) are at most 1. If you cannot tell whether blood is real, answer "uncertain".

GROUP "religion" — non-Jewish religious imagery.
  0: nothing religious is depicted, or the religious content is Jewish (a synagogue, a Torah scroll, a menorah, Jewish ritual objects, Jewish religious figures).
  1: a non-Jewish religious symbol or building appears incidentally — a church or mosque in a skyline, a small cross on a necklace in a crowd, a passing religious reference on a sign.
  2: a non-Jewish religious symbol, building, ritual, clergy member or religious ceremony is a prominent or central part of the image.
  3: idolatry (worship of statues, figures or objects shown as objects of worship), missionary content (material that promotes another religion, invites conversion, or targets Jews), or content mocking or desecrating Judaism, its symbols, its texts or its rabbis.
  A generic landscape with an unidentifiable spire is 0. Art-history images of a famous church are 1 or 2 by prominence, never 3. When you cannot tell whether a symbol is religious at all, answer "uncertain".

GROUP "addictions" — alcohol abuse, smoking, drugs and gambling. This ladder has only levels 0, 1 and 2.
  0: nothing of this kind is depicted. A bottle of wine on a table, wine in a cup, beer at a meal, or a bar in the background is 0: alcohol merely present is NOT reported.
  1: visible drunkenness or intoxication; a person smoking a cigarette, cigar or pipe; vaping; cannabis (plants, joints, paraphernalia); glorification of drinking (drinking games, binge drinking).
  2: hard drugs (powders, pills presented as drugs, needles, pipes for drug use, dealing), or gambling (casinos, slot machines, card games or dice for money, betting, lottery promotion).
  A pharmacy or a prescription bottle is 0. A medical syringe in a medical setting is 0. Board games and cards with no money are 0.

WHEN YOU CANNOT TELL, for any group: if the image is too small, too blurred, too dark, or too crowded to be sure, or if a figure might or might not be what the level describes, answer "uncertain" for that group. If you find yourself between a level and "uncertain", choose "uncertain". Groups are independent: an uncertain answer in one group does not change the others.

CONFIDENCE: for each group report how certain you are of the level you gave, as a number from 0 to 1, where 1 means certain. Report your actual certainty — a confident wrong answer is the most expensive outcome here, because only low-confidence answers get a human's attention. For "uncertain" report 0.

Report every group, every time, as the JSON structure you were given. Report nothing else: no description of the image, no mention of any person in it.`;

export const CLASSIFIER_USER_INSTRUCTION =
  "Classify this image according to your instructions.";

const LEVELS_TO_3 = ["0", "1", "2", "3", "uncertain"] as const;
const LEVELS_TO_2 = ["0", "1", "2", "uncertain"] as const;

function group(levels: readonly string[], what: string) {
  return {
    type: "object",
    properties: {
      level: { type: "string", enum: [...levels], description: `Highest level visibly depicted for ${what}, or "uncertain".` },
      confidence: { type: "number", description: "Certainty in the level, from 0 to 1." },
    },
    required: ["level", "confidence"],
    additionalProperties: false,
  } as const;
}

export const CLASSIFIER_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    sex: group(LEVELS_TO_3, "adult women and sexual content"),
    violence: group(LEVELS_TO_3, "violence, injury and death"),
    religion: group(LEVELS_TO_3, "non-Jewish religious imagery"),
    addictions: group(LEVELS_TO_2, "intoxication, smoking, drugs and gambling"),
  },
  required: ["sex", "violence", "religion", "addictions"],
  additionalProperties: false,
} as const;
```

(Levels are string enums on purpose: structured outputs reject `anyOf`-style unions reliably only for enums, and the provider parses the string.)

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(moderation): four-group classification rubric and schema`

### Task 4: Anthropic provider — Haiku 5.5, resize, cached rubric, refusal, usage

**Files:**
- Modify: `services/moderation-pipeline/src/providers/anthropic.ts`
- Test: `services/moderation-pipeline/src/__tests__/anthropic-classifier.test.ts` (rewrite)

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { createAnthropicClassifier } from "../providers/anthropic";

async function png(w = 1600, h = 1200): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: "#808080" } }).png().toBuffer());
}

const ok = (groups: Record<string, { level: string; confidence: number }>) => ({
  parsed_output: groups,
  stop_reason: "end_turn",
  usage: { input_tokens: 900, cache_read_input_tokens: 800, cache_creation_input_tokens: 0, output_tokens: 60 },
});

const clear = ok({
  sex: { level: "0", confidence: 0.95 },
  violence: { level: "0", confidence: 0.95 },
  religion: { level: "1", confidence: 0.8 },
  addictions: { level: "0", confidence: 0.95 },
});

describe("createAnthropicClassifier", () => {
  it("sends a resized JPEG, the cached rubric and the schema, and parses string levels to numbers", async () => {
    const parse = vi.fn().mockResolvedValue(clear);
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "claude-haiku-5-5" });
    const out = await c.classify({ mediaItemId: "m", bytes: await png(), contentType: "image/png" });

    expect(out).toEqual({
      kind: "verdicts",
      groups: {
        sex: { level: 0, confidence: 0.95 },
        violence: { level: 0, confidence: 0.95 },
        religion: { level: 1, confidence: 0.8 },
        addictions: { level: 0, confidence: 0.95 },
      },
    });
    const params = parse.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    const image = params.messages[0].content[0].source;
    expect(image.media_type).toBe("image/jpeg");
    const meta = await sharp(Buffer.from(image.data, "base64")).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBe(768);
  });

  it("refusal → { kind: 'refused' }", async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: "refusal" });
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "m" });
    expect(await c.classify({ mediaItemId: "m", bytes: await png(10, 10), contentType: "image/png" })).toEqual({ kind: "refused" });
  });

  it("a malformed group is uncertain; the others stand", async () => {
    const parse = vi.fn().mockResolvedValue(ok({ ...clear.parsed_output, violence: { level: "7", confidence: 2 } }));
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "m" });
    const out = await c.classify({ mediaItemId: "m", bytes: await png(10, 10), contentType: "image/png" });
    expect(out.kind === "verdicts" && out.groups.violence).toEqual({ level: "uncertain", confidence: 0 });
    expect(out.kind === "verdicts" && out.groups.sex.level).toBe(0);
  });

  it("max_tokens → all uncertain; oversized bytes → all uncertain without a call", async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: "max_tokens" });
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "m", maxImageBytes: 5 });
    const out = await c.classify({ mediaItemId: "m", bytes: new Uint8Array(10), contentType: "image/png" });
    expect(parse).not.toHaveBeenCalled();
    expect(out.kind === "verdicts" && out.groups.sex.level).toBe("uncertain");
  });

  it("reports usage to the hook", async () => {
    const parse = vi.fn().mockResolvedValue(clear);
    const onUsage = vi.fn();
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "m", onUsage });
    await c.classify({ mediaItemId: "m", bytes: await png(10, 10), contentType: "image/png" });
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 900, cacheReadInputTokens: 800, cacheCreationInputTokens: 0, outputTokens: 60 });
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — rewrite `providers/anthropic.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import sharp from "sharp";
import { CONTENT_GROUPS, MAX_LEVEL_BY_GROUP } from "@safeplace/visibility-policy";
import { CLASSIFIER_OUTPUT_SCHEMA, CLASSIFIER_SYSTEM_PROMPT, CLASSIFIER_USER_INSTRUCTION } from "../classifier-prompt";
import {
  allUncertain,
  UNCERTAIN_VERDICT,
  type ClassifierInput,
  type ClassifierOutput,
  type ClassifierProvider,
  type ClassifierVerdicts,
  type GroupVerdict,
} from "../classifier";

export interface MessagesParseClient {
  messages: {
    parse(params: Record<string, unknown>): Promise<{
      parsed_output?: unknown;
      stop_reason?: string | null;
      usage?: {
        input_tokens?: number;
        cache_read_input_tokens?: number | null;
        cache_creation_input_tokens?: number | null;
        output_tokens?: number;
      };
    }>;
  };
}

export interface ClassifierUsage {
  inputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  outputTokens: number;
}

export interface AnthropicClassifierOptions {
  client: MessagesParseClient;
  /** Read from config (pipeline_config.model_id) — never hardcoded upstream. */
  modelId: string;
  /** Hard ceiling on what is read from storage. Defaults to 10 MB. */
  maxImageBytes?: number;
  /** Long edge the image is shrunk to before sending. Defaults to 768. */
  maxLongEdge?: number;
  /** Token accounting per call; the worker logs it. Never persisted with the image. */
  onUsage?: (usage: ClassifierUsage) => void;
}

const DEFAULT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_LONG_EDGE = 768;
const MAX_TOKENS = 256;

/**
 * Shrink before sending: Haiku 5.5 is a high-resolution-tier model and bills
 * ceil(w/28)*ceil(h/28) visual tokens, so a 1920x1080 phone photo costs 2,691
 * tokens unresized and ~784 at 768 px. Classification does not need the
 * pixels. If sharp cannot read the bytes, the original is sent as-is.
 */
async function prepareImage(
  bytes: Uint8Array,
  contentType: string,
  maxLongEdge: number
): Promise<{ data: string; mediaType: string }> {
  try {
    const out = await sharp(Buffer.from(bytes), { animated: false })
      .rotate()
      .resize({ width: maxLongEdge, height: maxLongEdge, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { data: out.toString("base64"), mediaType: "image/jpeg" };
  } catch {
    return { data: Buffer.from(bytes).toString("base64"), mediaType: contentType };
  }
}

function readGroup(raw: unknown, group: (typeof CONTENT_GROUPS)[number]): GroupVerdict {
  if (raw === null || typeof raw !== "object") return UNCERTAIN_VERDICT;
  const { level, confidence } = raw as { level?: unknown; confidence?: unknown };
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return UNCERTAIN_VERDICT;
  }
  if (level === "uncertain") return { level: "uncertain", confidence: 0 };
  const n = typeof level === "string" ? Number(level) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > MAX_LEVEL_BY_GROUP[group]) return UNCERTAIN_VERDICT;
  return { level: n as 0 | 1 | 2 | 3, confidence };
}

export function readOutput(parsed: unknown): ClassifierOutput {
  if (parsed === null || typeof parsed !== "object") return allUncertain();
  const groups = Object.fromEntries(
    CONTENT_GROUPS.map((g) => [g, readGroup((parsed as Record<string, unknown>)[g], g)])
  ) as ClassifierVerdicts;
  return { kind: "verdicts", groups };
}

export function createAnthropicClassifier(options: AnthropicClassifierOptions): ClassifierProvider {
  const maxImageBytes = options.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const maxLongEdge = options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;

  return {
    name: "anthropic",

    async classify(input: ClassifierInput): Promise<ClassifierOutput> {
      if (input.bytes.byteLength > maxImageBytes) return allUncertain();

      const image = await prepareImage(input.bytes, input.contentType, maxLongEdge);

      // Transport failures are NOT caught: nothing was decided, the worker retries.
      const response = await options.client.messages.parse({
        model: options.modelId,
        max_tokens: MAX_TOKENS,
        // Cached: the rubric is the same bytes on every call and is > 512 tokens,
        // Haiku 5.5's minimum cacheable prefix.
        system: [{ type: "text", text: CLASSIFIER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
              { type: "text", text: CLASSIFIER_USER_INSTRUCTION },
            ],
          },
        ],
        output_config: { effort: "low", format: jsonSchemaOutputFormat(CLASSIFIER_OUTPUT_SCHEMA) },
      });

      if (response.usage && options.onUsage) {
        options.onUsage({
          inputTokens: response.usage.input_tokens ?? 0,
          cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
          cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
          outputTokens: response.usage.output_tokens ?? 0,
        });
      }

      // A refusal is a verdict of its own kind (ADR 0018 §5): the model saw
      // something it would not describe. A human looks; it is never retried.
      if (response.stop_reason === "refusal") return { kind: "refused" };
      if (response.stop_reason === "max_tokens") return allUncertain();
      return readOutput(response.parsed_output ?? null);
    },
  };
}

export interface AnthropicClassifierEnvOptions {
  apiKey: string;
  modelId: string;
  maxImageBytes?: number;
  onUsage?: (usage: ClassifierUsage) => void;
}

export function createAnthropicClassifierFromConfig(options: AnthropicClassifierEnvOptions): ClassifierProvider {
  const client = new Anthropic({ apiKey: options.apiKey });
  return createAnthropicClassifier({
    client: client as unknown as MessagesParseClient,
    modelId: options.modelId,
    maxImageBytes: options.maxImageBytes,
    onUsage: options.onUsage,
  });
}
```

Note `effort: "low"` inside `output_config`: Haiku 5.5 defaults to `medium`; classification is a low-effort route (see the claude-api skill's effort guidance). If the SDK's `parse` types reject `effort` at this version, pass it through the same params object untyped — it is a documented GA field.

- [ ] **Step 4: Run** → PASS. Also run the localizer test; it is untouched. **Step 5: Commit** — `feat(moderation): Haiku 5.5 provider — resize to 768px, cached rubric, refusal as verdict, usage hook`

### Task 5: Escalation decorator

**Files:**
- Create: `services/moderation-pipeline/src/providers/escalating.ts`
- Test: `services/moderation-pipeline/src/__tests__/escalating.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_THRESHOLDS } from "../classification";
import { createStubClassifier, verdictsOf } from "../classifier";
import { createEscalatingClassifier } from "../providers/escalating";

const input = { mediaItemId: "m", bytes: new Uint8Array([1]), contentType: "image/jpeg" };

describe("createEscalatingClassifier", () => {
  it("returns the primary answer untouched when every group is settled", async () => {
    const primary = createStubClassifier({ fallback: verdictsOf({ sex: { level: 1, confidence: 0.9 } }) });
    const secondary = { name: "sonnet", classify: vi.fn() };
    const c = createEscalatingClassifier({ primary, secondary, thresholds: DEFAULT_THRESHOLDS });
    const out = await c.classify(input);
    expect(secondary.classify).not.toHaveBeenCalled();
    expect(out.kind === "verdicts" && out.groups.sex.level).toBe(1);
  });

  it("re-asks only the undecided groups and merges the second answer in", async () => {
    const primary = createStubClassifier({
      fallback: verdictsOf({ religion: { level: "uncertain", confidence: 0 }, violence: { level: 1, confidence: 0.3 } }),
    });
    const secondary = createStubClassifier({
      fallback: verdictsOf({ religion: { level: 2, confidence: 0.9 }, violence: { level: 0, confidence: 0.9 }, sex: { level: 1, confidence: 0.9 } }),
    });
    const onEscalate = vi.fn();
    const c = createEscalatingClassifier({ primary, secondary, thresholds: DEFAULT_THRESHOLDS, onEscalate });
    const out = await c.classify(input);
    expect(onEscalate).toHaveBeenCalledWith({ mediaItemId: "m", groups: ["violence", "religion"] });
    expect(out.kind === "verdicts" && out.groups).toMatchObject({
      sex: { level: 0 },        // primary's settled answer wins over secondary's
      violence: { level: 0, confidence: 0.9 },
      religion: { level: 2, confidence: 0.9 },
    });
  });

  it("a refusal from either model is returned as-is", async () => {
    const primary = createStubClassifier({ fallback: { kind: "refused" } });
    const secondary = { name: "s", classify: vi.fn() };
    const c = createEscalatingClassifier({ primary, secondary, thresholds: DEFAULT_THRESHOLDS });
    expect(await c.classify(input)).toEqual({ kind: "refused" });
    expect(secondary.classify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**

```ts
// services/moderation-pipeline/src/providers/escalating.ts
/**
 * Escalation tier (ADR 0018 §6): what the first model could not settle is
 * asked again of a stronger one, before a human is asked. Only the undecided
 * groups are taken from the second answer; a settled answer is never
 * overturned by escalation — that is what the review queue is for.
 */
import { resolveMediaOutcome, type ClassificationThresholds } from "../classification";
import type { ClassifierInput, ClassifierOutput, ClassifierProvider, ContentGroup } from "../classifier";

export interface EscalatingClassifierOptions {
  primary: ClassifierProvider;
  secondary: ClassifierProvider;
  thresholds: ClassificationThresholds;
  onEscalate?: (event: { mediaItemId: string; groups: ContentGroup[] }) => void;
}

export function createEscalatingClassifier(options: EscalatingClassifierOptions): ClassifierProvider {
  return {
    name: `${options.primary.name}+${options.secondary.name}`,

    async classify(input: ClassifierInput): Promise<ClassifierOutput> {
      const first = await options.primary.classify(input);
      if (first.kind === "refused") return first;

      const { undecided } = resolveMediaOutcome(first, options.thresholds);
      if (undecided.length === 0) return first;

      options.onEscalate?.({ mediaItemId: input.mediaItemId, groups: undecided });
      const second = await options.secondary.classify(input);
      if (second.kind === "refused") return second;

      const groups = { ...first.groups };
      for (const g of undecided) groups[g] = second.groups[g];
      return { kind: "verdicts", groups };
    },
  };
}
```

Export from `index.ts`. **Step 4: Run** → PASS. **Step 5: Commit** — `feat(moderation): escalation tier re-asks undecided groups of a stronger model`

### Task 6: Hashes for dedupe (ADR 0019)

**Files:**
- Create: `services/moderation-pipeline/src/hashes.ts`
- Test: `services/moderation-pipeline/src/__tests__/hashes.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { dhashHex, sha256Hex } from "../hashes";

const gradient = async (format: "png" | "jpeg") => {
  // 64x64 left-to-right ramp: deterministic, non-trivial dHash.
  const raw = Buffer.alloc(64 * 64 * 3);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) raw.fill(x * 4, (y * 64 + x) * 3, (y * 64 + x) * 3 + 3);
  const s = sharp(raw, { raw: { width: 64, height: 64, channels: 3 } });
  return new Uint8Array(await (format === "png" ? s.png() : s.jpeg({ quality: 90 })).toBuffer());
};

describe("hashes", () => {
  it("sha256 is the hex digest of the bytes", () => {
    expect(sha256Hex(new Uint8Array([]))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
  it("dHash is 16 hex chars, equal for PNG and JPEG encodings of the same pixels", async () => {
    const a = await dhashHex(await gradient("png"));
    const b = await dhashHex(await gradient("jpeg"));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).toBe(b);
    expect(a).toBe("ffffffffffffffff"); // every pixel brighter than its left neighbour
  });
  it("dHash is null for bytes sharp cannot decode", async () => {
    expect(await dhashHex(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**

```ts
// services/moderation-pipeline/src/hashes.ts
import { createHash } from "node:crypto";
import sharp from "sharp";

export interface MediaHashes {
  sha256: string;
  /** 64-bit difference hash as 16 hex chars; null when the bytes do not decode. */
  dhash: string | null;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * dHash: grayscale, 9x8, each bit = "pixel brighter than its left neighbour".
 * Survives re-encoding and EXIF rotation (sharp applies orientation), which is
 * what a re-uploaded screenshot or forwarded photo looks like. Equality only —
 * no distance search (ADR 0019).
 */
export async function dhashHex(bytes: Uint8Array): Promise<string | null> {
  try {
    const px = await sharp(Buffer.from(bytes), { animated: false })
      .rotate()
      .grayscale()
      .resize(9, 8, { fit: "fill" })
      .raw()
      .toBuffer();
    let bits = 0n;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        bits = (bits << 1n) | (px[r * 9 + c + 1] > px[r * 9 + c] ? 1n : 0n);
      }
    }
    return bits.toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}

export async function hashMedia(bytes: Uint8Array): Promise<MediaHashes> {
  return { sha256: sha256Hex(bytes), dhash: await dhashHex(bytes) };
}
```

**Step 4: Run** → PASS. **Step 5: Commit** — `feat(moderation): sha256 + dHash for verdict dedupe (ADR 0019)`

### Task 7: Eval harness (Phase F) — run before any schema work

**Files:**
- Create: `services/moderation-pipeline/eval/README.md`, `eval/run.ts`, `eval/manifest.csv` (built by the session), `eval/.gitignore` (`results*.jsonl`, `cache/`)
- Modify: `services/moderation-pipeline/package.json` (script `"eval": "tsx eval/run.ts"`, dev dep `tsx` if absent)

**Rules for building `manifest.csv`** (columns `id,url,source,license,group,expected`; `expected` is `0`, `1`, `2` or `1+`):
- Only datasets with explicit licences; record the licence per row. Candidates: FairFace (CC BY 4.0; `gender` + `age` fields → `sex` `1+` for adult female faces, `0` for adult male), COCO val2017 (images without `person` → `sex 0`, and generally `violence 0`), Open Images V7 (CC BY 2.0 images; verify exact label names in `oidv7-class-descriptions-boxable.csv` for Church, Mosque, Cross, Wine, Beer, Cigarette, Knife, Handgun, Rifle). Nothing for level 3 of any group; nothing for `sex 2`/`violence 2` from the web. Those are measured later in shadow mode through the review queue, by decision.
- ≥ 100 rows per `(group, expected)` cell where a source exists; total ≤ 1,000 for the first run.
- Nobody views an image. The session assembles rows from metadata only.
- Reference labels for ladder levels where the dataset gives only presence: a second run with `EVAL_MODEL_ID=claude-sonnet-5-5` writes `results-reference.jsonl`; `run.ts --compare results-haiku.jsonl results-reference.jsonl` reports agreement per group.

- [ ] **Step 1: `run.ts`** (complete):

```ts
// services/moderation-pipeline/eval/run.ts
// Usage: VISION_MODEL_API_KEY=... EVAL_MAX_IMAGES=500 pnpm --filter @safeplace/moderation-pipeline eval
//        pnpm ... eval -- --compare results-haiku.jsonl results-reference.jsonl
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { createAnthropicClassifierFromConfig } from "../src/providers/anthropic";
import { resolveMediaOutcome, DEFAULT_THRESHOLDS } from "../src/classification";
import { CONTENT_GROUPS } from "@safeplace/visibility-policy";

// Anthropic pricing page, 2026-10-30, per million tokens, prompts ≤ 100k.
const PRICE = { "claude-haiku-5-5": { in: 0.10, cacheRead: 0.01, cacheWrite: 0.125, out: 0.50 },
                "claude-sonnet-5-5": { in: 2.00, cacheRead: 0.10, cacheWrite: 2.50, out: 10.00 } } as const;

interface Row { id: string; url: string; source: string; license: string; group: string; expected: string }
interface Result { id: string; group: string; expected: string; level: number | "uncertain" | "refused"; confidence: number; outcome: string; usd: number }

function parseManifest(path: string): Row[] {
  const [header, ...lines] = readFileSync(path, "utf8").trim().split("\n");
  const cols = header.split(",");
  return lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])) as unknown as Row);
}

function matches(expected: string, level: number | "uncertain" | "refused"): boolean | null {
  if (level === "uncertain" || level === "refused") return null;
  return expected === "1+" ? level >= 1 : level === Number(expected);
}

function report(results: Result[]): void {
  for (const g of CONTENT_GROUPS) {
    const rs = results.filter((r) => r.group === g);
    if (rs.length === 0) continue;
    const abstain = rs.filter((r) => r.level === "uncertain" || r.level === "refused").length;
    const judged = rs.filter((r) => matches(r.expected, r.level) !== null);
    const right = judged.filter((r) => matches(r.expected, r.level)).length;
    console.log(`${g}: n=${rs.length} abstain=${(100 * abstain / rs.length).toFixed(1)}% agreement=${judged.length ? (100 * right / judged.length).toFixed(1) : "n/a"}% (${right}/${judged.length})`);
    const byCell = new Map<string, number>();
    for (const r of rs) byCell.set(`${r.expected}→${r.level}`, (byCell.get(`${r.expected}→${r.level}`) ?? 0) + 1);
    console.log("  " + [...byCell.entries()].sort().map(([k, v]) => `${k}:${v}`).join("  "));
  }
  const usd = results.reduce((s, r) => s + r.usd, 0);
  const n = new Set(results.map((r) => r.id)).size;
  console.log(`images=${n} cost=$${usd.toFixed(4)} per-1k=$${((usd / Math.max(n, 1)) * 1000).toFixed(3)}`);
}

function compare(a: string, b: string): void {
  const load = (p: string) => new Map(readFileSync(p, "utf8").trim().split("\n").map((l) => { const r = JSON.parse(l) as Result; return [`${r.id}/${r.group}`, r]; }));
  const A = load(a), B = load(b);
  for (const g of CONTENT_GROUPS) {
    let both = 0, agree = 0;
    for (const [k, ra] of A) {
      const rb = B.get(k);
      if (!rb || ra.group !== g || typeof ra.level !== "number" || typeof rb.level !== "number") continue;
      both++; if (ra.level === rb.level) agree++;
    }
    console.log(`${g}: agreement with reference ${both ? (100 * agree / both).toFixed(1) : "n/a"}% (${agree}/${both})`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] === "--compare") return compare(argv[1], argv[2]);

  const apiKey = process.env.VISION_MODEL_API_KEY;
  const max = Number(process.env.EVAL_MAX_IMAGES);
  const modelId = (process.env.EVAL_MODEL_ID ?? "claude-haiku-5-5") as keyof typeof PRICE;
  if (!apiKey) throw new Error("VISION_MODEL_API_KEY is required");
  if (!Number.isInteger(max) || max <= 0) throw new Error("EVAL_MAX_IMAGES must be a positive integer — this is the spend cap");
  const price = PRICE[modelId];
  if (!price) throw new Error(`no price table for ${modelId}`);

  const out = `eval/results-${modelId}.jsonl`;
  const done = new Set(existsSync(out) ? readFileSync(out, "utf8").trim().split("\n").filter(Boolean).map((l) => (JSON.parse(l) as Result).id) : []);
  let usd = 0;
  const provider = createAnthropicClassifierFromConfig({
    apiKey, modelId,
    onUsage: (u) => { usd = (u.inputTokens * price.in + u.cacheReadInputTokens * price.cacheRead + u.cacheCreationInputTokens * price.cacheWrite + u.outputTokens * price.out) / 1e6; },
  });

  const rows = parseManifest("eval/manifest.csv");
  const byImage = new Map<string, Row[]>();
  for (const r of rows) byImage.set(r.id, [...(byImage.get(r.id) ?? []), r]);

  let n = 0;
  const results: Result[] = [];
  for (const [id, labels] of byImage) {
    if (done.has(id)) continue;
    if (n >= max) break;
    n++;
    const res = await fetch(labels[0].url);
    if (!res.ok) { console.warn(`skip ${id}: HTTP ${res.status}`); continue; }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    usd = 0;
    const output = await provider.classify({ mediaItemId: id, bytes, contentType });
    const outcome = resolveMediaOutcome(output, DEFAULT_THRESHOLDS);
    for (const label of labels) {
      const g = label.group as (typeof CONTENT_GROUPS)[number];
      const v = output.kind === "refused" ? { level: "refused" as const, confidence: 0 } : output.groups[g];
      const r: Result = { id, group: g, expected: label.expected, level: v.level, confidence: v.confidence, outcome: outcome.classification, usd: usd / labels.length };
      results.push(r);
      appendFileSync(out, JSON.stringify(r) + "\n");
    }
  }
  report(results);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Build the manifest** per the rules above; commit it (URLs and labels only).
- [ ] **Step 3: Pilot** — `EVAL_MAX_IMAGES=50`. Check the printed cost per 1k is in the $0.12–0.25 range and `cache_read` is non-zero from the second image (if `per-1k` is ≈ 2× expected, the rubric is not caching — check its length and that `system` is the array form).
- [ ] **Step 4: Full run** — `EVAL_MAX_IMAGES=1000`, then the Sonnet reference run on the same manifest with `EVAL_MAX_IMAGES=300`, then `--compare`.
- [ ] **Step 5: Record** results in this file's Progress log (numbers only, no images, no URLs of flagged items). Adjust rubric wording or `low_max/high_min` if the abstain rate on clearly-labelled cells is > 15 %. Commit — `chore(moderation): eval harness and first Haiku 5.5 measurement`

### Task 8: Visibility rules on levels (Phase B)

**Files:**
- Modify: `packages/visibility-policy/src/types.ts` (`MediaItemContext.levels`), `rules.ts`
- Test: `packages/visibility-policy/src/__tests__/rules.test.ts` (extend), new `uploader-state.test.ts`

- [ ] **Step 1: Failing tests** (append to `rules.test.ts`; reuse the file's existing `viewer(...)` / `media(...)` builders, adding `levels` and `contentLevels`):

```ts
describe("per-group levels (ADR 0018)", () => {
  const lv = (over: Partial<ContentLevels> = {}): ContentLevels => ({ sex: 0, violence: 0, religion: 0, addictions: 0, ...over });

  it("withholds a resolved item whose levels are null (fail closed)", () => {
    expect(viewerSatisfiesClassification(viewer(), { classification: "general", levels: null }, false)).toBe(false);
  });
  it("a level above the viewer's maximum withholds; at or below shows", () => {
    const v = viewer({ contentLevels: { sex: 0, violence: 1, religion: 0, addictions: 0 } });
    expect(viewerSatisfiesClassification(v, { classification: "general", levels: lv({ violence: 1 }) }, false)).toBe(true);
    expect(viewerSatisfiesClassification(v, { classification: "general", levels: lv({ violence: 2 }) }, false)).toBe(false);
  });
  it("contains_women is the sex axis: hidden at max 0, shown at max 1", () => {
    const m = { classification: "contains_women" as const, levels: lv({ sex: 1 }) };
    expect(viewerSatisfiesClassification(viewer({ contentLevels: { sex: 0, violence: 0, religion: 0, addictions: 0 } }), m, false)).toBe(false);
    expect(viewerSatisfiesClassification(viewer({ contentLevels: { sex: 1, violence: 0, religion: 0, addictions: 0 } }), m, false)).toBe(true);
  });
  it("a Family Space lifts sex only", () => {
    const v = viewer({ contentLevels: { sex: 0, violence: 0, religion: 0, addictions: 0 } });
    expect(viewerSatisfiesClassification(v, { classification: "contains_women", levels: lv({ sex: 2 }) }, true)).toBe(true);
    expect(viewerSatisfiesClassification(v, { classification: "general", levels: lv({ violence: 1 }) }, true)).toBe(false);
  });
  it("pending_review and unclassified stay withheld whatever the levels", () => {
    expect(viewerSatisfiesClassification(viewer(), { classification: "pending_review", levels: lv() }, true)).toBe(false);
    expect(viewerSatisfiesClassification(viewer(), { classification: "unclassified", levels: null }, true)).toBe(false);
  });
});
```

`uploader-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { noticeGroupsFor, resolveUploaderMediaState } from "../rules";

const lv = (o: Partial<Record<"sex" | "violence" | "religion" | "addictions", 0 | 1 | 2 | 3>> = {}) =>
  ({ sex: 0, violence: 0, religion: 0, addictions: 0, ...o });

describe("uploader notice (ADR 0018 §7)", () => {
  it("names every group at level ≥ 1; sex only for a male uploader (master spec §4.4.2 ⏳ preserved)", () => {
    expect(noticeGroupsFor(lv({ sex: 1, violence: 2 }), "male")).toEqual(["sex", "violence"]);
    expect(noticeGroupsFor(lv({ sex: 1, violence: 2 }), "female")).toEqual(["violence"]);
    expect(noticeGroupsFor(lv(), "male")).toEqual([]);
    expect(noticeGroupsFor(null, "male")).toEqual([]);
  });
  it("state is filtered_for_some_viewers exactly when the notice has groups", () => {
    expect(resolveUploaderMediaState("general", lv({ religion: 1 }), "female")).toBe("filtered_for_some_viewers");
    expect(resolveUploaderMediaState("contains_women", lv({ sex: 1 }), "female")).toBe("published");
    expect(resolveUploaderMediaState("contains_women", lv({ sex: 1 }), "male")).toBe("filtered_for_some_viewers");
    expect(resolveUploaderMediaState("pending_review", null, "male")).toBe("under_review");
    expect(resolveUploaderMediaState("unclassified", null, "male")).toBe("processing");
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** In `types.ts` add to `MediaItemContext`:

```ts
  /** Resolved per-group levels; null until classified (and null ⇒ withheld). */
  levels: ContentLevels | null;
```

In `rules.ts` replace `viewerSatisfiesClassification`:

```ts
export function viewerSatisfiesClassification(
  viewer: Viewer,
  media: { classification: MediaClassification; levels: ContentLevels | null },
  isWithinViewersFamilySpace: boolean
): boolean {
  switch (media.classification) {
    case "unclassified":
    case "pending_review":
      // Fail CLOSED: nothing is known, or a human has not decided. No viewer
      // setting can opt into either, and a Family Space does not lift it.
      return false;
    case "general":
    case "contains_women":
      break;
  }
  // A resolved row always carries levels (DB CHECK); a null here is a defect
  // upstream and is withheld rather than guessed at.
  if (media.levels === null) return false;

  const max = viewer.filterSettings.contentLevels;
  for (const g of CONTENT_GROUPS) {
    // The Family Space exception is about modesty between relatives (invariant
    // #6, ADR 0018 §4). It lifts the sex group and nothing else.
    if (g === "sex" && isWithinViewersFamilySpace) continue;
    if (media.levels[g] > max[g]) return false;
  }
  return true;
}
```

Update `canViewMedia` to pass `media` (it already has `classification` and now `levels`), and `canViewProfilePhoto` to take `photo: { classification; levels: ContentLevels | null; ownerId }`. Replace the uploader section:

```ts
/**
 * Which groups the uploader is told about. Every group at level ≥ 1 — except
 * that `sex` is reported to a male uploader only: master spec §4.4.2 carries an
 * explicit ⏳ over whether a woman uploading content containing women should be
 * told, and an open question is not answered in code. Single place to change.
 */
export function noticeGroupsFor(levels: ContentLevels | null, uploaderGender: Gender): ContentGroup[] {
  if (levels === null) return [];
  return CONTENT_GROUPS.filter((g) => levels[g] >= 1 && (g !== "sex" || uploaderGender === "male"));
}

export function resolveUploaderMediaState(
  classification: MediaClassification,
  levels: ContentLevels | null,
  uploaderGender: Gender
): UploaderMediaState {
  switch (classification) {
    case "unclassified":
      return "processing";
    case "pending_review":
      return "under_review";
    case "general":
    case "contains_women":
      return noticeGroupsFor(levels, uploaderGender).length > 0 ? "filtered_for_some_viewers" : "published";
  }
}
```

Delete `shouldShowWomenDetectedNotice` (its single caller was `resolveUploaderMediaState`; `noticeGroupsFor` carries the same gender rule and comment). Fix compile errors in `packages/db-testing/src/expected.ts` (pass `levels` from the fixture) and `packages/api-client` (Task 12 does the real change; for now thread `levels: null`).

- [ ] **Step 4: Run** `pnpm turbo run typecheck test --filter=@safeplace/visibility-policy` → PASS. **Step 5: Commit** — `feat(visibility): per-group level rules, Family Space lifts sex only, notice groups`

### Task 9: Data tier (Phase C) — two migrations

**Files:**
- Create: `supabase/migrations/20261030100000_review_reasons.sql`
- Create: `supabase/migrations/20261030100100_content_levels.sql`

Two files because `alter type … add value` cannot be used in the same transaction that adds it, and each file is applied in its own transaction.

- [ ] **Step 1: `20261030100000_review_reasons.sql`**

```sql
-- ============================================================================
-- Review reasons for multi-group classification (ADR 0018). Separate file: an
-- enum value added in a transaction cannot be used until it commits, and the
-- next migration uses both.
-- ============================================================================
alter type moderation.review_reason add value if not exists 'ai_prohibited_content'; -- a level-3 answer
alter type moderation.review_reason add value if not exists 'ai_refusal';            -- the model would not describe the image
```

- [ ] **Step 2: `20261030100100_content_levels.sql`** — complete:

```sql
-- ============================================================================
-- Content levels (ADR 0018) + dedupe hashes (ADR 0019)
--
-- The lifecycle enum stays. Four nullable level columns sit beside it; a
-- resolved row (general / contains_women) always carries all four, and a row
-- never carries a 3 (prohibited content is a review-queue matter, never a
-- published level). Viewer maxima live on filter_settings, 0..2.
-- hide_content_with_women becomes GENERATED from max_sex_level so every SQL
-- reader of it (viewer_hides_women, the parity suite) keeps working unchanged.
-- ============================================================================

-- --- media_items ------------------------------------------------------------
alter table public.media_items
  add column sex_level        smallint check (sex_level        between 0 and 2),
  add column violence_level   smallint check (violence_level   between 0 and 2),
  add column religion_level   smallint check (religion_level   between 0 and 2),
  add column addictions_level smallint check (addictions_level between 0 and 2),
  add column content_sha256   text,
  add column content_dhash    text;

-- Legacy resolved rows: the only thing known about them is the women axis.
update public.media_items
   set sex_level = case classification when 'contains_women' then 1 else 0 end,
       violence_level = 0, religion_level = 0, addictions_level = 0
 where classification in ('general', 'contains_women');

alter table public.media_items add constraint media_levels_match_lifecycle check (
  (classification in ('general', 'contains_women'))
    = (sex_level is not null and violence_level is not null
       and religion_level is not null and addictions_level is not null)
  and (classification <> 'contains_women' or sex_level >= 1)
  and (classification <> 'general' or sex_level = 0)
);

create index idx_media_sha256 on public.media_items (content_sha256) where content_sha256 is not null;
create index idx_media_dhash  on public.media_items (content_dhash)  where content_dhash  is not null;

comment on column public.media_items.sex_level is
  'Resolved level per docs/architecture/content-categories.md; NULL until classified. Never 3.';

-- --- filter_settings --------------------------------------------------------
alter table public.filter_settings
  add column max_sex_level        smallint not null default 0 check (max_sex_level        between 0 and 2),
  add column max_violence_level   smallint not null default 0 check (max_violence_level   between 0 and 2),
  add column max_religion_level   smallint not null default 0 check (max_religion_level   between 0 and 2),
  add column max_addictions_level smallint not null default 0 check (max_addictions_level between 0 and 2);

update public.filter_settings
   set max_sex_level = case when hide_content_with_women then 0 else 1 end;

-- Dependent views on hide_content_with_women block the drop; list them with
--   select dependent view names from pg_depend joined to pg_rewrite for this column
-- and re-create each after the generated column exists. As of 4312478 there are none.
alter table public.filter_settings drop column hide_content_with_women;
alter table public.filter_settings
  add column hide_content_with_women boolean generated always as (max_sex_level = 0) stored;

-- Signup defaults (mirror of DEFAULT_FILTER_SETTINGS.contentLevels; parity test
-- in db-testing/auth-defaults). Copy the body of public.handle_new_user from
-- 20260711000005_auth_defaults.sql:18-58 verbatim and replace only the
-- filter_settings insert with:
--
--   insert into public.filter_settings (
--     user_id, max_sex_level, hide_women_accounts, filter_applies_to_avatars
--   ) values (
--     new.id,
--     case when declared_gender = 'male' then 0 else 1 end,
--     declared_gender = 'male',
--     declared_gender = 'male'
--   );
--
-- (the three max_*_level columns for the new groups take their default 0 for
-- everyone — decision (b)).
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
  -- <paste body here, with the insert above>
$$;

-- --- pipeline config --------------------------------------------------------
alter table moderation.pipeline_config
  alter column model_id set default 'claude-haiku-5-5',
  add column escalation_model_id text;  -- NULL = escalation off (ADR 0018 §6)
update moderation.pipeline_config set model_id = 'claude-haiku-5-5' where model_id = 'claude-haiku-4-5';

-- --- scores + review queue --------------------------------------------------
alter table moderation.classification_scores add column levels jsonb;
alter table moderation.review_queue add column ai_levels jsonb;
comment on column moderation.review_queue.ai_levels is
  'The model''s per-group answer for an AI-raised item, so a moderator sees what was found and where.';

-- --- completing a job: new signature ---------------------------------------
drop function moderation.complete_classification_job(uuid, public.media_classification, text, text, text, numeric, numeric);

create function moderation.complete_classification_job(
  p_media_item_id uuid,
  p_classification public.media_classification,
  p_provider text,
  p_model_id text,
  p_verdict text,
  p_confidence numeric,
  p_woman_probability numeric,
  p_levels jsonb,                                   -- resolved levels, or NULL when pending
  p_review_reason moderation.review_reason default null,
  p_ai_levels jsonb default null,                   -- the raw per-group answer, for the queue
  p_content_sha256 text default null,
  p_content_dhash text default null
) returns void language plpgsql set search_path = '' as $$
declare
  v_transitioned integer;
begin
  update moderation.classification_jobs
     set state = 'done', locked_at = null, locked_by = null, last_error = null, updated_at = now()
   where media_item_id = p_media_item_id and state <> 'done';
  get diagnostics v_transitioned = row_count;
  if v_transitioned = 0 then
    return;  -- already completed; a replay must not re-decide anything
  end if;

  if p_classification in ('general', 'contains_women') and p_levels is null then
    raise exception 'a resolved classification must carry levels';
  end if;

  -- Only ever moves an item OUT of 'unclassified'; never overwrites a moderator.
  update public.media_items
     set classification   = p_classification,
         classified_at    = now(),
         sex_level        = (p_levels->>'sex')::smallint,
         violence_level   = (p_levels->>'violence')::smallint,
         religion_level   = (p_levels->>'religion')::smallint,
         addictions_level = (p_levels->>'addictions')::smallint,
         content_sha256   = coalesce(p_content_sha256, content_sha256),
         content_dhash    = coalesce(p_content_dhash, content_dhash)
   where id = p_media_item_id and classification = 'unclassified';

  insert into moderation.classification_scores (
    media_item_id, provider, model_id, verdict, confidence, woman_probability, resolved_classification, levels
  ) values (
    p_media_item_id, p_provider, p_model_id, p_verdict, p_confidence, p_woman_probability, p_classification,
    coalesce(p_levels, p_ai_levels)
  );

  if p_classification = 'pending_review' then
    insert into moderation.review_queue (media_item_id, reason, ai_levels, post_id, comment_id, message_id, subject_user_id)
    select p_media_item_id, coalesce(p_review_reason, 'ai_medium_confidence'), p_ai_levels,
           m.post_id, m.comment_id, m.message_id, m.uploader_id
      from public.media_items m where m.id = p_media_item_id
    on conflict do nothing;
  end if;
end;
$$;
grant execute on function moderation.complete_classification_job(uuid, public.media_classification, text, text, text, numeric, numeric, jsonb, moderation.review_reason, jsonb, text, text) to service_role;

-- --- dedupe lookup (ADR 0019): equality only, resolved rows only --------------
create function moderation.find_resolved_by_hash(p_sha256 text, p_dhash text, p_exclude uuid)
  returns table (media_item_id uuid, classification public.media_classification,
                 sex_level smallint, violence_level smallint, religion_level smallint, addictions_level smallint)
  language sql stable set search_path = '' as $$
  select m.id, m.classification, m.sex_level, m.violence_level, m.religion_level, m.addictions_level
    from public.media_items m
   where m.id <> p_exclude
     and m.classification in ('general', 'contains_women')
     and ((p_sha256 is not null and m.content_sha256 = p_sha256)
       or (p_dhash  is not null and m.content_dhash  = p_dhash))
   order by m.classified_at desc
   limit 1;
$$;
grant execute on function moderation.find_resolved_by_hash(text, text, uuid) to service_role;

-- --- visibility: the SQL mirror of viewerSatisfiesClassification ------------
-- Replaces classification_visible(cls, fs). Takes the row, because the decision
-- now needs four columns of it. Fail closed on every unresolved state and on
-- missing levels or missing settings; Family Space lifts sex only.
drop function visibility.media_url_permitted(public.media_classification, boolean, boolean);
drop function visibility.classification_visible(public.media_classification, boolean);

create function visibility.levels_visible(m public.media_items, is_within_family_space boolean)
  returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when m.classification in ('unclassified', 'pending_review') then false
    when m.sex_level is null or m.violence_level is null
      or m.religion_level is null or m.addictions_level is null then false
    else coalesce((
      select (is_within_family_space or m.sex_level <= fs.max_sex_level)
         and m.violence_level   <= fs.max_violence_level
         and m.religion_level   <= fs.max_religion_level
         and m.addictions_level <= fs.max_addictions_level
        from public.filter_settings fs
       where fs.user_id = auth.uid()
    ), false)
  end;
$$;

create function visibility.media_url_permitted(m public.media_items, is_within_family_space boolean, is_uploader boolean)
  returns boolean language sql stable set search_path = '' as $$
  select is_uploader or visibility.levels_visible(m, is_within_family_space);
$$;

create or replace function visibility.avatar_permitted(avatar_media uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when avatar_media is null then true
    when (select mi.uploader_id from public.media_items mi where mi.id = avatar_media) = auth.uid() then true
    when not visibility.viewer_filters_avatars() then true
    else visibility.levels_visible((select mi from public.media_items mi where mi.id = avatar_media), false)
  end;
$$;

-- media_items_visible: same body as 20260922000007_region_blur.sql:73-101 with
-- the media_url_permitted call changed to pass the row, plus the uploader's
-- own levels (other viewers get NULLs — levels of media you are filtered from
-- are not yours to read).
create or replace view media_items_visible with (security_invoker = on) as
select
  m.id, m.post_id, m.comment_id, m.message_id, m.profile_id, m.uploader_id,
  m.classification, m.classified_at, m.created_at,
  case when perm.url_ok then m.storage_path when redact.ok then m.blurred_storage_path else null end as storage_path,
  not perm.url_ok as is_filtered,
  redact.ok as is_redacted,
  case when m.uploader_id = auth.uid() then m.sex_level        end as sex_level,
  case when m.uploader_id = auth.uid() then m.violence_level   end as violence_level,
  case when m.uploader_id = auth.uid() then m.religion_level   end as religion_level,
  case when m.uploader_id = auth.uid() then m.addictions_level end as addictions_level
from public.media_items m
cross join lateral (
  select visibility.media_url_permitted(m, visibility.media_in_viewers_family_space(m), m.uploader_id = auth.uid()) as url_ok
) perm
cross join lateral (
  select not perm.url_ok and m.classification = 'contains_women'
     and m.blurred_storage_path is not null and visibility.region_blur_enabled() as ok
) redact;
grant select on media_items_visible to authenticated;

-- Storage policy: re-create the policy defined around 20260922000007_region_blur.sql:93
-- with the same change (pass the media row to media_url_permitted). Read that
-- block, keep its name and its other predicates verbatim.
```

Grep before finishing: `grep -rn "classification_visible\|media_url_permitted(" supabase/migrations` — every remaining call must be in this file or superseded by it. `visibility.viewer_hides_women()` keeps working through the generated column; leave it.

- [ ] **Step 3: Run the DB suite** — `pnpm --filter @safeplace/db-testing test` → expect failures only in tests Task 10 updates (job-store signature, seed inserts). **Step 4: Commit** — `feat(db): content levels, viewer maxima, dedupe hashes, per-group complete RPC (ADR 0018, 0019)`

### Task 10: Parity + lifecycle tests in `packages/db-testing`

**Files:**
- Modify: `src/seed.ts` (fixtures carry `levels` and viewer `contentLevels`; inserts write the level columns), `src/expected.ts` (pass `levels`), `src/pglite-job-store.ts` (new RPC signature)
- Modify tests: `auth-defaults.test.ts`, `pipeline-config.test.ts`, `classification-lifecycle.test.ts`; new `content-levels.parity.test.ts`, `dedupe.test.ts`

- [ ] **Step 1: Fixtures.** Extend `MediaFixture` with `levels: ContentLevels | null` (null for `unclassified`/`pending_review`; for the existing 16-cell grid derive `{sex: classification === "contains_women" ? 1 : 0, violence: 0, religion: 0, addictions: 0}`). Add a second grid `LEVEL_MEDIA`: for each group `g ∈ {violence, religion, addictions}` and level `∈ {1, 2}`, one `general` public post media with that single level set — six items — plus one `contains_women` with `sex: 2`, and one Family Space item with `{sex: 2, violence: 1}`. Add viewers: `maleLevels1` (all maxima 1), `femaleLevels2` (all maxima 2), `maleSexOnlyLifted` (Family Space member, maxima 0). The insert statement in `seedFixtures` adds the four level columns; `withFilter` writes `max_*_level` instead of `hide_content_with_women`. Avatar fixtures (`UserFixture.avatar`) gain `levels` the same way, and `expected.ts` passes them to `canViewProfilePhoto`.

- [ ] **Step 2: `content-levels.parity.test.ts`** — same shape as `media-visibility.parity.test.ts` over `LEVEL_MEDIA`:

```ts
describe("per-group levels: DB agrees with visibility-policy", () => {
  for (const u of USERS) {
    it(`viewer ${u.label}`, async () => {
      const visible = await visibleMediaFor(u.id);
      for (const m of LEVEL_MEDIA) {
        const expected = expectedMedia(u, m);   // canViewMedia with levels + isWithinViewersFamilySpace
        const row = visible.get(m.id);
        expect(row?.has_url ?? false, `${m.label} for ${u.label}`).toBe(expected.hasUrl);
        expect(row?.is_filtered, `${m.label} filtered for ${u.label}`).toBe(!expected.hasUrl);
        // Levels are the uploader's to read, nobody else's.
        expect(row?.violence_level === null || u.id === m.uploaderId).toBe(true);
      }
    });
  }
});
```

- [ ] **Step 3: `classification-lifecycle.test.ts`** — update the RPC call sites to the new signature and add:

```ts
it("a resolved classification without levels is rejected", async () => {
  await expect(db.asService((q) => q.query(
    `select moderation.complete_classification_job($1,'general','stub','m','levels',0.9,0.05,null)`, [MEDIA_ID]
  ))).rejects.toThrow(/must carry levels/);
});
it("level-3 and refusal land in the queue with their reason and the raw answer", async () => {
  await db.asService((q) => q.query(
    `select moderation.complete_classification_job($1,'pending_review','stub','m','levels',0.99,0.5,null,'ai_prohibited_content',$2)`,
    [MEDIA_ID, JSON.stringify({ sex: 0, violence: 3, religion: 0, addictions: 0 })]
  ));
  const { rows } = await db.asService((q) => q.query(`select reason, ai_levels from moderation.review_queue where media_item_id = $1`, [MEDIA_ID]));
  expect(rows[0]).toMatchObject({ reason: "ai_prohibited_content", ai_levels: { violence: 3 } });
});
```

- [ ] **Step 4: `dedupe.test.ts`** — insert two media rows for the same uploader; complete the first as `general` with `p_content_sha256 = 'abc'`; assert `find_resolved_by_hash('abc', null, <second id>)` returns the first; assert it returns nothing when the first is `pending_review`; assert `anon`/`authenticated` cannot execute it (`db.asUser` → permission denied).
- [ ] **Step 5: `auth-defaults.test.ts`** — assert the trigger's `max_*_level` for a male and a female signup equal `DEFAULT_FILTER_SETTINGS[g].contentLevels`, and that `hide_content_with_women` reads `max_sex_level = 0`. **`pipeline-config.test.ts`** — `model_id` default `claude-haiku-5-5`, `escalation_model_id` null.
- [ ] **Step 6: Run** `pnpm --filter @safeplace/db-testing test` → PASS. **Step 7: Commit** — `test(db): parity and lifecycle coverage for content levels and dedupe`

### Task 11: Worker, stores and handler (Phase D2)

**Files:**
- Modify: `services/moderation-pipeline/src/worker.ts`, `supabase-store.ts`, `handler.ts`, `index.ts`
- Modify: `packages/db-testing/src/pglite-job-store.ts` (mirror the Supabase store)
- Tests: `__tests__/worker.test.ts` (rewrite the store fake), `__tests__/handler.test.ts` (escalation wiring), `db-testing/__tests__/worker-end-to-end.test.ts` (levels land on the row)

- [ ] **Step 1: Failing worker tests** (replace the `makeStore(jobs, opts?)` fake with one that records the new `CompletedClassification`, records every `findResolvedByHash` call in `lookups`, and answers it from `opts.resolved(hashes, excludeId)`; define `const lv = (o = {}) => ({ sex: 0, violence: 0, religion: 0, addictions: 0, ...o })` at the top):

```ts
it("writes levels, reason and hashes; dedupes an identical image without calling the model", async () => {
  const bytes = new Uint8Array(await sharp({ create: { width: 16, height: 16, channels: 3, background: "#fff" } }).png().toBuffer());
  const { store, completed, lookups } = makeStore([job({ mediaItemId: "m1" }), job({ mediaItemId: "m2" })], {
    // the second lookup finds the first item
    resolved: (h, exclude) => (exclude === "m2" ? { sourceMediaItemId: "m1", classification: "general", levels: lv() } : null),
  });
  const provider = createStubClassifier({ fallback: verdictsOf({}) });
  const classify = vi.spyOn(provider, "classify");
  await drainOnce(deps(provider, store, fetcher(bytes)), 10);

  expect(classify).toHaveBeenCalledTimes(1);
  expect(completed[0]).toMatchObject({ mediaItemId: "m1", classification: "general", levels: lv(), reviewReason: null, provider: "stub" });
  expect(completed[0].contentSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(completed[1]).toMatchObject({ mediaItemId: "m2", provider: "dedupe", modelId: "copy:m1", verdict: "duplicate", levels: lv() });
  expect(lookups.length).toBe(2);
});

it("level 3 → pending_review with ai_prohibited_content and the raw answer", async () => {
  const { store, completed } = makeStore([job()]);
  const provider = createStubClassifier({ fallback: verdictsOf({ violence: { level: 3, confidence: 0.99 } }) });
  await drainOnce(deps(provider, store), 10);
  expect(completed[0]).toMatchObject({ classification: "pending_review", levels: null, reviewReason: "ai_prohibited_content", aiLevels: { violence: 3 } });
});

it("refusal → pending_review with ai_refusal, not a failure", async () => {
  const { store, completed, failed } = makeStore([job()]);
  const provider = createStubClassifier({ fallback: { kind: "refused" } });
  await drainOnce(deps(provider, store), 10);
  expect(failed).toEqual([]);
  expect(completed[0]).toMatchObject({ classification: "pending_review", reviewReason: "ai_refusal", verdict: "refused" });
});
```

- [ ] **Step 2: Implement.** `worker.ts` interfaces:

```ts
export interface CompletedClassification {
  mediaItemId: string;
  classification: MediaClassification;
  provider: string;
  modelId: string;
  verdict: "levels" | "refused" | "duplicate" | "unsupported_media";
  confidence: number;           // min confidence over resolved groups; 0 when pending
  womanProbability: number;     // sex-axis projection, ADR 0011 continuity
  levels: ContentLevels | null;
  reviewReason: ReviewReason | null;
  aiLevels: Record<ContentGroup, number | "uncertain"> | null;
  contentSha256: string | null;
  contentDhash: string | null;
}

export interface ResolvedByHash { sourceMediaItemId: string; classification: MediaClassification; levels: ContentLevels }

export interface JobStore {
  claim(batchSize: number, workerId: string): Promise<ClaimedJob[]>;
  findResolvedByHash(hashes: MediaHashes, excludeMediaItemId: string): Promise<ResolvedByHash | null>;
  complete(result: CompletedClassification): Promise<void>;
  fail(mediaItemId: string, error: string): Promise<void>;
}
```

`WorkerLogEntry.event` gains `"deduped" | "escalated"` and an optional `usage?: ClassifierUsage`. `processJob` body after the unsupported-media branch:

```ts
const bytes = await deps.media.fetch(job.storagePath);
const hashes = await hashMedia(bytes);

const prior = await deps.store.findResolvedByHash(hashes, job.mediaItemId);
if (prior) {
  await deps.store.complete({
    mediaItemId: job.mediaItemId, classification: prior.classification,
    provider: "dedupe", modelId: `copy:${prior.sourceMediaItemId}`, verdict: "duplicate",
    confidence: 1, womanProbability: prior.levels.sex >= 1 ? 1 : 0,
    levels: prior.levels, reviewReason: null, aiLevels: null,
    contentSha256: hashes.sha256, contentDhash: hashes.dhash,
  });
  deps.logger?.log({ event: "deduped", mediaItemId: job.mediaItemId, classification: prior.classification, durationMs: Date.now() - startedAt });
  return "classified";
}

const output = await deps.provider.classify({ mediaItemId: job.mediaItemId, bytes, contentType: job.contentType });
const outcome = resolveMediaOutcome(output, deps.thresholds);
const aiLevels = output.kind === "refused" ? null
  : (Object.fromEntries(CONTENT_GROUPS.map((g) => [g, output.groups[g].level])) as Record<ContentGroup, number | "uncertain">);
const confidence = outcome.levels && output.kind === "verdicts"
  ? Math.min(...CONTENT_GROUPS.map((g) => output.groups[g].confidence)) : 0;

await deps.store.complete({
  mediaItemId: job.mediaItemId, classification: outcome.classification,
  provider: deps.provider.name, modelId: deps.modelId,
  verdict: output.kind === "refused" ? "refused" : "levels",
  confidence, womanProbability: womanProbabilityFrom(output),
  levels: outcome.levels, reviewReason: outcome.reviewReason, aiLevels,
  contentSha256: hashes.sha256, contentDhash: hashes.dhash,
});
deps.logger?.log({ event: "classified", mediaItemId: job.mediaItemId, classification: outcome.classification, band: outcome.reviewReason ?? "resolved", durationMs: Date.now() - startedAt });

if (outcome.classification === "contains_women" && deps.redaction) await runRedaction(deps, job, bytes);
return "classified";
```

(The unsupported-media branch passes `levels: null, reviewReason: null, aiLevels: null, contentSha256: null, contentDhash: null`.)

`supabase-store.ts`: `complete` maps the new fields to `p_levels`, `p_review_reason`, `p_ai_levels`, `p_content_sha256`, `p_content_dhash`; add:

```ts
async findResolvedByHash(hashes, excludeMediaItemId) {
  if (!hashes.sha256 && !hashes.dhash) return null;
  const { data, error } = await supabase.schema(MODERATION_SCHEMA).rpc("find_resolved_by_hash", {
    p_sha256: hashes.sha256, p_dhash: hashes.dhash, p_exclude: excludeMediaItemId,
  });
  if (error) throw new Error(`dedupe lookup: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { media_item_id: string; classification: MediaClassification; sex_level: number; violence_level: number; religion_level: number; addictions_level: number }
    | undefined;
  if (!row) return null;
  const levels = { sex: row.sex_level, violence: row.violence_level, religion: row.religion_level, addictions: row.addictions_level };
  if (!isContentLevels(levels)) return null;   // a row without full levels is not a verdict to copy
  return { sourceMediaItemId: row.media_item_id, classification: row.classification, levels };
}
```

`loadPipelineConfig` reads `escalation_model_id` into `escalationModelId: string | null`. Mirror all of this in `packages/db-testing/src/pglite-job-store.ts`.

`handler.ts`: `resolveClassifierFromEnv(env, modelId, escalationModelId, logger)` — for `anthropic`, build the primary with `onUsage: (usage) => logger.log({ event: "usage", mediaItemId: "", usage })`, and when `escalationModelId` is set wrap: `createEscalatingClassifier({ primary, secondary: createAnthropicClassifierFromConfig({ apiKey, modelId: escalationModelId }), thresholds, onEscalate: (e) => logger.log({ event: "escalated", mediaItemId: e.mediaItemId, error: e.groups.join(",") }) })`. Default `modelId` param becomes `"claude-haiku-5-5"`. The redaction `recheck` stays the primary provider.

- [ ] **Step 3: Run** `pnpm turbo run typecheck lint test --filter=@safeplace/moderation-pipeline... --filter=@safeplace/db-testing` → PASS. **Step 4: Commit** — `feat(moderation): dedupe, per-group completion, escalation wiring in the worker`

### Task 12: api-client (Phase E)

**Files:**
- Modify: `packages/api-client/src/viewer-context.ts` (`FilterSettingsRow` + `mapFilterSettings`), `filter-settings.ts`, `moderation.ts` (`resolveUploaderMediaViews`), `feed.ts`, `comments.ts`, `compose.ts` (select the four level columns wherever `classification` is selected from `media_items_visible` or `media_items`)
- Tests: `__tests__/feed.test.ts`, `__tests__/compose.test.ts`, `__tests__/comments.test.ts` fixtures gain `levels`; `__tests__/filter-settings.test.ts` (new)

- [ ] **Step 1: Failing test** — `filter-settings.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { setContentFilterEnabled, updateFilterSettings } from "../filter-settings";

function fakeSupabase() {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  return { client: { from: vi.fn().mockReturnValue({ update }) } as never, update };
}

describe("filter settings writes", () => {
  it("setContentFilterEnabled writes max_sex_level, never the generated boolean", async () => {
    const { client, update } = fakeSupabase();
    await setContentFilterEnabled(client, "u", true);
    expect(update).toHaveBeenCalledWith({ max_sex_level: 0 });
    await setContentFilterEnabled(client, "u", false);
    expect(update).toHaveBeenCalledWith({ max_sex_level: 1 });
  });
  it("updateFilterSettings expands contentLevels into the four columns", async () => {
    const { client, update } = fakeSupabase();
    await updateFilterSettings(client, "u", { contentLevels: { sex: 1, violence: 2, religion: 0, addictions: 1 }, hideWomenAccounts: false });
    expect(update).toHaveBeenCalledWith({ max_sex_level: 1, max_violence_level: 2, max_religion_level: 0, max_addictions_level: 1, hide_women_accounts: false });
  });
});
```

- [ ] **Step 2: Implement.** `viewer-context.ts`: `FilterSettingsRow` gains `max_sex_level`, `max_violence_level`, `max_religion_level`, `max_addictions_level` (numbers); `mapFilterSettings` sets `contentLevels` from them and `hideContentWithWomen: row.max_sex_level === 0` (ignore the DB boolean; one source of truth in TS). `COLUMNS` in both files add the four. `filter-settings.ts` — `setContentFilterEnabled` writes the column directly, no read first:

```ts
export async function setContentFilterEnabled(
  supabase: SupabaseClient,
  userId: string,
  contentFilterEnabled: boolean
): Promise<void> {
  // 0 hides every depiction of a woman; 1 = modest women visible. Raising to 2
  // is an explicit settings choice, never the result of this toggle.
  const { error } = await supabase
    .from("filter_settings")
    .update({ max_sex_level: contentFilterEnabled ? 0 : 1 })
    .eq("user_id", userId);
  if (error) throw new Error(`setContentFilterEnabled: ${error.message}`);
}
```

In `updateFilterSettings`, `COLUMN_OF` drops `hideContentWithWomen` (writing it must be a type error: `Omit<FilterSettings, "hideContentWithWomen">` for the patch) and `contentLevels` is expanded:

```ts
if (key === "contentLevels") {
  const lv = value as FilterSettings["contentLevels"];
  Object.assign(dbPatch, { max_sex_level: lv.sex, max_violence_level: lv.violence, max_religion_level: lv.religion, max_addictions_level: lv.addictions });
  continue;
}
```

`moderation.ts`: `resolveUploaderMediaViews(media: Array<{ id; classification; levels: ContentLevels | null }>, gender)` returns `{ id, classification, state, foundGroups: noticeGroupsFor(levels, gender) }`. Feed/comment/compose readers map `sex_level …` columns to `levels` (`isContentLevels` → object, else `null`).

- [ ] **Step 3: Run** `pnpm turbo run typecheck test --filter=@safeplace/api-client` → PASS. **Step 4: Commit** — `feat(api-client): per-group filter levels and notice groups`

### Task 13: Copy and mobile (Phase E)

**Files:**
- Modify: `packages/shared-types/src/moderation-copy.ts`, `services/moderation-pipeline/src/notice-copy.ts` (re-export), `services/moderation-pipeline/src/index.ts`
- Modify: `apps/mobile/src/screens/feed/copy.ts`, `apps/mobile/src/screens/post/model.ts`, `apps/mobile/src/screens/feed/viewModel.ts`, `apps/mobile/src/screens/feed/FeedScreen.tsx`, `apps/mobile/src/screens/compose/composeState.ts` and the screens rendering the notice (grep `WOMEN_DETECTED_NOTICE_HE`), `apps/mobile/src/screens/onboarding/copy.ts`, `apps/mobile/app/(onboarding)/defaults.tsx`
- Tests: `apps/mobile/src/screens/post/__tests__/model.test.ts`, `feed/__tests__/feed.test.ts` (fixtures gain `foundGroups`)

- [ ] **Step 1: Copy** — replace `WOMEN_DETECTED_NOTICE_HE` with:

```ts
/**
 * DRAFT — product copy is Eli's (open-questions-backlog.md §K). One general
 * card for any group (decision g, 2026-10-30); the details line names what was
 * found. Same shape as the old women notice: a consequence, never a verdict.
 */
export const CONTENT_NOTICE_HE = {
  title:
    "זוהה במדיה שהעלית תוכן שמשתמשים רבים ברשת בחרו שלא לראות. עליך לדעת שבעקבות זאת חלק מהמשתמשים לא יוכלו לראות את המדיה בפוסט הנוכחי.",
  detailsLabel: "מה זוהה?",
  confirmLabel: "אישור",
  cancelLabel: "חזרה",
  appealLabel: "ערער",
} as const;

/** DRAFT group names for the details line, in CONTENT_GROUPS order. */
export const CONTENT_GROUP_LABELS_HE: Record<ContentGroup, string> = {
  sex: "נשים",
  violence: "אלימות",
  religion: "סמלים דתיים",
  addictions: "התמכרויות",
};
```

`PENDING_REVIEW_NOTICE_HE` and `PROCESSING_NOTICE_HE` unchanged.

- [ ] **Step 2: Mobile notice** — every place that rendered `WOMEN_DETECTED_NOTICE_HE.title` renders `CONTENT_NOTICE_HE.title`, with a secondary tappable line `CONTENT_NOTICE_HE.detailsLabel` that expands to `foundGroups.map((g) => CONTENT_GROUP_LABELS_HE[g]).join(" · ")`. `foundGroups` comes from `UploaderMediaView` (Task 12). RTL: the expand chevron mirrors; reduced motion: no height animation when `prefers-reduced-motion`.
- [ ] **Step 3: Onboarding defaults** — add three rows after `hideContentWithWomen` in `defaults.tsx`, each `value: settings.contentLevels[g] === 0`, labels in `onboarding/copy.ts`:

```ts
  // DRAFT copy — Eli. Same label for both genders; the value is the same too.
  hideViolence: "אינך רואה תוכן אלים",
  hideReligion: "אינך רואה סמלים דתיים זרים",
  hideAddictions: "אינך רואה תוכן של התמכרויות",
```

- [ ] **Step 4: Run** `pnpm turbo run typecheck lint test --filter=mobile...` → PASS; open the compose notice and the onboarding Step 3 in Expo web at 390 px and check RTL. **Step 5: Commit** — `feat(mobile): general content notice with details, onboarding rows for the new groups (DRAFT copy)`

---

## 5. Deferred (not planned here)

- **Layer 2 gate** (SigLIP + one binary head) — build only when volume > ~100k images/day or self-hosting is decided. Data for it is free then (layer 3 outputs).
- **Self-hosted VLM** — privacy/control decision, revisit with volume.
- **Video** — ADR 0010 stands; frame sampling + a multi-frame call is its own ADR.
- **Region blur for the new groups** — ADR 0012's localizer is women-only; stays off.
- **Batch API** for re-classification backlogs — the provider seam makes this a second provider when needed.
- **Settings screen** for the four levels (Phase 6, `06-settings-spec.md` §4 double-confirm applies).
- **Near-duplicate (Hamming) dedupe** — ADR 0019 alternatives; asymmetric variant only.

## 6. Legal 🔴 on these surfaces (doesn't block development; flag before production)

Items 7 and 26–28 in `docs/legal/legal-tracker.md`. Nothing in this plan may ship to real users before they are 🟢.

## 7. Definition of done

- `pnpm turbo run typecheck lint test --force` green, including `packages/db-testing`.
- Parity suites cover the level grid and the Family-Space-lifts-sex-only case.
- Eval numbers recorded in the Progress log; cost per 1k within 2× of $0.15.
- Hosted migrations applied and recorded; `pipeline_config.model_id = 'claude-haiku-5-5'`; a dev upload shows levels on its row and the general notice on the author's post.
- No image was viewed by anyone at Safe-Place; no nudity/gore collected.

## Progress log

_(empty — append dated entries as tasks land)_
