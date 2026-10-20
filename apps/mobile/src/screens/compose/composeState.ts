import {
  isAudienceSetValid,
  type ContentAudience,
  type UploaderMediaState,
} from "@safeplace/visibility-policy";

/**
 * Pure state for the compose screen (plan §2 "classify while composing").
 * No visibility decision lives here: the uploader state arrives already
 * resolved by visibility-policy (via api-client `pollUploaderMedia`), and the
 * audience combination rule is asked of `isAudienceSetValid`.
 */

export type MediaPhase = "uploading" | "attached";

export interface ComposeMedia {
  localUri: string;
  contentType: string;
  phase: MediaPhase;
  mediaId?: string;
  /** Resolved by visibility-policy; undefined until the first poll lands. */
  uploader?: UploaderMediaState;
  /** The author confirmed or appealed the women-detected notice. */
  noticeResolved: boolean;
}

export type ComposeError = "upload" | "publish" | "action" | null;

export interface ComposeState {
  text: string;
  audiences: readonly ContentAudience[];
  locationTag: string | null;
  /** The place-name entry row is open. */
  locationEditing: boolean;
  pickerOpen: boolean;
  media: ComposeMedia | null;
  publishing: boolean;
  error: ComposeError;
  /** Toast shown after an appeal. */
  appealSent: boolean;
}

export type ComposeAction =
  | { type: "text"; text: string }
  | { type: "audiences"; audiences: readonly ContentAudience[] }
  | { type: "picker"; open: boolean }
  | { type: "locationEdit"; open: boolean }
  | { type: "locationSet"; name: string }
  | { type: "locationClear" }
  | { type: "mediaPicked"; localUri: string; contentType: string }
  | { type: "mediaAttached"; mediaId: string }
  | { type: "mediaFailed" }
  | { type: "mediaRemoved" }
  | { type: "uploaderState"; state: UploaderMediaState }
  | { type: "noticeResolved"; appealed: boolean }
  | { type: "publishStart" }
  | { type: "publishFailed" }
  | { type: "error"; error: ComposeError }
  | { type: "dismissToast" };

export function initialComposeState(audiences: readonly ContentAudience[]): ComposeState {
  return {
    text: "",
    audiences,
    locationTag: null,
    locationEditing: false,
    pickerOpen: false,
    media: null,
    publishing: false,
    error: null,
    appealSent: false,
  };
}

export function composeReducer(s: ComposeState, a: ComposeAction): ComposeState {
  switch (a.type) {
    case "text":
      return { ...s, text: a.text };
    case "audiences":
      return { ...s, audiences: a.audiences };
    case "picker":
      return { ...s, pickerOpen: a.open };
    case "locationEdit":
      return { ...s, locationEditing: a.open };
    case "locationSet": {
      // A place NAME only (02 §3.5). Empty input is no tag.
      const name = a.name.trim();
      return { ...s, locationTag: name === "" ? null : name, locationEditing: false };
    }
    case "locationClear":
      return { ...s, locationTag: null };
    case "mediaPicked":
      return {
        ...s,
        error: null,
        media: { localUri: a.localUri, contentType: a.contentType, phase: "uploading", noticeResolved: false },
      };
    case "mediaAttached":
      return s.media ? { ...s, media: { ...s.media, phase: "attached", mediaId: a.mediaId } } : s;
    case "mediaFailed":
      return { ...s, media: null, error: "upload" };
    case "mediaRemoved":
      return { ...s, media: null };
    case "uploaderState":
      return s.media ? { ...s, media: { ...s.media, uploader: a.state } } : s;
    case "noticeResolved":
      return s.media ? { ...s, media: { ...s.media, noticeResolved: true }, appealSent: a.appealed } : s;
    case "publishStart":
      return { ...s, publishing: true, error: null };
    case "publishFailed":
      return { ...s, publishing: false, error: "publish" };
    case "error":
      return { ...s, error: a.error };
    case "dismissToast":
      return { ...s, error: null, appealSent: false };
  }
}

export interface ComposeView {
  /** Publish is live (lab: dimmed .4 until there is content). */
  canPublish: boolean;
  /** "checking the media…" chip: uploading, or queued/in flight in the pipeline. */
  checking: boolean;
  /** Inline women-detected notice before publish (Confirm / Back / Appeal). */
  showNotice: boolean;
  /** Under-review strip (neutral; never a rejection). */
  showReview: boolean;
}

export function deriveView(s: ComposeState): ComposeView {
  const m = s.media;
  const hasContent = s.text.trim() !== "" || m?.phase === "attached";
  const uploading = m?.phase === "uploading";
  return {
    // Publish never waits on classification; it does wait on the bytes it must attach.
    canPublish: hasContent && !uploading && !s.publishing && isAudienceSetValid(s.audiences),
    checking: m != null && (uploading || m.uploader === undefined || m.uploader === "processing"),
    showNotice: m?.uploader === "filtered_for_some_viewers" && !m.noticeResolved,
    showReview: m?.uploader === "under_review",
  };
}

/**
 * Publish with the women-detected notice still showing counts as Confirm (Eli):
 * the media stays, no appeal is sent, and Publish is never a no-op. The notice
 * has already been shown inline, which is what moderation-pipeline §3 requires.
 */
export const mayPublishNow = (s: ComposeState): boolean => deriveView(s).canPublish;

/** `profiles.default_post_exposure` seeds the picker (02 §4.1); anything unseedable falls back to public. */
export function seedAudiences(defaultKind: string | null | undefined, authorId: string): ContentAudience[] {
  return defaultKind === "followers_only" ? [{ kind: "followers_only", authorId }] : [{ kind: "public" }];
}
