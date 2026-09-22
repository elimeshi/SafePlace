-- ============================================================================
-- 0007 — Unclassified media fails CLOSED
--
-- Replaces visibility.classification_visible (0002), which treated
-- 'unclassified' as visible on the reading that unclassified media is "shown
-- as processing, not hidden" (moderation-pipeline.md §2).
--
-- That reading is safe only if classification is synchronous. It is not: the
-- pipeline is async by design (ADR 0002, moderation-pipeline.md §2 — publish
-- must never wait on a vision call), so every upload has a window between the
-- INSERT and the worker's write during which NOTHING is known about the
-- content. Serving the original during that window shows a filtered viewer
-- precisely the media the filter exists to withhold — a leak that RLS, the
-- view, and the UI would all wave through, because every layer agreed the
-- item was fine.
--
-- So the classification axis now fails closed until the pipeline resolves it.
-- This withholds the REFERENCE, not the row: media_items stays SELECTable
-- (0003 is unchanged), so media_items_visible still returns the row with
-- storage_path NULL and is_filtered true, and the client renders a
-- "processing" state — distinguishable from the filtered state by the
-- classification value served alongside it.
--
-- The uploader is unaffected: visibility.media_url_permitted short-circuits
-- on is_uploader before this function is consulted, mirroring canViewMedia.
-- The family-space lift (visibility-model.md §8) is likewise unchanged.
--
-- Mirrors viewerSatisfiesClassification in
-- packages/visibility-policy/src/rules.ts; the parity suite in
-- packages/db-testing fails if the two drift.
-- ============================================================================

create or replace function visibility.classification_visible(
  cls public.media_classification,
  is_within_family_space boolean
) returns boolean language sql stable set search_path = '' as $$
  select case
    when is_within_family_space then true
    when cls = 'general' then true
    -- Not yet scored: nobody but the uploader may see it. Not a filter
    -- decision — no viewer setting can opt into content nothing has read.
    when cls = 'unclassified' then false
    when cls = 'pending_review' then false
    when cls = 'contains_women' then not visibility.viewer_hides_women()
  end;
$$;
