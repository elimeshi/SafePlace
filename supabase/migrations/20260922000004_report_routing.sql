-- ============================================================================
-- 0010 — A user report becomes a moderator's queue item
--
-- 07-moderation-spec.md §3.1: every report is reviewed by a human, always, and
-- a report never removes content by itself. There is deliberately no count at
-- which reports take automatic effect — that absence IS the anti-abuse
-- property, protecting a user from a coordinated reporting campaign.
--
-- public.reports (0001) is the client-writable submission surface: a user
-- inserts their own report and can read it back. moderation.review_queue
-- (0008) is the moderator's work list, which no client can see. This migration
-- is the join between them, so the medium confidence band, user reports, and
-- AI-classification appeals all drain from one queue.
--
-- The trigger is SECURITY DEFINER because the reporting user has, and must
-- keep, no rights at all in the moderation schema.
-- ============================================================================

create function moderation.enqueue_report_for_review()
  returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_post_id uuid;
  v_comment_id uuid;
  v_message_id uuid;
  v_subject_user_id uuid;
begin
  -- Resolve the report's target into the queue's context columns, and work out
  -- whose content it is — §4.2 requires the moderator to see who posted it,
  -- not merely what was posted.
  case new.target_type
    when 'post' then
      v_post_id := new.target_id;
      select p.author_id into v_subject_user_id
        from public.posts p where p.id = new.target_id;
    when 'comment' then
      v_comment_id := new.target_id;
      select c.author_id into v_subject_user_id
        from public.comments c where c.id = new.target_id;
    when 'message' then
      v_message_id := new.target_id;
      select m.sender_id into v_subject_user_id
        from public.messages m where m.id = new.target_id;
    when 'user' then
      v_subject_user_id := new.target_id;
  end case;

  -- No ON CONFLICT and no de-duplication: ten reports on one post are ten
  -- queue items. Collapsing them would turn report volume into a signal, which
  -- is exactly what §3.1 refuses to let it become. The unique index in 0008
  -- covers only AI-raised items, for the opposite reason — a retry storm must
  -- not flood a moderator with copies of one machine decision.
  insert into moderation.review_queue (
    reason, status, post_id, comment_id, message_id, subject_user_id,
    reporter_id, reporter_note, report_category
  ) values (
    'user_report', 'pending', v_post_id, v_comment_id, v_message_id, v_subject_user_id,
    new.reporter_id, new.free_text_explanation, new.category
  );

  return new;
end;
$$;

create trigger reports_enqueue_for_review
  after insert on public.reports
  for each row execute function moderation.enqueue_report_for_review();
