# @safeplace/moderation-pipeline

The async classification service: it scores uploaded media, resolves each item
into the `media_classification` enum that the whole visibility tier reads, and
routes anything it cannot decide to a human.

Design: `docs/architecture/moderation-pipeline.md`. Decisions: ADR 0004
(provider), 0009 (runtime), 0010 (images only), 0011 (score retention).

## The shape of it

```
client uploads media ─────► media_items INSERT (classification='unclassified')
                                   │
                                   │  trigger (migration 0008)
                                   ▼
                        moderation.classification_jobs
                                   │
   scheduler ──POST /classify──► drainOnce()
                                   │
              claim (for update skip locked) ─► fetch bytes (service role)
                                   │                    │
                                   │                    ▼
                                   │            ClassifierProvider
                                   │           (anthropic | stub)
                                   ▼                    │
                 verdict + confidence ◄─────────────────┘
                                   │
                    womanProbabilityFrom() ─► band ─► classification
                                   │
                      complete_classification_job()
                       │                          │
              media_items.classification     moderation.classification_scores
                                                  (90-day retention)
```

Three things about that diagram matter more than the rest:

- **The enqueue is a database trigger, not a call from application code.** So a
  new upload surface cannot forget the pipeline (CLAUDE.md invariant #8).
- **Only the resolved enum crosses back to anything a client can read.** The
  verdict and confidence stay in the `moderation` schema, which no client role
  has rights on.
- **Unclassified media is withheld from everyone but its uploader** (migration
  0007). Classification is async, so "not yet scored" means "nothing is known
  about it", and the pipeline's failure mode is *nobody sees it yet* rather
  than *everybody sees it*.

## Running it locally

Nothing here runs as a daemon. One HTTP request drains one batch.

```bash
# 1. Bring up the local stack and apply migrations
supabase start
supabase db reset

# 2. Point the worker at it (see .env.example for the full list)
export SUPABASE_URL=http://127.0.0.1:55321
export SUPABASE_SERVICE_ROLE_KEY=<from `supabase status`>
export MODERATION_WORKER_SECRET=dev-secret
export VISION_MODEL_PROVIDER=stub      # no API calls, no spend

# 3. Drain the queue once
pnpm --filter @safeplace/moderation-pipeline dev
```

`VISION_MODEL_PROVIDER=stub` is the default and answers `uncertain` for
everything, which sends every item to human review. That is deliberate: a stub
that auto-approved would make a misconfigured deployment look healthy.

To classify for real, set `VISION_MODEL_PROVIDER=anthropic` and
`VISION_MODEL_API_KEY`. **Every image then costs money.** There is no
confirmation step — the ceiling is whatever the queue holds.

## Tuning without a deploy

Thresholds and the model id live in `moderation.pipeline_config`, not in the
environment and not in code, because `07-moderation-spec.md` §2.1 defers the
real values until there is performance data to set them from:

```sql
update moderation.pipeline_config
   set low_max = 0.15, high_min = 0.85, model_id = 'claude-sonnet-5';
```

The next invocation picks it up. A check constraint refuses an inverted band —
the one setting that would remove human review from the pipeline entirely.

To see what the current thresholds are actually doing before changing them:

```sql
select resolved_classification, count(*), round(avg(confidence), 3)
  from moderation.classification_scores
 where created_at > now() - interval '7 days'
 group by 1;
```

## Where things went wrong

```sql
-- Items stuck retrying
select media_item_id, attempts, last_error, next_attempt_at
  from moderation.classification_jobs
 where state = 'queued' and attempts > 0;

-- Items the pipeline gave up on (these are in the review queue)
select * from moderation.classification_jobs where state = 'failed';

-- What a moderator is looking at
select reason, count(*) from moderation.review_queue
 where status = 'pending' group by 1;
```

A job that fails five times moves its media to `pending_review` and files it
for review, rather than leaving it stranded as `unclassified` — under
fail-closed visibility, stranded means invisible to everyone but its uploader,
permanently, with nobody looking at it.

## Region blur (off)

```sql
-- Switch it on (and see ADR 0012 first — the switch is a product decision)
update moderation.pipeline_config set region_blur_enabled = true;

-- How often derivatives are actually being produced
select count(*) filter (where verified) as served,
       round(avg(region_count), 1) as avg_regions,
       round(avg(coverage), 3) as avg_coverage
  from moderation.redactions;
```

A flagged image costs about three model calls instead of one when this is on,
and nothing changes for unflagged images. If the numbers above show few
derivatives, the re-classification gate is rejecting them — which is the system
working, not failing: it means the redacted output still looked like it
contained a woman, so the original was withheld as before.

## Before this runs against real users

`docs/legal/legal-tracker.md` item 7 — automated LLM content scanning,
proportionality, transparency, consent — is **🔴 open**. Building the pipeline
needed no sign-off. Switching it on for real people's uploads does.

Also unreviewed: the two community questions called out at the top of
`src/classifier-prompt.ts` (whether illustrations and statues count as
depictions, and where childhood ends for this purpose). Both currently have
conservative engineering answers standing in for product ones.
