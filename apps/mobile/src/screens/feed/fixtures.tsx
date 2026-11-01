import type { ReactNode } from "react";
import { Platform } from "react-native";
import type { FeedItem, MediaView } from "@safeplace/api-client";
import { resolveUploaderMediaViews } from "@safeplace/api-client";
import type { Viewer } from "@safeplace/visibility-policy";
import { POSTS, SceneArt, type FixturePost, type SceneKey } from "@/gallery/fixtures";
import type { FeedApi } from "./api";
import type { EntryLabel, FeedEntry, FollowItemVM, SpaceCardVM } from "./types";

/**
 * DEV-ONLY fixture mode for visual verification: `/?fixtures=<scene>` on Expo
 * web feeds the lab scenes' data through the REAL feed screen, so it can be
 * diffed against the lab / reference PNGs with scripts/pixel-compare. Guarded by
 * __DEV__; never active in a production bundle and never touches the network.
 */

export type FixtureSheet = "menu" | "why" | "plus" | "report" | "share";

export interface FixtureScene {
  status: "ready" | "empty" | "error" | "loading";
  entries: FeedEntry[];
  /** Show the statuses + spaces zones (the lab's menu / report scenes omit them). */
  zones?: boolean;
  /** The lab's plusMenu scene shows only the zones: no posts and no empty state. */
  hideList?: boolean;
  collapsed?: boolean;
  expandedOver?: boolean;
  /** `expanded` fakes a scrolled list with 330px of padding under the panel. */
  listPaddingTop?: number;
  /** The lab's `own` scene draws its media 150px tall. */
  mediaHeight?: number;
  /** The share scene is drawn for a post whose link cannot be copied. */
  noCopyLink?: boolean;
  followRail?: boolean;
  sheet?: FixtureSheet;
  toast?: boolean;
}

/** Dev-only, web-only: any `?fixtures=` (the placeholder tabs use it without a scene). */
export function inFixtureMode(): boolean {
  return __DEV__ && Platform.OS === "web" && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("fixtures");
}

export function fixtureSceneName(): string | null {
  return inFixtureMode() ? new URLSearchParams(window.location.search).get("fixtures") : null;
}

/** Renders the lab's abstract picture stand-ins for `fixture:<scene>` urls. */
export function fixtureMediaSlot(url: string | null | undefined): ReactNode | null {
  if (!url || !url.startsWith("fixture:")) return null;
  const [k, top] = url.slice("fixture:".length).split(":");
  return <SceneArt k={k as SceneKey} top={top === "top"} />;
}

const NOW = () => Date.now();
const ago = (minutes: number) => new Date(NOW() - minutes * 60_000).toISOString();

const media = (id: string, key: SceneKey, classification: MediaView["classification"] = "general", levels: MediaView["levels"] = null): MediaView => ({
  id,
  classification,
  filtered: false,
  redacted: false,
  levels,
  storagePath: id,
  url: `fixture:${key}`,
});
const filteredMedia = (id: string): MediaView => ({
  id,
  classification: "contains_women",
  filtered: true,
  redacted: false,
  levels: null,
  storagePath: null,
  url: null,
});

const ME = "me";
const VIEWER: Viewer = {
  userId: ME,
  gender: "male",
  filterSettings: {
    hideContentWithWomen: true,
    contentLevels: { sex: 0, violence: 0, religion: 0, addictions: 0 },
    hideWomenAccounts: false,
    showSuggestedPosts: true,
    genderSeparationInMessages: false,
    genderSeparationInSearch: false,
    filterAppliesToAvatars: false,
  },
  groupMemberships: new Set(["g1", "g2"]),
  familySpaceMemberships: new Set(),
  following: new Set(),
  blockedUsers: new Set(),
  mutedUsers: new Set(),
  suppressedSuggestions: new Set(),
};

function entry(p: {
  id: string;
  author: string;
  authorId?: string;
  ageMin: number;
  text: string;
  label: EntryLabel;
  media?: MediaView[];
  likes?: number;
  comments?: number;
  liked?: boolean;
  saved?: boolean;
  location?: string;
  placement?: "followed" | "suggested";
  quote?: FeedEntry["quote"];
  quotedPostId?: string;
}): FeedEntry {
  const authorId = p.authorId ?? `u-${p.author}`;
  const item: FeedItem = {
    id: p.id,
    authorId,
    text: p.text,
    sourceKind: "profile",
    sourceGroupId: null,
    sourceSpaceId: null,
    locationTag: p.location ?? null,
    quotedPostId: p.quotedPostId ?? null,
    createdAt: ago(p.ageMin),
    publishedAt: ago(p.ageMin),
    audiences: [{ kind: "public" }],
    media: p.media ?? [],
    stats: { likeCount: p.likes ?? 0, commentCount: p.comments ?? 0, viewerLiked: Boolean(p.liked), viewerSaved: Boolean(p.saved) },
    placement: p.placement ?? "followed",
    sortKey: p.id,
  };
  return {
    item,
    authorName: p.author,
    label: p.label,
    quote: p.quote ?? null,
    uploaderMedia:
      authorId === ME ? resolveUploaderMediaViews(item.media.map((m) => ({ id: m.id, classification: m.classification, levels: m.levels })), "male") : null,
  };
}

const labelOf = (p: FixturePost): EntryLabel => {
  const s = p.data.source;
  if (s?.kind === "group") return { kind: "group", name: s.name ?? "", color: s.color ?? null, icon: s.icon ?? null, targetId: "g1" };
  return { kind: (s?.kind ?? "public") as "public" | "followers" | "suggested" };
};

/** A lab POSTS[i] as a feed entry (age in minutes chosen to format as the lab's time string). */
function fromLab(i: number, ageMin: number, id = `p${i}`): FeedEntry {
  const p = POSTS[i]!;
  const d = p.data;
  const mk = p.filtered ? [filteredMedia(`${id}-m`)] : p.media ? [media(`${id}-m`, p.media)] : [];
  return entry({
    id,
    author: d.author.name,
    ageMin,
    text: d.body ?? "",
    label: labelOf(p),
    media: mk,
    likes: d.likes,
    comments: d.comments,
    liked: d.liked,
    saved: d.saved,
    location: d.location,
    placement: d.source?.kind === "suggested" ? "suggested" : "followed",
  });
}

const lab = {
  p0: () => fromLab(0, 121),
  p1: () => fromLab(1, 241),
  p2: () => fromLab(2, 361),
  p3: () => fromLab(3, 25 * 60 + 1),
};

const RAMOT: EntryLabel = { kind: "group", name: "שכונת רמות", color: "#2E3A8C", icon: "home", targetId: "g1" };
const OWN = { author: "אבי מזרחי", authorId: ME, label: { kind: "public" } as EntryLabel, text: "" };

const SPACES: SpaceCardVM[] = [
  { id: "g1", kind: "group", name: "שכונת רמות", color: "#2E3A8C", icon: "home", previewText: "", media: { ...media("s1", "street"), url: "fixture:street:top" }, lastAuthor: "משה רוזנברג", publishedAt: ago(121) },
  { id: "f1", kind: "family_space", name: "משפחת מזרחי", color: null, icon: null, previewText: "מזל טוב לסבתא ליום הולדתה! נתראה בשבת אצלנו 🎂", media: null, lastAuthor: "רחל מזרחי", publishedAt: ago(181) },
  { id: "g2", kind: "group", name: "גמ״ח ספרים", color: "#5B8C5A", icon: "users", previewText: "הגיעו ספרי קודש חדשים לגמ״ח — אפשר לשאול מיום ראשון.", media: null, lastAuthor: "שמואל ב.", publishedAt: ago(25 * 60 + 1) },
];

const SUGGESTIONS: FollowItemVM[] = [
  { userId: "1", name: "ישראל אברהמי", bio: "שיעורים יומיים בדף היומי", followers: 2431 },
  { userId: "2", name: "לוח קהילתי רמות", bio: "מודעות ועדכונים מהשכונה", followers: 890 },
  { userId: "3", name: "נתן שפירא", followers: 312 },
];

const quoteOriginal = () =>
  entry({ id: "q-orig", author: "הרב אליהו כהן", ageMin: 25 * 60, text: POSTS[1]!.data.body ?? "", label: { kind: "public" } }).item;

export const FIXTURE_SCENES: Record<string, () => FixtureScene> = {
  feed: () => ({ status: "ready", entries: [lab.p0(), lab.p1()] }),
  scrolled: () => ({ status: "ready", entries: [lab.p2(), lab.p3()], collapsed: true, followRail: true }),
  menu: () => ({ status: "ready", entries: [lab.p2()], zones: false, sheet: "menu" }),
  why: () => ({ status: "ready", entries: [lab.p2()], zones: false, sheet: "why" }),
  plusMenu: () => ({ status: "ready", entries: [], hideList: true, sheet: "plus" }),
  report: () => ({ status: "ready", entries: [lab.p1()], zones: false, sheet: "report" }),
  reportSent: () => ({ status: "ready", entries: [lab.p1(), lab.p3()], zones: false, toast: true }),
  share: () => ({ status: "ready", entries: [lab.p0()], zones: false, sheet: "share", noCopyLink: true }),
  own: () => ({
    status: "ready",
    zones: false,
    mediaHeight: 150,
    entries: [
      entry({ ...OWN, id: "own1", ageMin: 10, text: "ערב שבת בבית 🕯️", media: [media("o1", "table", "pending_review")] }),
      entry({ ...OWN, id: "own2", ageMin: 61, text: "שמחת בר המצווה של יוסי 🎉", likes: 3, comments: 1, media: [media("o2", "table", "contains_women", { sex: 1, violence: 1, religion: 0, addictions: 0 })] }),
    ],
  }),
  empty: () => ({ status: "empty", entries: [] }),
  error: () => ({ status: "error", entries: [] }),
  skeleton: () => ({ status: "loading", entries: [] }),
  expanded: () => ({ status: "ready", entries: [lab.p2()], collapsed: true, expandedOver: true, listPaddingTop: 274 }),
  quote: () => ({
    status: "ready",
    zones: false,
    entries: [
      entry({
        ...OWN,
        id: "quote1",
        ageMin: 20,
        text: "מילים כל כך נכונות, שווה לקרוא 👇",
        label: RAMOT,
        likes: 4,
        quotedPostId: "q-orig",
        quote: { state: "available", post: quoteOriginal(), authorName: "הרב אליהו כהן" },
      }),
      entry({ ...OWN, id: "quote2", ageMin: 20, text: "שווה לקרוא 👇", label: RAMOT, likes: 4, quotedPostId: "gone", quote: { state: "unavailable" } }),
    ],
  }),
};

export function createFixtureApi(scene: FixtureScene): FeedApi {
  const ok = () => Promise.resolve();
  return {
    viewer: VIEWER,
    loadPage: () =>
      scene.status === "error"
        ? Promise.reject(new Error("fixture: error scene"))
        : scene.status === "loading"
          ? new Promise(() => {})
          : Promise.resolve({ entries: scene.entries, cursor: null }),
    loadSpaces: () => Promise.resolve(scene.zones === false || scene.status !== "ready" ? [] : SPACES),
    loadSuggestions: () => Promise.resolve(scene.followRail ? SUGGESTIONS : []),
    loadPinned: () => Promise.resolve([]),
    setLiked: ok,
    setSaved: ok,
    mute: ok,
    feedback: ok,
    report: ok,
    follow: ok,
    setFollowedOnly: ok,
    copyLinkFor: () => (scene.noCopyLink ? null : "https://fixture.invalid/post"),
    shareTargetFor: () => Promise.resolve({ groupId: "g1", name: "שכונת רמות" }),
    shareToGroup: ok,
    removeMedia: ok,
    appeal: ok,
  };
}
