---
description: Wire a new media-upload surface into the moderation/classification pipeline
---

Use this whenever you're adding a new place in the product where a user can
upload an image or video — a new post type, a new field, a new surface
that wasn't already in the table in `docs/architecture/visibility-model.md`
§4.

Read `docs/architecture/moderation-pipeline.md` in full first.

Then:

1. **Add the surface to the table** in `docs/architecture/visibility-model.md`
   §4, with a pointer to its product spec section.

2. **Confirm the upload flow is async**: the user must be able to complete
   their action (publish the post / send the message / etc.) without
   waiting on the classification model to return a result. Classification
   happens in the background; the UI shows a "processing" state on the
   affected media until it resolves.

3. **Confirm the three-tier outcome is handled**:
   - Low confidence → `general`, no special UI.
   - Medium confidence → `pending_review`, frozen from other viewers until
     a moderator decides, uploader sees a "content under review" state.
   - High confidence → `contains_women`, and if the uploader is male, show
     the exact required notice text from
     `docs/architecture/moderation-pipeline.md` §3 before the action is
     finalized — this is a confirm/cancel choice, not a block and not a
     silent flag.

4. **Confirm the classification field, not the raw model score, is what
   downstream code reads.** `packages/visibility-policy` should never see
   a confidence percentage — only the resolved enum state.

5. **Confirm `packages/visibility-policy` is consulted on the read side**
   for this new surface — adding a write-side classification without a
   corresponding read-side check is the single most common way this kind
   of feature ships half-finished.

Report back explicitly which of these five points you've completed, and
flag anything you couldn't fully verify rather than assuming it's fine.
