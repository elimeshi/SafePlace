-- ============================================================================
-- 0008 — The moderation pipeline's own persistence
--
-- Everything here is INTERNAL to services/moderation-pipeline and is reachable
-- only by the service role. Clients read exactly one output of this machinery:
-- public.media_items.classification, the resolved enum (ADR 0004). No verdict,
-- no confidence number, and no job state is ever exposed to a signed-in user.
--
-- Deliberately NOT stored anywhere below: the model's free-text reasoning. A
-- sentence describing who is visible in someone's photo is materially more
-- sensitive than the number beside it, and nothing in the pipeline needs it.
-- Threshold tuning needs the verdict and the confidence; appeals need to know
-- what the model said, not how it narrated it. See legal-tracker item 7.
-- ============================================================================

create schema moderation;

-- Locked down by construction: the client roles are never granted usage, so a
-- leak here requires someone to add a grant, not merely to forget a policy.
revoke all on schema moderation from public;
grant usage on schema moderation to service_role;

create type moderation.job_state as enum ('queued', 'running', 'done', 'failed');

create type moderation.review_reason as enum (
  'ai_medium_confidence',      -- the medium band (07-moderation-spec.md §2.1)
  'classification_failed',     -- the pipeline gave up; a human must decide
  'user_report',               -- layer 2 (§3) — always routed to a human
  'ai_classification_appeal'   -- §2.3, the uploader disputes the AI
);

create type moderation.review_status as enum ('pending', 'in_review', 'resolved');

-- --- the job queue ---------------------------------------------------------
create table moderation.classification_jobs (
  id uuid primary key default gen_random_uuid(),
  -- One job per media item, ever. The unique constraint is what makes the
  -- enqueue trigger and any retry path idempotent.
  media_item_id uuid not null unique
    references public.media_items (id) on delete cascade,
  state moderation.job_state not null default 'queued',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_jobs_claimable on moderation.classification_jobs (next_attempt_at)
  where state = 'queued';

-- --- retained model output (fork 4: keep, bounded) -------------------------
-- Kept so thresholds can be tuned against real outcomes rather than guessed,
-- and so an appeal reviewer can see what the model actually said. Bounded by
-- expires_at and swept by moderation.purge_expired_scores().
create table moderation.classification_scores (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  provider text not null,
  model_id text not null,
  verdict text not null,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  woman_probability numeric(4, 3) not null
    check (woman_probability >= 0 and woman_probability <= 1),
  resolved_classification public.media_classification not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);

create index idx_scores_media on moderation.classification_scores (media_item_id);
create index idx_scores_expiry on moderation.classification_scores (expires_at);

-- --- the human review queue (07-moderation-spec.md §4.2) -------------------
create table moderation.review_queue (
  id uuid primary key default gen_random_uuid(),
  reason moderation.review_reason not null,
  status moderation.review_status not null default 'pending',
  -- What is being reviewed. Media-centric for the AI bands; the content
  -- pointers carry the "where was this posted" context §4.2 requires.
  media_item_id uuid references public.media_items (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  subject_user_id uuid references public.profiles (id) on delete cascade,
  -- Who raised it, and their own words (§3.2). Null for AI-raised items.
  reporter_id uuid references public.profiles (id) on delete set null,
  reporter_note text,
  report_category text,
  assigned_to uuid references public.profiles (id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_review_pending on moderation.review_queue (created_at)
  where status = 'pending';
create index idx_review_media on moderation.review_queue (media_item_id);

-- At most one open AI-raised item per media, so a retry storm cannot flood a
-- moderator with duplicates of the same decision.
create unique index uq_review_open_ai_item
  on moderation.review_queue (media_item_id, reason)
  where status <> 'resolved'
    and reason in ('ai_medium_confidence', 'classification_failed');

-- --- appeals against an AI classification (§2.3) ---------------------------
create table moderation.classification_appeals (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  appellant_id uuid not null references public.profiles (id) on delete cascade,
  note text,
  status public.appeal_status not null default 'pending',
  review_queue_id uuid references moderation.review_queue (id) on delete set null,
  created_at timestamptz not null default now(),
  -- One open appeal per uploader per item.
  unique (media_item_id, appellant_id)
);

-- RLS on every table as a second lock behind the absent grants: even if a
-- grant is added by mistake later, there is no policy for any client role, so
-- the row set stays empty.
alter table moderation.classification_jobs    enable row level security;
alter table moderation.classification_scores  enable row level security;
alter table moderation.review_queue           enable row level security;
alter table moderation.classification_appeals enable row level security;

grant select, insert, update, delete on all tables in schema moderation to service_role;

-- ============================================================================
-- Enqueue: at the DATABASE tier, not in application code.
--
-- CLAUDE.md invariant #8 says every media surface goes through the pipeline
-- with no exceptions. Enforced in an API handler, that is a promise each new
-- upload surface has to remember to keep. Enforced here, the row's own insert
-- is what enqueues it, so a surface that forgets the pipeline cannot exist.
-- ============================================================================
create function moderation.enqueue_classification()
  returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.classification = 'unclassified' then
    insert into moderation.classification_jobs (media_item_id)
    values (new.id)
    on conflict (media_item_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger media_items_enqueue_classification
  after insert on public.media_items
  for each row execute function moderation.enqueue_classification();

-- ============================================================================
-- Claiming work. `for update skip locked` lets several worker invocations
-- drain the queue concurrently without handing the same item to two of them —
-- which matters because the worker is a stateless HTTP handler that may well
-- be running more than once at a time (ADR 0009).
-- ============================================================================
create function moderation.claim_classification_jobs(
  p_batch_size integer,
  p_worker_id text
) returns setof moderation.classification_jobs
  language sql set search_path = '' as $$
  update moderation.classification_jobs j
     set state = 'running',
         locked_at = now(),
         locked_by = p_worker_id,
         updated_at = now()
   where j.id in (
     select c.id
       from moderation.classification_jobs c
      where c.state = 'queued'
        and c.next_attempt_at <= now()
      order by c.next_attempt_at, c.created_at
      limit greatest(p_batch_size, 0)
      for update skip locked
   )
  returning j.*;
$$;

-- ============================================================================
-- Completion: the single place a media item leaves 'unclassified'.
--
-- Idempotent by the job's state transition — a duplicate delivery (the worker
-- crashed after writing but before acking, a retry that overtook its original)
-- finds the job already done and changes nothing. That matters because the
-- second delivery could carry a DIFFERENT verdict, and re-classifying media a
-- viewer has already been shown is its own kind of leak.
-- ============================================================================
create function moderation.complete_classification_job(
  p_media_item_id uuid,
  p_classification public.media_classification,
  p_provider text,
  p_model_id text,
  p_verdict text,
  p_confidence numeric,
  p_woman_probability numeric
) returns void language plpgsql set search_path = '' as $$
declare
  v_transitioned integer;
begin
  update moderation.classification_jobs
     set state = 'done',
         locked_at = null,
         locked_by = null,
         last_error = null,
         updated_at = now()
   where media_item_id = p_media_item_id
     and state <> 'done';
  get diagnostics v_transitioned = row_count;
  if v_transitioned = 0 then
    return;  -- already completed; a replay must not re-decide anything
  end if;

  -- Only ever moves an item OUT of 'unclassified'. The pipeline does not
  -- overwrite a moderator's decision.
  update public.media_items
     set classification = p_classification,
         classified_at = now()
   where id = p_media_item_id
     and classification = 'unclassified';

  insert into moderation.classification_scores (
    media_item_id, provider, model_id, verdict, confidence,
    woman_probability, resolved_classification
  ) values (
    p_media_item_id, p_provider, p_model_id, p_verdict, p_confidence,
    p_woman_probability, p_classification
  );

  if p_classification = 'pending_review' then
    insert into moderation.review_queue (media_item_id, reason, post_id, comment_id, message_id, subject_user_id)
    select p_media_item_id, 'ai_medium_confidence', m.post_id, m.comment_id, m.message_id, m.uploader_id
      from public.media_items m
     where m.id = p_media_item_id
    on conflict do nothing;
  end if;
end;
$$;

-- ============================================================================
-- Failure: exponential backoff, then a terminal state that a human owns.
--
-- The terminal case is the important one. Under fail-closed visibility
-- (migration 0007) an item stranded as 'unclassified' is invisible to everyone
-- but its uploader, permanently, with nobody looking at it. So giving up moves
-- the item to 'pending_review' and files it for review — the pipeline failing
-- becomes a moderator's queue item, never a silently buried post.
-- ============================================================================
create function moderation.fail_classification_job(
  p_media_item_id uuid,
  p_error text
) returns void language plpgsql set search_path = '' as $$
declare
  v_state moderation.job_state;
  v_attempts integer;
  c_max_attempts constant integer := 5;
begin
  select state, attempts into v_state, v_attempts
    from moderation.classification_jobs
   where media_item_id = p_media_item_id
   for update;

  if not found or v_state in ('failed', 'done') then
    return;
  end if;

  v_attempts := v_attempts + 1;

  if v_attempts >= c_max_attempts then
    update moderation.classification_jobs
       set state = 'failed',
           attempts = v_attempts,
           last_error = p_error,
           locked_at = null,
           locked_by = null,
           updated_at = now()
     where media_item_id = p_media_item_id;

    update public.media_items
       set classification = 'pending_review',
           classified_at = now()
     where id = p_media_item_id
       and classification = 'unclassified';

    insert into moderation.review_queue (media_item_id, reason, post_id, comment_id, message_id, subject_user_id)
    select p_media_item_id, 'classification_failed', m.post_id, m.comment_id, m.message_id, m.uploader_id
      from public.media_items m
     where m.id = p_media_item_id
    on conflict do nothing;
  else
    update moderation.classification_jobs
       set state = 'queued',
           attempts = v_attempts,
           last_error = p_error,
           locked_at = null,
           locked_by = null,
           -- 30s, 1m, 2m, 4m — long enough to ride out a provider blip,
           -- short enough that the media is not withheld for long.
           next_attempt_at = now() + (interval '30 seconds' * (2 ^ (v_attempts - 1))),
           updated_at = now()
     where media_item_id = p_media_item_id;
  end if;
end;
$$;

-- Retention sweep for the bounded score history. Called on a schedule; kept as
-- a function so the retention window lives in one place.
create function moderation.purge_expired_scores() returns integer
  language plpgsql set search_path = '' as $$
declare
  v_deleted integer;
begin
  delete from moderation.classification_scores where expires_at <= now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function
  moderation.claim_classification_jobs(integer, text),
  moderation.complete_classification_job(uuid, public.media_classification, text, text, text, numeric, numeric),
  moderation.fail_classification_job(uuid, text),
  moderation.purge_expired_scores()
  to service_role;
