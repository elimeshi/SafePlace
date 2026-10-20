import type { Comment, CommentThread, MediaView, PostItem } from "@safeplace/api-client";
import type { MediaClassification } from "@safeplace/visibility-policy";
import type { CommentsPageView, PostBackend, PostView, ScreenData } from "./data";
import type { DevInit } from "./usePostController";

/**
 * DEV-ONLY fixture scenes: the lab's data (feed-lab.html `post`, `share`,
 * `ownMenu`, `reply`, `commentMenu`, ...) behind the same `PostBackend` the
 * real screen uses, so the REAL screen renders at 390x844 on Expo web and can be
 * diffed against the lab (scripts/pixel-compare). Reached only through
 * `/dev-post?fixtures=<scene>` under `__DEV__`; never part of a production build.
 */

const NOW = Date.now();
const ago = (min: number) => new Date(NOW - min * 60_000 - 5_000).toISOString();

const ME = "me";
const SARA = "sara";
const MOSHE = "moshe";
const YOSSI = "yossi";
const names: Record<string, string> = {
  [ME]: "אבי מזרחי",
  [SARA]: "שרה גולדברג",
  [MOSHE]: "משה רוזנברג",
  [YOSSI]: "יוסי ברק",
  eli: "הרב אליהו כהן",
};

const media = (id: string, classification: MediaClassification, over: Partial<MediaView> = {}): MediaView => ({
  id,
  classification,
  filtered: false,
  redacted: false,
  storagePath: null,
  url: "fixture:street",
  ...over,
});

const post = (over: Partial<PostItem> = {}): PostItem => ({
  id: "p1",
  authorId: MOSHE,
  text: "תודה ענקית לכל המתנדבים שהגיעו אתמול לחלוקת החבילות לקראת החג. הקהילה שלנו פשוט מדהימה 💙",
  sourceKind: "group",
  sourceGroupId: "g1",
  sourceSpaceId: null,
  locationTag: null,
  quotedPostId: null,
  createdAt: ago(125),
  publishedAt: ago(125),
  audiences: [{ kind: "group", groupId: "g1" }],
  media: [media("m1", "general")],
  stats: { likeCount: 42, commentCount: 8, viewerLiked: true, viewerSaved: false },
  ...over,
});

const view = (over: Partial<PostView> = {}, p: Partial<PostItem> = {}): PostView => {
  const item = post(p);
  return {
    post: item,
    authorName: names[item.authorId] ?? "",
    source: { kind: "group", name: "שכונת רמות", color: "#2E3A8C", icon: "home" },
    media: item.media,
    quote: null,
    copyLink: null,
    shareTargets: [{ id: "g1", name: "שכונת רמות", color: "#2E3A8C", icon: "home" }],
    ...over,
  };
};

const comment = (id: string, authorId: string, text: string, min: number, over: Partial<Comment> = {}): Comment => ({
  id,
  postId: "p1",
  authorId,
  parentCommentId: null,
  replyToUserId: null,
  text,
  createdAt: ago(min),
  editedAt: null,
  likeCount: 0,
  viewerLiked: false,
  media: [],
  ...over,
});

const SARA_C = comment("c1", SARA, "איזה יופי! תודה על הארגון המושלם 👏", 65, { likeCount: 6, viewerLiked: true });
const MOSHE_R = comment("r1", MOSHE, "תודה רבה, בזכותכם!", 40, { parentCommentId: "c1", replyToUserId: SARA });
const YOSSI_MEDIA = comment("c2", YOSSI, "הנה תמונה מהחלוקה בבוקר:", 30, {
  likeCount: 2,
  media: [media("cm1", "contains_women", { filtered: true, url: null })],
});
const YOSSI_Q = comment("c2", YOSSI, "מתי החלוקה הבאה?", 30, { likeCount: 2 });

const thread = (c: Comment, replies: Comment[] = []): CommentThread => ({ comment: c, replies });

export interface Scene {
  data: ScreenData | "loading" | "error";
  comments: CommentsPageView;
  init?: DevInit;
}

const base = (p: PostView | null, extra: Partial<ScreenData> = {}): ScreenData => ({
  viewerId: ME,
  viewerName: names[ME] ?? "",
  viewerGender: "male",
  post: p,
  ...extra,
});

const page = (threads: CommentThread[], more = false): CommentsPageView => ({
  threads,
  nextCursor: more ? { createdAt: ago(20), id: "c2" } : null,
  names,
});

const MAIN = page([thread(SARA_C, [MOSHE_R]), thread(YOSSI_MEDIA)], true);
const OWN = view({ copyLink: "https://safe-place.app/post/p1" }, { authorId: ME });

export const SCENES: Record<string, Scene> = {
  post: { data: base(view()), comments: MAIN },
  share: { data: base(view()), comments: page([]), init: { sheet: { type: "share" } } },
  ownMenu: { data: base(OWN), comments: page([]), init: { sheet: { type: "post" }, hideEmptyNote: true } },
  reply: {
    data: base(view()),
    comments: page([thread(SARA_C, [MOSHE_R]), thread(YOSSI_Q)]),
    init: { replyToCommentId: "c1", scrollToCommentsAt: 16 },
  },
  commentMenu: {
    data: base(view()),
    comments: page([thread(YOSSI_Q)]),
    init: { sheet: { type: "commentCatalog", commentId: "c2" }, highlightCommentId: "c2", scrollToCommentsAt: 16 },
  },
  report: { data: base(view()), comments: MAIN, init: { sheet: { type: "report", target: { type: "post", id: "p1" } }, reportSelected: 1 } },
  reportSent: { data: base(view()), comments: MAIN, init: { toast: "הדיווח התקבל ויטופל בהקדם" } },
  quote: {
    data: base(
      view(
        { quote: { state: "available", id: "p9", authorName: names.eli ?? "", createdAt: ago(60 * 26), text: "מחשבה קצרה לפרשת השבוע: לפעמים הדבר הגדול ביותר שאפשר לתת לזולת הוא פשוט להקשיב. שבת שלום לכולם." } },
        { authorId: ME, text: "מילים כל כך נכונות, שווה לקרוא 👇", media: [], stats: { likeCount: 4, commentCount: 0, viewerLiked: false, viewerSaved: false } }
      )
    ),
    comments: page([]),
  },
  quoteGone: {
    data: base(
      view({ quote: { state: "unavailable" } }, { authorId: ME, text: "שווה לקרוא 👇", media: [], stats: { likeCount: 4, commentCount: 0, viewerLiked: false, viewerSaved: false } })
    ),
    comments: page([]),
  },
  skeleton: { data: "loading", comments: page([]) },
  error: { data: "error", comments: page([]) },
  unavailable: { data: base(null), comments: page([]) },
  noComments: { data: base(view()), comments: page([]) },
  // Own post, one scene per uploader state (03 §2.1, moderation-pipeline §2-3).
  ownProcessing: { data: base(view({ media: [media("m1", "unclassified")] }, { authorId: ME, media: [media("m1", "unclassified")] })), comments: page([]) },
  ownReview: { data: base(view({ media: [media("m1", "pending_review")] }, { authorId: ME, media: [media("m1", "pending_review")] })), comments: page([]) },
  ownNotice: { data: base(view({ media: [media("m1", "contains_women")] }, { authorId: ME, media: [media("m1", "contains_women")] })), comments: page([]) },
  // Somebody else's post whose media this viewer's filter withholds.
  filtered: { data: base(view({ media: [media("m1", "contains_women", { filtered: true, url: null })] })), comments: MAIN },
};

export function createFixtureBackend(scene: Scene): PostBackend {
  const ok = () => Promise.resolve();
  return {
    load: () =>
      scene.data === "loading"
        ? new Promise<ScreenData>(() => undefined)
        : scene.data === "error"
          ? Promise.reject(new Error("fixture error"))
          : Promise.resolve(scene.data),
    loadComments: () => Promise.resolve(scene.comments),
    refreshCommentMedia: () => Promise.resolve(new Map()),
    setPostLiked: ok,
    setPostSaved: ok,
    setCommentLiked: ok,
    sendComment: (p) =>
      Promise.resolve(comment(`new-${Date.now()}`, ME, p.text, 0, { parentCommentId: p.parentCommentId, replyToUserId: p.replyToUserId })),
    mute: ok,
    report: ok,
    shareToGroup: ok,
    removeMedia: ok,
    appeal: ok,
  };
}
