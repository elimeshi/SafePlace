# Visibility Model

> Derived from `docs/product/00-master-spec.md` §3–4, `00a-knowledge-base-fb-vs-ig.md` §1.1
> and §6.3, and cross-cutting sections in every screen spec. This is the single most
> important architecture document in the repo — read it before writing any query,
> API handler, or screen that touches user-generated content.

## 1. What kind of graph this is

Classic social networks use one of two visibility models:

- **Symmetric (Facebook)**: mutual friendship, both sides see the same thing.
- **Asymmetric (Instagram/Twitter)**: one-way follow, visibility is per-relationship.

Safe-Place uses neither. It uses a **gender-conditioned visibility graph**:
viewing permission is not determined by the relationship between two specific
users, but by a global attribute (declared gender) of the viewer, evaluated
against a classification attribute of the content. This has a structural
consequence that the rest of this document exists to manage: **visibility
rules cannot live in the social-graph layer (follows/membership) at all.**
They live in a separate, orthogonal layer that intersects with every other
piece of content in the system.

## 2. The two independent axes

Every piece of content has **two separate, orthogonal visibility
dimensions**. Confusing them is the single most common bug class to watch
for in review.

### Axis 1 — Exposure (who is the intended circle)

Set explicitly by the author at creation time. Answers "who is this
*addressed* to":

- Public
- Followers only
- Specific group
- Family space

See `docs/product/01-feed-spec.md` §7.3 and `02-post-creation-spec.md` §4.

### Axis 2 — Gender classification (what the content contains)

Set automatically by the LLM classification pipeline at upload time.
Answers "does this media contain women, and how confident is the
classifier":

- `unclassified` (queued/processing — withheld from everyone but the
  uploader until the pipeline resolves it; see §3)
- `general` (low probability — approved automatically)
- `pending_review` (medium probability — frozen until human review)
- `contains_women` (high probability — auto-flagged)

See `docs/architecture/moderation-pipeline.md` for the full state machine.

**Both axes apply simultaneously and independently to every piece of
content.** Exposure determines the *candidate audience*; classification then
filters *within* that audience based on each viewer's personal consumption
settings. Never conflate "private to a group" with "filtered from some
viewers" — a post can be group-only AND visible-to-everyone-in-that-group,
or group-only AND filtered-for-some-members-of-that-group. Both axes are
evaluated on every read.

## 3. The core rule

```
canViewMedia(viewer, mediaItem) =
     viewer.id == mediaItem.uploaderId          // the uploader always sees their own content
  OR (   viewerSatisfiesExposure(viewer, mediaItem.exposure)
     AND viewerSatisfiesClassification(viewer, mediaItem.classification) )
```

The uploader always sees their own uploaded media — any classification,
including `pending_review` (frozen) and `contains_women`, regardless of their
own filter settings. The same principle applies to a user's own profile photo
(`canViewProfilePhoto`). Otherwise:

```
viewerSatisfiesClassification(viewer, classification) =
     isFamilySpaceContext(viewer, mediaItem)   // family space lifts standard filtering
  OR classification == 'general'
  OR (classification == 'contains_women' AND !viewer.filterSettings.hideContentWithWomen)
  // 'unclassified' and 'pending_review' are false for everyone here — the
  // uploader's own access comes from canViewMedia's short-circuit above.
```

**`unclassified` fails closed.** Classification is asynchronous, so every
upload has a window between the INSERT and the worker's write during which
nothing is known about the content. Serving the original during that window
would show a filtered viewer exactly the media the filter exists to withhold,
with every layer waving it through. The row stays visible so the UI can render
a "processing" state — distinguishable from the filtered state by the
`classification` value served alongside it — but the reference is withheld.
See migration `20260922000001_unclassified_fail_closed.sql`.

**A third filtered state exists in code but is switched off.** With region
blur enabled (ADR 0012), a viewer the filter applies to may be served a
redacted derivative — `is_filtered` true *and* `is_redacted` true — rather than
nothing. It is off by default because it is a product change the screen specs
do not yet describe: `05-personal-area-spec.md` §2.6.3 defines the filtered
state as a placeholder, and the uploader notice's "many users will not be able
to see this media" stops being accurate for a post served blurred.

This function — and only this function, via `packages/visibility-policy` —
decides whether a piece of media is rendered or replaced with a neutral
"filtered content" placeholder. Text content of a post is **never** filtered
by gender classification — only media. A filtered post still shows its text,
author, and metadata; only the image/video is replaced. See
`docs/product/05-personal-area-spec.md` §2.6.3.

## 4. What gets classified

Every media surface in the product, with no exceptions (master spec §4.4,
reinforced in every downstream spec):

| Surface | Spec reference |
|---|---|
| Post media (feed, group, family space) | `00-master-spec.md` §4.4 |
| Comment media | `03-single-post-spec.md` §3.4 |
| Profile photo / avatar | `05-personal-area-spec.md` §2.6.1 |
| Poll option images | `02-post-creation-spec.md` §3.4 |
| Story/status media | `01-feed-spec.md` §2.1.2 |
| Direct message media | `09-messages-spec.md` §4.4 |

If you add a new upload surface, it must be added to this table and wired
into the same pipeline. There is no fast-path that skips classification.

**Since Phase 3 this is enforced rather than promised.** Every one of these
surfaces stores its media as a `media_items` row, and an insert trigger on
that table enqueues the classification job (migration 0008). A surface that
forgets to call the pipeline therefore cannot exist — the row's own insert is
what enqueues it. The parity suite asserts this holds for every parent the
table allows (post, comment, message, profile).

Two notes on the surfaces above:

- **Poll option images** are `media_items` rows parented to their post and
  referenced by `poll_options.image_media_id`, so they are covered by the same
  trigger with no special handling.
- **Story/status media has no table yet** — stories are post-MVP, so there is
  nothing to classify today. When that table lands, its media must be
  `media_items` rows like everything else; do not give it its own storage path.


## 5. Defaults vs. rules — why the distinction is load-bearing

From the master spec's legal framing (§3.6): a default is legally and
ethically different from a restriction *only if* changing it is frictionless,
the change is framed neutrally, and the mechanism is identical for everyone.
Concretely, this means in code:

- The "hide content containing women" setting must be a single boolean per
  user, toggle-able from one screen, with no re-authentication beyond the
  standard dangerous-action double-confirm (see `06-settings-spec.md` §4.3.1).
- The onboarding screen that shows the assigned defaults (master spec §6.2.3)
  is **read-only by design** — this is intentional simplicity, not a
  loophole closure. Don't "fix" it by making it editable inline; the spec
  explains why it's deliberately deferred to the settings screen.
- Never write a code comment, variable name, or log message that frames this
  as "male restriction" / "female restriction." Use `contentFilterEnabled`,
  not `isRestrictedUser` or similar. This isn't just style — see master spec
  §3.6.2 on internal-documentation framing requirements.

## 6. Enforcement at every layer (the anti-leak checklist)

A visibility rule that exists in only one layer is a data leak. For every
new query, endpoint, or screen that touches classified media, confirm all
three:

1. **Database (Supabase/Postgres RLS)**: the row-level policy itself
   excludes content the viewer shouldn't be able to select, based on the
   viewer's `filterSettings` and the row's `classification` +
   `exposure`. This is the backstop — assume the API and UI layers will
   someday have a bug, and the database must still hold the line.
2. **Server/API**: never return raw classification-positive media URLs to a
   client whose settings would filter them — even if the UI "would have
   hidden it anyway." A filtered placeholder is served instead of the real
   media reference.
3. **UI**: renders the filtered placeholder state per
   `05-personal-area-spec.md` §2.6.3, and never caches/persists the
   underlying media reference client-side once filtered.

## 7. The classification confidence model

Three-tier probability model (full detail in
`docs/architecture/moderation-pipeline.md`, sourced from
`docs/product/07-moderation-spec.md` §2.1):

| Confidence band | Outcome |
|---|---|
| (pre-classification) | `unclassified` — withheld from all but the uploader |
| Low | Auto-approved, tagged `general` |
| Medium | Frozen, routed to human moderator, uploader sees "content under review" |
| High | Auto-tagged `contains_women`, filtered per viewer settings |

Thresholds are explicitly unset in the product spec pending real
performance data (`07-moderation-spec.md` §2.1 todo) — do not hardcode
specific percentages without flagging that they're placeholders pending the
product owner's sign-off.

## 8. Family Spaces — the deliberate exception

Inside a confirmed (mutual-consent, invite-accepted) Family Space, the
admin of that space controls content rules directly, and standard
classification-based filtering for members is lifted (master spec §4.1.3,
§4.2). This is **scoped to that space only** — a post created inside a
Family Space is never visible outside it (see exposure axis above), and a
user's filter settings still apply everywhere else they go. Do not let a
Family Space membership leak into global filter state.

## 9. Tagging and cross-references

Tagging another user in a post is subject to the same visibility rules as
any other content reference: a viewer only sees a tag if they'd otherwise be
permitted to see the tagged person, per their own filter settings
(`02-post-creation-spec.md` §3.6). Treat a tag exactly like an embedded
content reference, not as a separate visibility surface.
