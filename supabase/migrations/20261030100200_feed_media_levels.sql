-- ============================================================================
-- Feed media carries the per-group levels (ADR 0018), so the uploader's notice
-- ("what was found") works on feed, own-recent and spaces-rail reads too.
-- Same body as 20261020120100_feed_read_paths.sql:62-75 plus four keys. Reads
-- media_items_visible, which returns the levels to the uploader only and NULL
-- to everyone else, so no new exposure. create or replace keeps the grants
-- set in 20261021100000_audit_fixes.sql.
-- ============================================================================
create or replace function public.post_media_json(p_post uuid)
  returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'classification', m.classification,
      'storage_path', m.storage_path,
      'is_filtered', m.is_filtered,
      'is_redacted', m.is_redacted,
      'sex_level', m.sex_level,
      'violence_level', m.violence_level,
      'religion_level', m.religion_level,
      'addictions_level', m.addictions_level
    ) order by m.created_at, m.id
  ), '[]'::jsonb)
  from public.media_items_visible m
  where m.post_id = p_post;
$$;
