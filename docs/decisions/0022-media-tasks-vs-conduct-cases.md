# 0022 — Media Tasks vs Conduct Cases

## Status

Accepted (2026-11-22). Records Phase 8 forks 2, 7, 9, 10, 11, 12, 13 and 14
(`docs/plans/phase-8-admin-portal.md` §2), §3.5 and §10 question 1.
Relaxes the `appeal_different_moderator` constraint.

## Context

Until now, one queue (`moderation.review_queue`) mixed two questions: "what
levels does this image have?" and "did this person break a rule?". Product
invariant #1 says the product classifies content, never users. A person who
looks at an image should not also be deciding a penalty for its uploader, and a
person who decides penalties should not need to see the image.

## Decision

**Reviewers classify media. Admins judge people.** (fork 2) There are two kinds
of work with separate tables and separate screens:

- A **media task** (`moderation.review_queue`): set the four group levels, or
  mark the image prohibited. Decided by a reviewer.
- A **conduct case** (`moderation.conduct_cases`, new): decide whether a rule
  was broken and what follows. Decided by an admin. Admins never see the image,
  only labels and chips. (plan §3.1)

Rules for media tasks:

- **Anonymized view.** The reviewer sees the text, where it was posted, the
  task reason, and the report category and note. Uploader and reporter appear
  as "User A/B". No avatar, no history. A Family Space shows as "private family
  space", a message as "private message". (fork 10)
- **AI-answer mode** is a senior-admin setting: `blind`, `blind_then_feedback`
  (default) or `shown`. (fork 9)
- **Two pairs of eyes applies to reviewers only.** A classification appeal of a
  reviewer's decision goes to a different reviewer, enforced from
  `media_decisions`. This replaces the `appeal_different_moderator`
  constraint, which is dropped; admin decisions can be appealed to any admin,
  including the original decider. (fork 7)
- **One reviewer is enough for prohibited.** The uploader's appeal is the
  second look. (fork 11)
- **No "unsure".** The rubric says: when torn, choose the stricter level. Skip
  takes a reason (`need_other_opinion`, `personal_conflict`, `cannot_view`).
  After two skips the task is marked stuck, still claimable, and counted on
  the admin dashboard. (fork 12)
- **Browsable list plus claim.** A claim locks the task for 10 minutes,
  derived from `claimed_until`, with no sweeper. The list has no thumbnails.
  (fork 13)
- **A missed women image is not an offense.** Re-levelling it re-filters the
  image and records no strike. Only deliberate evasion can become a conduct
  case, and an admin decides it. (fork 14)

**Report routing** (plan §3.5, replaces `enqueue_report_for_review`):

| Report category | Target has media? | Creates |
|---|---|---|
| `contains_women` | yes | one media task per media item, lane `images`; no conduct case |
| `contains_women` | no | conduct case, lane `standard` |
| `dangerous_content` | yes | media tasks and a conduct case, both lane `urgent` |
| `dangerous_content` | no | conduct case, lane `urgent` |
| `harassment`, `spam`, `misinformation`, `other` | any | conduct case, lane `standard`; media as chips with "send for review" |
| any, target `user` | n/a | conduct case, lane `standard` |

**One report is one case**, so report volume does not become a signal. The
case view lists "N other open reports on this content" and a checkbox lets the
admin decide them together. A human chooses; nothing is automatic. (§10 q1)

## Alternatives considered

- **One queue and one role.** Rejected: it mixes media viewing with judging
  people.
- **Reviewers also apply penalties.** Rejected (fork 2): exposes user history
  to the team that views graphic media.
- **Two reviewers on every prohibited verdict.** Rejected (fork 11): doubles
  exposure to graphic media; the appeal is the second look.
- **An "unsure" answer.** Rejected (fork 12): it becomes a dumping ground.
- **Push assignment.** Rejected (fork 13): browse and claim is simpler.
- **Penalising missed women images.** Rejected (fork 14): the classifier and
  the team miss images; punishing the uploader would contradict invariant #1.
- **Collapsing duplicate reports automatically.** Rejected (`07` §3.1).

## Consequences

- Two new tables, a `lane` and SLA on tasks, and skips and decisions tables.
- Reviewer two-eyes is code (`canDecideReviewTask` in `visibility-policy`) and
  an RPC check, not a column constraint.
- Reviewer quality uses passive stats only (fork 26).
- `07` §5.1 and §6.3 need a product note from Eli; the spec is not edited
  here. Legal items #9, #21 and #27 are touched.
