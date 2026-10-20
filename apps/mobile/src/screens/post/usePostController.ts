import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import type { Comment, MediaView, ReportTargetType } from "@safeplace/api-client";
import { feedbackCopy } from "@safeplace/ui";
import { postCopy } from "./copy";
import type { OutgoingImage, PostBackend, ScreenData } from "./data";
import {
  commentsReducer,
  emptyComments,
  hasUnsettledMedia,
  REPORT_CATEGORIES,
  rootOf,
  toggleLiked,
} from "./model";

/** What the screen opens on first render. Used only by the dev fixture scenes. */
export interface DevInit {
  replyToCommentId?: string;
  sheet?: Sheet;
  toast?: string;
  /** Scroll so the first comment's top sits this many px below the scroll area's top (the lab scrolls past the post). */
  scrollToCommentsAt?: number;
  reportSelected?: number | null;
  /** The lab draws the menu's comment with the reply halo without a reply bar. */
  highlightCommentId?: string;
  /** The lab draws no "no comments yet" line under the post in the own-post menu scene. */
  hideEmptyNote?: boolean;
}

export type Sheet =
  | { type: "post" }
  | { type: "share" }
  | { type: "shareTargets" }
  | { type: "comment"; commentId: string }
  | { type: "report"; target: { type: ReportTargetType; id: string } }
  /** Dev only: the lab's combined comment-menu catalog. */
  | { type: "commentCatalog"; commentId: string };

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; data: ScreenData };
type CommentsStatus = "idle" | "loading" | "error";

export interface ReplyTarget {
  commentId: string;
  authorId: string;
  name: string;
}

const POLL_MS = 5000;
const POLL_MAX = 24;
const DISMISSED_KEY = "safeplace.dismissedUploaderNotices.v1";

async function readDismissed(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function usePostController(backend: PostBackend, postId: string, init: DevInit = {}) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [stats, setStats] = useState({ liked: false, likes: 0, saved: false, comments: 0 });
  const [comments, dispatch] = useReducer(commentsReducer, emptyComments);
  const [names, setNames] = useState<Record<string, string>>({});
  const [commentsStatus, setCommentsStatus] = useState<CommentsStatus>("idle");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<OutgoingImage | null>(null);
  const [sending, setSending] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(init.sheet ?? null);
  const [reportChoice, setReportChoice] = useState<number | null>(init.reportSelected ?? null);
  const [reportDetails, setReportDetails] = useState("");
  const [toast, setToast] = useState<string | null>(init.toast ?? null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const initReply = useRef(init.replyToCommentId);

  const flash = useCallback((message: string) => setToast(message), []);

  const applyScreen = useCallback((data: ScreenData) => {
    setLoad({ status: "ready", data });
    const s = data.post?.post.stats;
    setStats({ liked: s?.viewerLiked ?? false, likes: s?.likeCount ?? 0, saved: s?.viewerSaved ?? false, comments: s?.commentCount ?? 0 });
  }, []);

  const loadPost = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      applyScreen(await backend.load(postId));
    } catch {
      setLoad({ status: "error" });
    }
  }, [backend, postId, applyScreen]);

  const loadMoreComments = useCallback(async () => {
    setCommentsStatus("loading");
    try {
      const page = await backend.loadComments(postId, comments.nextCursor);
      setNames((n) => ({ ...n, ...page.names }));
      dispatch({ type: "page", threads: page.threads, nextCursor: page.nextCursor });
      setCommentsStatus("idle");
    } catch {
      setCommentsStatus("error");
    }
  }, [backend, postId, comments.nextCursor]);

  useEffect(() => {
    void loadPost();
    void readDismissed().then((ids) => setDismissed(new Set(ids)));
  }, [backend, postId]);

  const ready = load.status === "ready" && load.data.post !== null;
  useEffect(() => {
    if (ready) void loadMoreComments();
  }, [ready]);

  // Fixture scenes open in reply mode on a given comment.
  useEffect(() => {
    const id = initReply.current;
    if (!id) return;
    for (const t of comments.threads) {
      for (const c of [t.comment, ...t.replies]) {
        if (c.id === id) {
          setReplyTo({ commentId: id, authorId: c.authorId, name: names[c.authorId] ?? "" });
          initReply.current = undefined;
        }
      }
    }
  }, [comments.threads, names]);

  // --- follow the uploader's own media until the pipeline resolves it ------------------

  const postMedia = load.status === "ready" ? (load.data.post?.media ?? []) : [];
  const isAuthor = load.status === "ready" && load.data.post?.post.authorId === load.data.viewerId;
  const postUnsettled = isAuthor && hasUnsettledMedia(postMedia);
  useEffect(() => {
    if (!postUnsettled) return;
    let tries = 0;
    const t = setInterval(() => {
      if (++tries > POLL_MAX) return clearInterval(t);
      backend.load(postId).then(applyScreen, () => undefined);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [postUnsettled, backend, postId, applyScreen]);

  const viewerId = load.status === "ready" ? load.data.viewerId : "";
  const ownUnsettled = comments.threads
    .flatMap((t) => [t.comment, ...t.replies])
    .filter((c) => c.authorId === viewerId && hasUnsettledMedia(c.media))
    .map((c) => c.id)
    .join(",");
  useEffect(() => {
    if (!ownUnsettled) return;
    let tries = 0;
    const ids = ownUnsettled.split(",");
    const t = setInterval(() => {
      if (++tries > POLL_MAX) return clearInterval(t);
      backend
        .refreshCommentMedia(ids)
        .then((m) => m.forEach((media, commentId) => dispatch({ type: "media", commentId, media })), () => undefined);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [ownUnsettled, backend]);

  // --- actions ------------------------------------------------------------------------

  const guarded = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch {
        flash(postCopy.toast.failed);
      }
    },
    [flash]
  );

  const toggleLike = () => {
    const next = toggleLiked({ liked: stats.liked, likes: stats.likes });
    setStats((s) => ({ ...s, ...next }));
    void backend.setPostLiked(postId, next.liked).catch(() => {
      setStats((s) => ({ ...s, liked: stats.liked, likes: stats.likes }));
      flash(postCopy.toast.failed);
    });
  };

  const toggleSave = () => {
    const saved = !stats.saved;
    setStats((s) => ({ ...s, saved }));
    void backend.setPostSaved(postId, saved).catch(() => {
      setStats((s) => ({ ...s, saved: !saved }));
      flash(postCopy.toast.failed);
    });
  };

  const toggleCommentLike = (c: Comment) => {
    dispatch({ type: "liked", commentId: c.id });
    void backend.setCommentLiked(c.id, !c.viewerLiked).catch(() => {
      dispatch({ type: "liked", commentId: c.id });
      flash(postCopy.toast.failed);
    });
  };

  const startReply = (c: Comment) => setReplyTo({ commentId: c.id, authorId: c.authorId, name: names[c.authorId] ?? "" });

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    const a = res.canceled ? null : res.assets[0];
    if (a) setImage({ uri: a.uri, contentType: a.mimeType ?? "image/jpeg" });
  };

  const send = async () => {
    if (sending || (!draft.trim() && !image)) return;
    setSending(true);
    await guarded(async () => {
      const comment = await backend.sendComment({
        postId,
        text: draft.trim(),
        parentCommentId: replyTo ? rootOf(comments.threads, replyTo.commentId) : null,
        replyToUserId: replyTo?.authorId ?? null,
        image,
      });
      dispatch({ type: "added", comment });
      setStats((s) => ({ ...s, comments: s.comments + 1 }));
      setDraft("");
      setImage(null);
      setReplyTo(null);
    });
    setSending(false);
  };

  const copyLink = async (link: string | null) => {
    setSheet(null);
    if (!link) return;
    await guarded(async () => {
      await Clipboard.setStringAsync(link);
      flash(postCopy.toast.linkCopied);
    });
  };

  const submitReport = async () => {
    if (sheet?.type !== "report" || reportChoice == null) return;
    const target = sheet.target;
    const category = REPORT_CATEGORIES[reportChoice];
    setSheet(null);
    setReportChoice(null);
    setReportDetails("");
    if (!category) return;
    await guarded(async () => {
      await backend.report(target, category, reportDetails);
      flash(feedbackCopy.reportSent);
    });
  };

  const mute = async (userId: string) => {
    setSheet(null);
    // Silent (lab `commentMenu`): no toast. Their comments leave this screen at once.
    await guarded(async () => {
      await backend.mute(userId);
      dispatch({ type: "hideAuthor", userId });
    });
  };

  const shareTo = async (groupId: string) => {
    setSheet(null);
    await guarded(async () => {
      await backend.shareToGroup(postId, groupId);
      flash(postCopy.toast.shared);
    });
  };

  const dismissNotice = (mediaId: string) => {
    const next = new Set(dismissed).add(mediaId);
    setDismissed(next);
    AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])).catch(() => undefined);
  };

  const removeOwnMedia = (mediaId: string, commentId?: string) =>
    guarded(async () => {
      await backend.removeMedia(mediaId);
      if (commentId) {
        const c = comments.threads.flatMap((t) => [t.comment, ...t.replies]).find((x) => x.id === commentId);
        dispatch({ type: "media", commentId, media: (c?.media ?? []).filter((m: MediaView) => m.id !== mediaId) });
      } else {
        await loadPost();
      }
    });

  const appeal = (mediaId: string) =>
    guarded(async () => {
      await backend.appeal(mediaId);
      flash(postCopy.toast.appealSent);
    });

  return {
    load,
    stats,
    comments,
    names,
    commentsStatus,
    replyTo,
    setReplyTo,
    draft,
    setDraft,
    image,
    setImage,
    sending,
    sheet,
    setSheet,
    reportChoice,
    setReportChoice,
    reportDetails,
    setReportDetails,
    toast,
    setToast,
    dismissed,
    reload: loadPost,
    loadMoreComments,
    toggleLike,
    toggleSave,
    toggleCommentLike,
    startReply,
    pickImage,
    send,
    copyLink,
    submitReport,
    mute,
    shareTo,
    dismissNotice,
    removeOwnMedia,
    appeal,
  };
}
