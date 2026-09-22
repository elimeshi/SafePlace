# Moderation Pipeline

> Derived from `docs/product/07-moderation-spec.md` and `00-master-spec.md` §4.4.

## 1. Three layers, not one

The product spec is explicit that no automated filter is perfect — the
system is designed around layered defense, not a single point of truth
(`07-moderation-spec.md` §1.2):

1. **AI classification** at upload time (this document, §2–3).
2. **User reporting**, which always routes to a human, never auto-removes
   content (§4).
3. **Human moderation**, performed only by paid Safe-Place staff — never
   community volunteers or group admins (§5).

## 2. Upload flow (async, non-blocking)

```
 upload media
      │
      ▼
 store original (private, unprocessed)
      │
      ▼
 enqueue classification job  ──────► uploader sees post immediately
      │                              (optimistic UI; media shows as
      │                              "processing" if classification
      ▼                              hasn't completed yet)
 vision model scores probability
 that the content contains women
      │
      ├── low confidence ──────► tag = general, auto-approved
      │
      ├── medium confidence ───► tag = pending_review, frozen,
      │                          routed to human moderator queue,
      │                          uploader sees "content under review"
      │
      └── high confidence ─────► tag = contains_women, auto-flagged;
                                  if uploader is male, show the neutral
                                  notice (§3 below) — upload is NOT blocked
```

Never make the classification call synchronous in the publish request path.
The product spec is explicit that upload must never be blocked outright
(master spec §3.5) — the user is informed and chooses whether to proceed,
not prevented from posting.

**While a job is in flight the media is withheld from everyone but the
uploader.** "Processing" is an uploader-facing state, not a licence to serve
the original to other viewers: because classification is async, an item that
has not been scored is an item nothing is known about, and serving it would
show a filtered viewer exactly what the filter exists to withhold. Other
viewers see the post with the media in a processing placeholder until the
worker writes a resolved classification. See `visibility-model.md` §3 and
migration `20260922000001_unclassified_fail_closed.sql`.

## 3. The uploader notice (male uploader, content classified as containing women)

Exact required copy (master spec §3.5, §4.4.2) — do not rephrase this as a
judgment or a block:

> "Women were identified in the media you uploaded. As a result, many users
> on the network will not be able to see this media in your current post.
> Confirm / Go back."

This is shown **before** publish completes, as a confirm/cancel choice, not
as a post-hoc notification. It is neutral and factual — never moralizing,
never phrased as "your content was rejected."

## 4. Human review queue

A moderator working a queued item sees (per `07-moderation-spec.md` §4.2):

- The flagged content itself (post / comment / media).
- Context: where it was posted, who posted it.
- The reason: AI medium-confidence classification, or a user report
  (including the reporter's free-text explanation if provided).
- The uploader's history (prior violations).
- Decision options (§5 below).

Target SLAs (explicitly marked as a placeholder pending team sizing,
`07-moderation-spec.md` §4.3): dangerous/minor-safety content within 1 hour,
standard reports within 24 hours, appeals within 72 hours.

## 5. Reporting

Any user can report any post, comment, or message. A report **never**
auto-removes content — it always creates a human review task
(`07-moderation-spec.md` §3.1). There is no numeric threshold of reports
that triggers automatic takedown; this is a deliberate anti-abuse design
choice (preventing coordinated false-reporting campaigns from silencing a
user). The system does track reporting *patterns* (e.g. a user whose reports
are mostly dismissed) for moderator-side abuse signals, but this never
results in automated action against the reported party.

## 6. Enforcement ladder

Two parallel tracks (`07-moderation-spec.md` §5):

- **Graduated**, for minor/medium violations: warning → 24h posting
  suspension → 7-day posting suspension → permanent ban, escalating on
  repeat violations within a rolling window, with decay back down the
  ladder after a sustained clean period.
- **Direct severity-based**, for severe violations (minor-safety risk,
  physical threats): immediate appropriate action, bypassing the graduated
  ladder entirely.

Every moderation decision is communicated to the affected user with: what
content triggered it, what rule was broken, the penalty and its duration,
and how to appeal. This is both a fairness requirement and a stated legal
protection against arbitrariness (`07-moderation-spec.md` §5.3).

## 7. Appeals

Every moderation decision is appealable. An appeal is always reviewed by a
**different** moderator than the one who made the original call
("two pairs of eyes" — §6.3). Appeals against a permanent ban additionally
require sign-off from a senior moderation staff member (§6.4).

## 8. What this means for the codebase

- `services/moderation-pipeline` owns the classification job queue, the
  three-tier decision logic, and the moderator-facing API. It does **not**
  own visibility enforcement for already-classified content — that's
  `packages/visibility-policy`'s job (see `visibility-model.md`).
- A media row's lifecycle state (`unclassified` → `general` /
  `pending_review` → `contains_women`) is the single field that
  `visibility-policy` reads. Don't let UI code read raw model confidence
  scores directly — always go through the resolved classification state.
- Confidence thresholds are configuration, not constants baked into model
  code — they will be tuned post-MVP based on real false-positive /
  false-negative data (`07-moderation-spec.md` §2.1).
