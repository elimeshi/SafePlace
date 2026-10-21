import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { newFeedSeed } from "@safeplace/api-client";
import type { FeedApi } from "./api";
import { feedReducer, initialFeedState, visibleEntries } from "./reducer";
import type { FeedEntry, FollowItemVM, SpaceCardVM } from "./types";

/**
 * Thin hook over the reducer: owns the seed (one per feed visit, redrawn on
 * pull-to-refresh), the three zone loads, keyset pagination, and optimistic
 * like / save. All decisions live in the api layer and the pure reducer.
 */
export function useFeed(makeApi: () => Promise<FeedApi>) {
  const [api, setApi] = useState<FeedApi | null>(null);
  const [state, dispatch] = useReducer(feedReducer, undefined, () => initialFeedState(newFeedSeed()));
  const [spaces, setSpaces] = useState<SpaceCardVM[] | null>(null);
  const [suggestions, setSuggestions] = useState<FollowItemVM[]>([]);
  const seedRef = useRef(state.seed);
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionStart = useRef(new Date().toISOString());

  const loadAll = useCallback(async (a: FeedApi, seed: string) => {
    seedRef.current = seed;
    const zones = Promise.all([a.loadSpaces(seed).catch(() => []), a.loadSuggestions(seed).catch(() => [])]);
    try {
      const page = await a.loadPage(seed, null);
      // The zones are measured once by CollapsibleZones, so they land together with the first page.
      const [sp, sg] = await zones;
      if (seedRef.current !== seed) return;
      setSpaces(sp);
      setSuggestions(sg);
      dispatch({ type: "loaded", seed, entries: page.entries, cursor: page.cursor });
    } catch {
      if (seedRef.current === seed) dispatch({ type: "failed" });
      setSpaces((prev) => prev ?? []);
    }
  }, []);

  const start = useCallback(() => {
    const seed = newFeedSeed();
    dispatch({ type: "refreshStart", seed });
    makeApi().then(
      (a) => {
        setApi(a);
        void loadAll(a, seed);
      },
      () => dispatch({ type: "failed" })
    );
  }, [makeApi, loadAll]);

  useEffect(() => {
    start();
    // once per mount: a feed visit
  }, []);

  const refresh = useCallback(() => {
    if (!api) return start();
    const seed = newFeedSeed();
    dispatch({ type: "refreshStart", seed });
    void loadAll(api, seed);
  }, [api, start, loadAll]);

  /** First-load retry from the error state (refreshStart returns it to the skeleton). */
  const retry = start;

  const loadMore = useCallback(() => {
    const s = stateRef.current;
    // A null cursor means the feed is exhausted (feed_page filters before its LIMIT).
    if (!api || s.phase !== "ready" || s.end || s.loadingMore || !s.cursor) return;
    const seed = s.seed;
    dispatch({ type: "moreStart" });
    api.loadPage(seed, s.cursor).then(
      (page) => seedRef.current === seed && dispatch({ type: "moreLoaded", entries: page.entries, cursor: page.cursor }),
      () => dispatch({ type: "moreFailed" })
    );
  }, [api]);

  /** Own posts published since this visit began, pinned to the top (called on screen focus). */
  const refreshPinned = useCallback(() => {
    if (!api) return;
    api.loadPinned(sessionStart.current).then(
      (entries) => entries.length && dispatch({ type: "pin", entries }),
      () => undefined
    );
  }, [api]);

  const find = (postId: string): FeedEntry | undefined =>
    [...stateRef.current.pinned, ...stateRef.current.entries].find((e) => e.item.id === postId);

  const toggleLike = useCallback(
    (postId: string) => {
      const was = find(postId)?.item.stats?.viewerLiked;
      if (!api || was === undefined) return;
      dispatch({ type: "toggleLike", postId });
      api.setLiked(postId, !was).catch(() => dispatch({ type: "toggleLike", postId }));
    },
    [api]
  );

  const toggleSave = useCallback(
    (postId: string) => {
      const was = find(postId)?.item.stats?.viewerSaved;
      if (!api || was === undefined) return;
      dispatch({ type: "toggleSave", postId });
      api.setSaved(postId, !was).catch(() => dispatch({ type: "toggleSave", postId }));
    },
    [api]
  );

  return {
    api,
    state,
    dispatch,
    entries: visibleEntries(state),
    spaces,
    suggestions,
    setSuggestions,
    refresh,
    retry,
    loadMore,
    refreshPinned,
    toggleLike,
    toggleSave,
  };
}
