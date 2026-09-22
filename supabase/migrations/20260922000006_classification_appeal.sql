-- ============================================================================
-- 0012 — Appealing an AI classification (07-moderation-spec.md §2.3)
--
-- The uploader can dispute the machine's decision from the notice itself, and
-- the dispute goes to a human. The client has no rights anywhere in the
-- moderation schema and must not gain any, so the appeal is filed through a
-- SECURITY DEFINER function in public that verifies the caller is the uploader
-- before writing anything.
--
-- The check is not a formality. Without it, the appeal path would be a way to
-- push arbitrary items into a moderator's queue, and — because an appeal on a
-- non-existent or invisible item would behave differently from one on a real
-- item — a way to probe for media the caller is not allowed to know exists.
-- ============================================================================

create function public.appeal_classification(
  p_media_item_id uuid,
  p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uploader_id uuid;
  v_classification public.media_classification;
  v_existing uuid;
  v_review_id uuid;
  v_appeal_id uuid;
begin
  select m.uploader_id, m.classification
    into v_uploader_id, v_classification
    from public.media_items m
   where m.id = p_media_item_id;

  -- One message for "no such media" and "not yours", so the function cannot be
  -- used to probe for the existence of someone else's media.
  if v_uploader_id is null or v_uploader_id <> auth.uid() then
    raise exception 'media not found or not yours';
  end if;

  -- Only an adverse machine decision is appealable. 'general' has nothing to
  -- dispute, and 'unclassified' has not been decided yet.
  if v_classification not in ('contains_women', 'pending_review') then
    raise exception 'this media has no classification to appeal';
  end if;

  -- Idempotent: tapping "appeal" twice must not put two copies in front of two
  -- different moderators.
  select a.id into v_existing
    from moderation.classification_appeals a
   where a.media_item_id = p_media_item_id
     and a.appellant_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  insert into moderation.review_queue (
    reason, status, media_item_id, post_id, comment_id, message_id, subject_user_id
  )
  select 'ai_classification_appeal', 'pending', m.id, m.post_id, m.comment_id,
         m.message_id, m.uploader_id
    from public.media_items m
   where m.id = p_media_item_id
  returning id into v_review_id;

  insert into moderation.classification_appeals (
    media_item_id, appellant_id, note, review_queue_id
  ) values (
    p_media_item_id, auth.uid(), p_note, v_review_id
  )
  returning id into v_appeal_id;

  return v_appeal_id;
end;
$$;

-- Callable by a signed-in user; the function itself decides whose media may be
-- appealed. Not granted to anon.
grant execute on function public.appeal_classification(uuid, text) to authenticated;
