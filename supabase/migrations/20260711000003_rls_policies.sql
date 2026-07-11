-- ============================================================================
-- 0003 — Row-Level Security policies
--
-- The un-bypassable enforcement tier (invariant #2). Every policy is `to
-- authenticated`; `anon` (logged-out) has no policies and so sees nothing —
-- the MVP requires auth. `service_role` bypasses RLS (the pipeline/backend).
--
-- Structure of the read-path crux:
--   * posts SELECT encodes the EXPOSURE axis + blocks. Post TEXT is never
--     filtered by classification (visibility-model §3) — the row is returned
--     whenever exposure+blocks pass; only media URLs get withheld (0004).
--   * comments/media/polls INHERIT exposure by referencing visible posts via
--     EXISTS — so the posts policy is the single source of exposure truth and
--     nothing re-derives it.
--   * media_items adds the frozen carve-out (pending_review is uploader-only)
--     and blocks; the classification axis lives in the view (0004), so a
--     contains_women row is still SELECTable (→ placeholder) but its URL is
--     withheld.
--
-- "Number without list" (invariant #5): follows + *_members SELECT expose only
-- the caller's OWN edges/memberships, never anyone else's list.
-- ============================================================================

-- --- profiles --------------------------------------------------------------
create policy profiles_select on profiles for select to authenticated
  using (
    id = auth.uid()
    or (account_status <> 'deleted' and not visibility.is_blocked_with(id))
  );
create policy profiles_insert_self on profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- --- filter_settings (personal control: read/edit only your own) ------------
create policy filter_settings_select_own on filter_settings for select to authenticated
  using (user_id = auth.uid());
create policy filter_settings_insert_own on filter_settings for insert to authenticated
  with check (user_id = auth.uid());
create policy filter_settings_update_own on filter_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- follows (own edges only) ----------------------------------------------
create policy follows_select_own_edges on follows for select to authenticated
  using (follower_id = auth.uid() or followed_id = auth.uid());
create policy follows_insert_self on follows for insert to authenticated
  with check (follower_id = auth.uid() and not visibility.is_blocked_with(followed_id));
create policy follows_delete_self on follows for delete to authenticated
  using (follower_id = auth.uid());

-- --- blocks (own rows only) ------------------------------------------------
create policy blocks_select_own on blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy blocks_insert_own on blocks for insert to authenticated
  with check (blocker_id = auth.uid());
create policy blocks_delete_own on blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- --- groups ----------------------------------------------------------------
create policy groups_select_visible on groups for select to authenticated
  using (
    visibility in ('public', 'private_visible')
    or visibility.viewer_in_group(id)
  );
create policy groups_insert on groups for insert to authenticated
  with check (true); -- creator wires themselves in as admin (group_members); depth is Phase 5

create policy group_members_select_own on group_members for select to authenticated
  using (user_id = auth.uid());
create policy group_members_join_self on group_members for insert to authenticated
  with check (user_id = auth.uid());
create policy group_members_leave_self on group_members for delete to authenticated
  using (user_id = auth.uid());

-- --- family spaces ---------------------------------------------------------
create policy family_spaces_select_member on family_spaces for select to authenticated
  using (admin_user_id = auth.uid() or visibility.viewer_in_family_space(id));
create policy family_spaces_insert_admin on family_spaces for insert to authenticated
  with check (admin_user_id = auth.uid());

create policy family_space_members_select_own on family_space_members for select to authenticated
  using (user_id = auth.uid());
create policy family_space_members_join_self on family_space_members for insert to authenticated
  with check (user_id = auth.uid()); -- mutual-consent invite depth is Phase 5
create policy family_space_members_leave_self on family_space_members for delete to authenticated
  using (user_id = auth.uid());

-- --- posts (EXPOSURE axis + blocks) ----------------------------------------
create policy posts_select_exposure on posts for select to authenticated
  using (
    (case exposure_kind
      when 'public' then true
      when 'followers_only' then (auth.uid() = author_id or visibility.viewer_follows(author_id))
      when 'group' then visibility.viewer_in_group(exposure_group_id)
      when 'family_space' then visibility.viewer_in_family_space(exposure_space_id)
    end)
    and not visibility.is_blocked_with(author_id)
  );
create policy posts_insert_own on posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and (exposure_kind <> 'group' or visibility.viewer_in_group(exposure_group_id))
    and (exposure_kind <> 'family_space' or visibility.viewer_in_family_space(exposure_space_id))
  );
create policy posts_update_own on posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_delete_own on posts for delete to authenticated
  using (author_id = auth.uid());

-- --- comments (inherit post visibility; text not classification-filtered) ---
create policy comments_select_via_post on comments for select to authenticated
  using (
    exists (select 1 from posts p where p.id = post_id)
    and not visibility.is_blocked_with(author_id)
  );
create policy comments_insert_own on comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from posts p where p.id = post_id)
  );
create policy comments_update_own on comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete_own on comments for delete to authenticated
  using (author_id = auth.uid());

-- --- media_items -----------------------------------------------------------
-- Row visibility = parent visible (exposure inherited) + not blocked + not
-- frozen-for-this-viewer. contains_women rows ARE visible here so the client
-- can render a placeholder; the URL withholding is the view's job (0004).
create policy media_select on media_items for select to authenticated
  using (
    not visibility.is_blocked_with(uploader_id)
    and (classification <> 'pending_review' or uploader_id = auth.uid())
    and (
      uploader_id = auth.uid()
      or (post_id is not null and exists (select 1 from posts p where p.id = post_id))
      or (comment_id is not null and exists (select 1 from comments c where c.id = comment_id))
      or (profile_id is not null and exists (select 1 from profiles pr where pr.id = profile_id))
      or (message_id is not null and exists (select 1 from messages m where m.id = message_id))
    )
  );
-- A client may only attach its OWN media to its OWN content, and only as
-- 'unclassified'. It can never set/downgrade classification — invariant #1;
-- only service_role (the pipeline) transitions it.
create policy media_insert_own_unclassified on media_items for insert to authenticated
  with check (
    uploader_id = auth.uid()
    and classification = 'unclassified'
    and (
      (post_id is not null and exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()))
      or (comment_id is not null and exists (select 1 from comments c where c.id = comment_id and c.author_id = auth.uid()))
      or (profile_id is not null and profile_id = auth.uid())
      or (message_id is not null and exists (select 1 from messages m where m.id = message_id and m.sender_id = auth.uid()))
    )
  );
create policy media_delete_own on media_items for delete to authenticated
  using (uploader_id = auth.uid());
-- NB: no UPDATE policy for authenticated → media is immutable client-side.

-- --- polls / poll options / tags (inherit post visibility) -----------------
create policy polls_select_via_post on polls for select to authenticated
  using (exists (select 1 from posts p where p.id = post_id));
create policy polls_insert_own on polls for insert to authenticated
  with check (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

create policy poll_options_select_via_post on poll_options for select to authenticated
  using (exists (select 1 from posts p where p.id = post_id));
create policy poll_options_insert_own on poll_options for insert to authenticated
  with check (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

create policy post_tags_select_via_post on post_tags for select to authenticated
  using (exists (select 1 from posts p where p.id = post_id));
create policy post_tags_insert_own on post_tags for insert to authenticated
  with check (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

-- --- messaging (baseline owner/participant scoping; depth is Phase 7) -------
create policy conversations_select_participant on conversations for select to authenticated
  using (participant_a = auth.uid() or participant_b = auth.uid());
create policy conversations_insert_participant on conversations for insert to authenticated
  with check (participant_a = auth.uid() or participant_b = auth.uid());

create policy messages_select_participant on messages for select to authenticated
  using (exists (select 1 from conversations c where c.id = conversation_id));
create policy messages_insert_sender on messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from conversations c where c.id = conversation_id)
  );
create policy messages_update_own on messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create policy message_requests_select_party on message_requests for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy message_requests_insert_sender on message_requests for insert to authenticated
  with check (sender_id = auth.uid() and not visibility.is_blocked_with(recipient_id));
create policy message_requests_update_recipient on message_requests for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- --- moderation (baseline; console is Phase 8, served via service_role) -----
create policy reports_select_own on reports for select to authenticated
  using (reporter_id = auth.uid());
create policy reports_insert_own on reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- A user can see moderation actions taken against them (fairness / appeal),
-- but never author them from the client.
create policy moderation_actions_select_target on moderation_actions for select to authenticated
  using (target_user_id = auth.uid());
