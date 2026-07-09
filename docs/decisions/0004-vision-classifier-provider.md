# 0004 — Vision Classifier Provider

## Status

Accepted

## Context

The moderation pipeline (`moderation-pipeline.md`, `07-moderation-spec.md`)
classifies whether uploaded media contains women, at upload time, for every
media surface (invariant #8). The specific vision-model vendor was left open
(`open-questions-backlog.md` §A). The pipeline must not sit in the synchronous
publish path (ADR 0002), classification thresholds are configuration not
constants (`classification.ts`), and only the resolved `MediaClassification`
enum — never the raw score — leaves the service. The team wants real
classification behavior from the first build of the pipeline, without locking
the product to one vendor.

## Decision

Classify via a **Claude vision model behind a `ClassifierProvider`
interface** — a single async `classify(image) → { rawConfidenceScore }` seam
that the three-tier band logic already consumes. The concrete model is
**configuration** (`VISION_MODEL_PROVIDER`, `ANTHROPIC_API_KEY` in
`.env.example`), not hardcoded. Starting model: **Claude Haiku 4.5** for the
high-volume first pass — it is vision-capable and cost/latency-appropriate
for per-upload classification, and the medium-confidence band already routes
to a human, so a cheaper first pass does not weaken the safety floor.
Accuracy (especially false-negative rate) is validated against real content
at Phase 3; if it is insufficient, the config escalates to a more capable
model (e.g. `claude-opus-4-8`) with no code change.

## Alternatives considered

- **Hardcode a single model** — rejected; thresholds and vendor are meant to
  be tuned post-MVP without redeploys, and a swappable seam costs nothing.
- **A dedicated computer-vision service / self-hosted model** — more control
  and no per-call API cost, but heavier to build and operate for a
  single-developer team, and the classification task ("does this contain
  women") is well within a general vision LLM's ability. Revisit if per-call
  cost or latency becomes a constraint at scale.
- **Stub-only classifier for development** — considered as the dev default,
  but the team chose real behavior from day one; a deterministic stub remains
  useful for tests and offline runs behind the same interface.

## Consequences

- The classifier is a swappable `ClassifierProvider`; `services/moderation-pipeline`
  depends on the interface, not on Anthropic specifically. A test/offline stub
  implements the same interface.
- The model id is read from config at runtime; the pipeline code never names a
  model literal, so tuning model/thresholds is a config change (consistent
  with ADR 0002's async-worker shape).
- Per-upload API cost is now an operating-cost line item
  (`open-questions-backlog.md` §A) — surfaced for tracking, not resolved here.
- Legal item #7 (automated LLM content scanning — proportionality,
  transparency, consent) in `legal-tracker.md` gates turning this on in
  production; building it does not require sign-off, shipping it does.
- Raw confidence scores stay internal (invariant reaffirmed): the provider
  returns a score, the band logic resolves it, and only the enum is persisted
  for `visibility-policy`/RLS to read.
