import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, View, type NativeScrollEvent, type NativeSyntheticEvent, type ViewToken } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import {
  CollapsedStrip,
  CollapsibleZones,
  EmptyState,
  ExpandedPanel,
  FollowRail,
  OwnPostMenuSheet,
  PlusMenuSheet,
  PostMenuSheet,
  ReportSheet,
  ShareSheet,
  Skeleton,
  SkeletonPostCard,
  SpaceCard,
  SpacesRail,
  StatusesRail,
  Toast,
  WhySheet,
  feedbackCopy,
} from "@safeplace/ui";
import { theme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/session/SessionProvider";
import { createFeedApi, type FeedApi } from "./api";
import { AppBar } from "./AppBar";
import { FeedPost, isIcon, type FeedPostActions } from "./FeedPost";
import { FIXTURE_SCENES, createFixtureApi, fixtureMediaSlot, fixtureSceneName, type FixtureScene } from "./fixtures";
import { nextCollapsed, shouldShowFollowRail } from "./scroll";
import { SheetHost, StatusBand, useTabBarHeight } from "./shell";
import type { FeedEntry } from "./types";
import { useFeed } from "./useFeed";
import { toSpaceProps } from "./viewModel";

type Sheet =
  | { type: "plus" }
  | { type: "menu"; id: string }
  | { type: "why"; id: string }
  | { type: "report"; id: string }
  | { type: "share"; id: string };

const TOAST_MS = 3000;
const REPORT_TOAST_BOTTOM = 96;

/** Opaque route push: typed routes are generated per build, and /compose, /post, /group, ... belong to other screens. */
const useGo = () => {
  const router = useRouter();
  return useCallback((path: string) => router.push(path as Href), [router]);
};

/** Dev fixture scene selected by `?fixtures=` (web, __DEV__ only), else null. */
function useFixtureScene(): FixtureScene | null {
  return useMemo(() => {
    const name = fixtureSceneName();
    return name ? (FIXTURE_SCENES[name]?.() ?? null) : null;
  }, []);
}

/**
 * The main feed (01-feed-spec): four zones (statuses, spaces, posts, follow
 * suggestions), collapse-on-scroll, pull-to-refresh, keyset pagination. Every
 * visibility decision is made upstream (RLS, api-client, visibility-policy);
 * this screen only renders what it is handed and wires the explicit signals.
 */
export function FeedScreen() {
  const go = useGo();
  const { user } = useSession();
  const scene = useFixtureScene();
  const tabBarHeight = useTabBarHeight();

  const makeApi = useRef<() => Promise<FeedApi>>(() =>
    scene
      ? Promise.resolve(createFixtureApi(scene))
      : createFeedApi(
          supabase,
          user?.id ?? "",
          process.env.EXPO_PUBLIC_WEB_BASE_URL ?? Linking.createURL("/")
        )
  ).current;

  const feed = useFeed(makeApi);
  const { api, state, dispatch, entries, spaces, suggestions, setSuggestions } = feed;

  const [collapsed, setCollapsed] = useState(scene?.collapsed ?? false);
  const [expandedOver, setExpandedOver] = useState(scene?.expandedOver ?? false);
  const [railDismissed, setRailDismissed] = useState(false);
  const [lastVisible, setLastVisible] = useState(-1);
  const [sheet, setSheet] = useState<Sheet | null>(
    scene?.sheet === "plus"
      ? { type: "plus" }
      : scene?.sheet
        ? { type: scene.sheet, id: scene.entries[0]?.item.id ?? "" }
        : null
  );
  const [toast, setToast] = useState(scene?.toast ?? false);
  const [reportCategory, setReportCategory] = useState<number | null>(scene?.sheet === "report" ? 1 : null);
  const [reportDetails, setReportDetails] = useState("");
  const [followedOnly, setFollowedOnly] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ groupId: string; name: string } | null>(null);

  const entryOf = (id: string): FeedEntry | undefined => entries.find((e) => e.item.id === id);
  const sheetEntry = sheet && sheet.type !== "plus" ? entryOf(sheet.id) : undefined;

  // Own posts published since this visit began are pinned to the top when the feed regains focus.
  useFocusEffect(
    useCallback(() => {
      feed.refreshPinned();
    }, [api])
  );

  useEffect(() => {
    if (api) setFollowedOnly(!api.viewer.filterSettings.showSuggestedPosts);
  }, [api]);

  // Resolve who a share would go to (visibility-policy canSharePostInternally) when the sheet opens.
  useEffect(() => {
    setShareTarget(null);
    if (sheet?.type !== "share" || !api || !sheetEntry) return;
    let live = true;
    api.shareTargetFor(sheetEntry.item).then((t) => live && setShareTarget(t), () => undefined);
    return () => {
      live = false;
    };
  }, [sheet?.type, api]);

  const closeSheet = useCallback(() => setSheet(null), []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      setCollapsed((prev) => nextCollapsed(prev, y));
      if (y > 0) setExpandedOver(false); // scrolling again collapses the re-expanded zones (01 §6.3)
    },
    []
  );

  const viewability = useRef({
    viewabilityConfig: { itemVisiblePercentThreshold: 40 },
    onViewableItemsChanged: ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const last = viewableItems.reduce((m, v) => Math.max(m, v.index ?? -1), -1);
      setLastVisible(last);
    },
  }).current;

  const actions: FeedPostActions = useMemo(
    () => ({
      open: (id) => go(`/post/${id}`),
      openAuthor: (id) => go(`/author/${id}`),
      openSource: (e) => {
        if (e.label.kind === "group") go(`/group/${e.label.targetId}`);
        else if (e.label.kind === "family_space") go(`/space/${e.label.targetId}`);
      },
      more: (e) => setSheet({ type: "menu", id: e.item.id }),
      like: feed.toggleLike,
      save: feed.toggleSave,
      share: (e) => setSheet({ type: "share", id: e.item.id }),
      dismissNotice: (postId) => dispatch({ type: "dismissNotice", postId }),
      removeMedia: (e) => {
        const m = e.item.media[0];
        if (!api || !m) return;
        api.removeMedia(m.id).then(() => dispatch({ type: "mediaRemoved", postId: e.item.id, mediaId: m.id }), () => undefined);
      },
      appeal: (e) => {
        const m = e.uploaderMedia?.find((u) => u.state === "filtered_for_some_viewers");
        if (!api || !m) return;
        api.appeal(m.id).then(() => dispatch({ type: "dismissNotice", postId: e.item.id }), () => undefined);
      },
    }),
    [go, api, dispatch, feed.toggleLike, feed.toggleSave]
  );

  const now = Date.now();
  const showZones = scene?.zones !== false;
  const spaceCards = spaces ?? [];
  const hasSpaces = showZones && spaceCards.length > 0;
  const opts = { now, isIcon };

  const rails = showZones ? (
        <>
          <StatusesRail onCreate={() => setSheet({ type: "plus" })} />
          {hasSpaces ? (
            <SpacesRail>
              {spaceCards.map((c) => {
                const p = toSpaceProps(c, opts);
                return (
                  <SpaceCard
                    key={c.id}
                    kind={p.kind}
                    name={p.name}
                    color={p.color}
                    icon={p.icon}
                    previewText={p.previewText}
                    filtered={p.filtered}
                    media={p.mediaUrl ? (fixtureMediaSlot(p.mediaUrl) ?? <Image source={{ uri: p.mediaUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />) : undefined}
                    lastAuthor={p.lastAuthor}
                    time={p.time}
                    onPress={() => go(c.kind === "group" ? `/group/${c.id}` : `/space/${c.id}`)}
                  />
                );
              })}
            </SpacesRail>
          ) : null}
        </>
  ) : null;
  const zones = (
    <>
      <AppBar />
      {rails}
    </>
  );

  // ---- states ---------------------------------------------------------------
  let body: React.ReactNode;
  if (state.phase === "loading" || (state.phase === "ready" && spaces === null)) {
    body = (
      <>
        <AppBar />
        <StatusesRail emptyHint={null} />
        <View style={{ paddingTop: 4, paddingHorizontal: 18, paddingBottom: 8 }}>
          <Skeleton width={90} height={14} />
        </View>
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingBottom: 16 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width={156} height={150} radius={18} />
          ))}
        </View>
        <View style={{ flexDirection: "column", gap: 14, paddingTop: 4, paddingHorizontal: 14, paddingBottom: 18 }}>
          <SkeletonPostCard media />
          <SkeletonPostCard />
        </View>
      </>
    );
  } else if (state.phase === "error") {
    body = (
      <>
        <AppBar />
        <EmptyState variant="error" onAction={feed.retry} />
      </>
    );
  } else if (entries.length === 0 && !scene?.hideList) {
    body = (
      <>
        <AppBar />
        <StatusesRail emptyHint={null} onCreate={() => setSheet({ type: "plus" })} />
        {hasSpaces ? rails : null}
        <EmptyState variant="empty" onAction={() => go("/compose")} />
      </>
    );
  } else {
    body = (
      <View style={{ flex: 1 }}>
        <CollapsibleZones key={String(hasSpaces)} collapsed={collapsed} strip={<CollapsedStrip onPress={() => setExpandedOver(true)} />}>
          {zones}
        </CollapsibleZones>
        <View style={{ flex: 1 }}>
          <FlatList
            data={entries}
            keyExtractor={(e) => e.item.id}
            renderItem={({ item }) => (
              <FeedPost entry={item} noticeDismissed={state.noticeDismissed} actions={actions} now={now} mediaHeight={scene?.mediaHeight} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
            contentContainerStyle={{ paddingTop: 4 + (scene?.listPaddingTop ?? 0), paddingHorizontal: 14, paddingBottom: 18 }}
            ListFooterComponent={state.loadingMore ? <View style={{ paddingTop: 14 }}><SkeletonPostCard /></View> : null}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onEndReached={feed.loadMore}
            onEndReachedThreshold={0.6}
            refreshing={state.refreshing}
            onRefresh={feed.refresh}
            viewabilityConfig={viewability.viewabilityConfig}
            onViewableItemsChanged={viewability.onViewableItemsChanged}
            testID="feed-list"
          />
          {shouldShowFollowRail({ lastVisibleIndex: lastVisible, count: entries.length, dismissed: railDismissed, hasSuggestions: suggestions.length > 0 }) ? (
            <FollowRail
              style={{ position: "absolute", start: 0, end: 0, bottom: 0 }}
              items={suggestions}
              onDismiss={() => setRailDismissed(true)}
              onFollow={(userId) => {
                api?.follow(userId).then(
                  () => setSuggestions((s) => s.filter((x) => x.userId !== userId)),
                  () => undefined
                );
              }}
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="feed-screen">
      <StatusBand />
      {body}
      {expandedOver ? (
        <ExpandedPanel onCollapse={() => setExpandedOver(false)}>
          {rails}
        </ExpandedPanel>
      ) : null}
      {toast ? <Toast message={feedbackCopy.reportSent} bottom={Math.max(0, REPORT_TOAST_BOTTOM - tabBarHeight)} durationMs={TOAST_MS} onHide={() => setToast(false)} /> : null}
      {sheet ? (
        <SheetHost onDismiss={closeSheet}>
          {renderSheet()}
        </SheetHost>
      ) : null}
    </View>
  );

  function renderSheet() {
    if (!sheet) return null;
    if (sheet.type === "plus") {
      return (
        <PlusMenuSheet
          onDismiss={closeSheet}
          onPost={() => {
            closeSheet();
            go("/compose");
          }}
        />
      );
    }
    const e = sheetEntry;
    if (!e || !api) return null;
    const link = api.copyLinkFor(e.item);
    const copyLink = () => {
      if (link) void Clipboard.setStringAsync(link);
      closeSheet();
    };
    switch (sheet.type) {
      case "menu":
        return e.item.authorId === api.viewer.userId ? (
          <OwnPostMenuSheet
            canCopyLink={link !== null}
            onDismiss={closeSheet}
            onSave={() => {
              feed.toggleSave(e.item.id);
              closeSheet();
            }}
            onCopyLink={copyLink}
          />
        ) : (
          <PostMenuSheet
            variant={e.item.placement === "suggested" ? "suggested" : "standard"}
            authorName={e.authorName}
            canCopyLink={link !== null}
            onDismiss={closeSheet}
            onLessLikeThis={() => {
              dispatch({ type: "removeAuthor", authorId: e.item.authorId, onlySuggested: true });
              void api.feedback(e.item.authorId, "less_like_this").catch(() => undefined);
              closeSheet();
            }}
            onDontSuggest={() => {
              dispatch({ type: "removeAuthor", authorId: e.item.authorId, onlySuggested: true });
              void api.feedback(e.item.authorId, "dont_suggest").catch(() => undefined);
              closeSheet();
            }}
            onWhy={() => setSheet({ type: "why", id: e.item.id })}
            onSave={() => {
              feed.toggleSave(e.item.id);
              closeSheet();
            }}
            onMuteAuthor={() => {
              dispatch({ type: "removeAuthor", authorId: e.item.authorId, onlySuggested: false });
              void api.mute(e.item.authorId).catch(() => feed.refresh());
              closeSheet();
            }}
            onReport={() => {
              setReportCategory(null);
              setReportDetails("");
              setSheet({ type: "report", id: e.item.id });
            }}
            onCopyLink={copyLink}
          />
        );
      case "why":
        return (
          <WhySheet
            authorName={e.authorName}
            followedOnly={followedOnly}
            onDismiss={closeSheet}
            onFollowedOnlyChange={(v) => {
              setFollowedOnly(v);
              api.setFollowedOnly(v).then(
                () => v && dispatch({ type: "dropSuggested" }),
                () => setFollowedOnly(!v)
              );
            }}
          />
        );
      case "report":
        return (
          <ReportSheet
            value={reportCategory}
            onChange={setReportCategory}
            details={reportDetails}
            onDetailsChange={setReportDetails}
            onDismiss={closeSheet}
            onSubmit={() => {
              if (reportCategory === null) return;
              api.report(e.item.id, reportCategory, reportDetails).then(
                () => {
                  closeSheet();
                  setToast(true);
                },
                () => undefined
              );
            }}
          />
        );
      case "share":
        return (
          <ShareSheet
            canShareToGroup={shareTarget !== null}
            groupName={shareTarget?.name}
            canCopyLink={link !== null}
            onDismiss={closeSheet}
            onCopyLink={copyLink}
            onShareToGroup={() => {
              if (!shareTarget) return;
              api.shareToGroup(e.item, shareTarget.groupId).then(
                () => {
                  closeSheet();
                  feed.refreshPinned();
                },
                () => undefined
              );
            }}
          />
        );
    }
  }
}
