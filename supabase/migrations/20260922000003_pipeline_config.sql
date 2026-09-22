-- ============================================================================
-- 0009 — Pipeline configuration (thresholds live in data, not in a deploy)
--
-- 07-moderation-spec.md §2.1 defers the real confidence thresholds until there
-- is false-positive / false-negative data to set them from, and states the
-- direction in the meantime: lean toward over-flagging. That makes them an
-- operating parameter, not a constant — so they live in a row an operator can
-- change while the service keeps running, and the spec's placeholders are that
-- row's defaults.
--
-- The model id lives here for the same reason (ADR 0004): escalating to a more
-- capable model must be a config change, never a code change.
-- ============================================================================

create table moderation.pipeline_config (
  -- Exactly one row, enforced by the primary key's only legal value.
  id boolean primary key default true check (id),

  -- Below low_max → auto-approve. At or above high_min → auto-flag. Between
  -- them → a human decides.
  low_max numeric(4, 3) not null default 0.200
    check (low_max >= 0 and low_max <= 1),
  high_min numeric(4, 3) not null default 0.800
    check (high_min >= 0 and high_min <= 1),

  model_id text not null default 'claude-haiku-4-5',
  /** Jobs claimed per worker invocation. */
  batch_size integer not null default 20 check (batch_size > 0 and batch_size <= 200),

  updated_at timestamptz not null default now(),

  -- An inverted or empty band would remove human review from the pipeline
  -- altogether, which is the one outcome no threshold setting may produce.
  constraint band_is_ordered check (low_max < high_min)
);

insert into moderation.pipeline_config (id) values (true);

alter table moderation.pipeline_config enable row level security;
grant select, insert, update, delete on moderation.pipeline_config to service_role;

create function moderation.get_pipeline_config()
  returns moderation.pipeline_config
  language sql stable set search_path = '' as $$
  select * from moderation.pipeline_config limit 1;
$$;

grant execute on function moderation.get_pipeline_config() to service_role;
