# 0011 — Retaining the Model's Raw Output

## Status

Accepted

## Context

The pipeline persists exactly one thing a client can read: the resolved
`media_classification` enum. The question this ADR settles is what happens to
the *other* output — the model's verdict and its confidence — once the band
has been resolved from it.

Keeping it has real uses:

- **Threshold tuning.** `07-moderation-spec.md` §2.1 explicitly defers the
  real thresholds until there is performance data to set them from. That data
  *is* this record: "of the items scored 0.6–0.7, how often did a moderator
  agree?" It is also not reconstructable later — recovering it would mean
  re-running the classifier over old media, which costs money and reads every
  one of those photos again.
- **Appeal review.** §2.3 lets an uploader dispute a classification; the
  moderator handling it benefits from seeing what the model actually said.
- **Drift detection** across model versions.

Against that: this is data about people's photographs, and
`legal-tracker.md` item 7 (automated content scanning — proportionality,
transparency, consent) is exactly about not retaining more than the purpose
requires.

## Decision

**Retain the verdict and the confidence, and nothing else, for 90 days, in a
service-role-only table.** `moderation.classification_scores` has no grants
for any client role and RLS enabled behind that. `moderation.purge_expired_scores()`
sweeps expired rows, so the retention window lives in one place.

**The model's free-text reasoning is never stored, and never requested.** The
response schema admits a verdict and a number and nothing else.

## Alternatives considered

- **Discard after resolving the band.** The most conservative reading of legal
  item 7, and it leaves nothing to leak. Rejected because it makes the
  spec's own deferred decision — the real thresholds — permanently
  unanswerable without re-scanning everyone's media, which is a larger privacy
  cost than the one it avoids.
- **Retain indefinitely.** More tuning data, and useful for long-horizon drift
  analysis. Rejected: an unbounded store of machine judgments about
  identifiable people's photos is precisely what a proportionality argument
  has to survive, and the tuning value is concentrated in recent data anyway.
- **Store a bucketed score** (rounded to 0.05) instead of the exact value.
  Considered seriously as a middle path. Rejected as false economy: the
  privacy exposure comes from the verdict and the fact of the judgment, not
  from the precision of the number, and bucketing would degrade the very
  analysis the retention exists for.
- **Store the model's short justification** alongside the score. Rejected
  firmly. "Woman in a red dress, partially visible, left of frame" is a
  written description of a real person's photograph — materially more
  sensitive than the number beside it — and nothing in the pipeline needs it.

## Consequences

- Threshold tuning becomes a query rather than a research project.
- The 90-day window is a parameter, not a principle; shortening it is a column
  default change plus a sweep.
- The sweep needs a schedule. Until it is scheduled, expired rows linger —
  follow-up work, tracked in the backlog.
- **`legal-tracker.md` item 7 stays 🔴.** This ADR is an engineering decision
  about minimisation and retention, not a legal sign-off, and it does not
  reduce what counsel has to review. If anything it adds a specific to review:
  a 90-day retention of machine judgments about user photographs.
