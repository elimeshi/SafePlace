import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  appealClassification,
  attachMedia,
  createDraft,
  deleteDraft,
  pollUploaderMedia,
  publishDraft,
  removeMedia,
  setAudiences,
  updateDraft,
  uploadMedia,
} from "@safeplace/api-client";
import { isAudienceSetValid, type ContentAudience, type ContentExposure } from "@safeplace/visibility-policy";
import { supabase } from "@/lib/supabase";
import { composeReducer, initialComposeState, mayPublishNow } from "./composeState";
import { entryToSource, type ComposeContext } from "./data";
import type { ComposeHandlers } from "./ComposeView";

const POLL_MS = 2000;
/** ~5 minutes; after that the result simply shows on the author's own post (plan §2, "afterwards"). */
const POLL_MAX = 150;

function asExposure(a: readonly ContentAudience[]): ContentExposure {
  if (!isAudienceSetValid(a)) throw new Error("invalid audience combination");
  return a as unknown as ContentExposure;
}

/**
 * Compose effects (plan §2): attaching media creates the author-only draft and
 * media row so classification runs while the user types; publish never waits
 * on it; leaving without publishing discards the draft.
 */
export function useComposeController(ctx: ComposeContext) {
  const router = useRouter();
  const [state, dispatch] = useReducer(composeReducer, ctx.initialAudiences, initialComposeState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const draftRef = useRef<Promise<string> | null>(null);
  const publishedRef = useRef(false);

  const ensureDraft = useCallback((): Promise<string> => {
    draftRef.current ??= (async () => {
      const { postId } = await createDraft(supabase, { authorId: ctx.userId, source: entryToSource(ctx.entry) });
      await setAudiences(supabase, postId, asExposure(stateRef.current.audiences));
      return postId;
    })().catch((e) => {
      draftRef.current = null;
      throw e;
    });
    return draftRef.current;
  }, [ctx]);

  const discard = useCallback(() => {
    if (publishedRef.current) return;
    const pending = draftRef.current;
    draftRef.current = null;
    void pending?.then((id) => deleteDraft(supabase, id)).catch(() => undefined);
  }, []);
  // Hardware back / swipe-back unmount the screen without going through close().
  useEffect(() => discard, [discard]);

  // Poll the author's own media state until the pipeline has resolved it.
  const mediaId = state.media?.mediaId;
  useEffect(() => {
    if (!mediaId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async (n: number) => {
      try {
        const postId = await ensureDraft();
        const poll = await pollUploaderMedia(supabase, postId, ctx.gender);
        if (stop) return;
        const mine = poll.views.find((v) => v.id === mediaId);
        if (mine) dispatch({ type: "uploaderState", state: mine.state });
        if (poll.settled || n >= POLL_MAX) return;
      } catch {
        if (stop || n >= POLL_MAX) return;
      }
      timer = setTimeout(() => void tick(n + 1), POLL_MS);
    };
    void tick(0);
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [mediaId, ensureDraft, ctx.gender]);

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const fail = useCallback(() => dispatch({ type: "error", error: "action" }), []);

  const dropMedia = useCallback(() => {
    const m = stateRef.current.media;
    dispatch({ type: "mediaRemoved" });
    if (m?.mediaId) removeMedia(supabase, m.mediaId).catch(fail);
  }, [fail]);

  const pickMedia = useCallback(async () => {
    if (stateRef.current.media) return;
    let asset: ImagePicker.ImagePickerAsset | undefined;
    try {
      // Images only: the pipeline classifies images (ADR 0010).
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
      asset = r.canceled ? undefined : r.assets[0];
    } catch {
      dispatch({ type: "error", error: "upload" });
      return;
    }
    if (!asset) return;
    const contentType = asset.mimeType ?? "image/jpeg";
    dispatch({ type: "mediaPicked", localUri: asset.uri, contentType });
    try {
      const postId = await ensureDraft();
      const data = await (await fetch(asset.uri)).arrayBuffer();
      const { storagePath } = await uploadMedia(supabase, { uploaderId: ctx.userId, data, contentType });
      const { mediaIds } = await attachMedia(supabase, {
        postId,
        uploaderId: ctx.userId,
        media: [{ storagePath, contentType }],
      });
      const id = mediaIds[0]!;
      if (stateRef.current.media) dispatch({ type: "mediaAttached", mediaId: id });
      else await removeMedia(supabase, id); // removed while it was uploading
    } catch {
      dispatch({ type: "mediaFailed" });
    }
  }, [ctx.userId, ensureDraft]);

  const publish = useCallback(async () => {
    const s = stateRef.current;
    if (!mayPublishNow(s)) return;
    dispatch({ type: "publishStart" });
    try {
      const postId = await ensureDraft();
      await updateDraft(supabase, postId, { text: s.text, locationTag: s.locationTag });
      await setAudiences(supabase, postId, asExposure(s.audiences));
      await publishDraft(supabase, postId);
      publishedRef.current = true;
      leave();
    } catch {
      dispatch({ type: "publishFailed" });
    }
  }, [ensureDraft, leave]);

  const handlers: ComposeHandlers = useMemo(
    () => ({
      onClose: () => {
        discard();
        leave();
      },
      onPublish: () => void publish(),
      onText: (text) => dispatch({ type: "text", text }),
      onOpenPicker: () => dispatch({ type: "picker", open: true }),
      onClosePicker: () => dispatch({ type: "picker", open: false }),
      onAudiences: (audiences) => dispatch({ type: "audiences", audiences }),
      onPickMedia: () => void pickMedia(),
      onRemoveMedia: dropMedia,
      onLocationOpen: () => dispatch({ type: "locationEdit", open: true }),
      onLocationSet: (name) => dispatch({ type: "locationSet", name }),
      onLocationClear: () => dispatch({ type: "locationClear" }),
      onNoticeConfirm: () => dispatch({ type: "noticeResolved", appealed: false }),
      // "Go back" returns to editing without the flagged media; nothing is blocked (invariant #1).
      onNoticeBack: dropMedia,
      onNoticeAppeal: () => {
        const id = stateRef.current.media?.mediaId;
        if (!id) return;
        appealClassification(supabase, id)
          .then(() => dispatch({ type: "noticeResolved", appealed: true }))
          .catch(fail);
      },
      onDismissToast: () => dispatch({ type: "dismissToast" }),
    }),
    [discard, leave, publish, pickMedia, dropMedia, fail]
  );

  return { state, handlers };
}
