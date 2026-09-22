-- ============================================================================
-- 0011 — media_items.content_type
--
-- The pipeline has to know what it is looking at before it looks: an image
-- classifier must not be handed a video, and the MVP classifies images only
-- (ADR 0012). Without this column the worker would have to infer the format
-- from a file extension or from the bytes, and a wrong guess sends media down
-- the wrong path — either a video scored by an image model, or an image parked
-- in human review for no reason.
--
-- Nullable, because rows predating this migration have no recorded type. The
-- worker treats an unknown type as unsupported and routes it to a human, which
-- is the safe reading of "we do not know what this is".
-- ============================================================================

alter table media_items add column content_type text;

comment on column media_items.content_type is
  'MIME type recorded at upload. NULL means unknown, which the classification '
  'pipeline treats as unsupported and routes to human review.';
