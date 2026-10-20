import { useEffect, useState, type ComponentProps, type ComponentType } from "react";
import { View, type ViewProps } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { BottomTabs, DirectionProvider, type TabKey } from "@safeplace/ui";
import { theme } from "@/lib/theme";
import { useSession } from "@/session/SessionProvider";
import { Splash } from "@/session/Splash";
import { inFixtureMode } from "@/screens/feed/fixtures";
import { TabBarHeightContext } from "@/screens/feed/shell";

/** Tab key -> the route it opens. Any other route (compose, post, group, ...) is full-screen, without the bar. */
const ROUTE_OF: Record<TabKey, string> = { home: "index", search: "search", profile: "profile" };
const TAB_OF: Record<string, TabKey> = { index: "home", search: "search", profile: "profile" };

/**
 * react-native-web resolves `start` / `end` through a locale context that only a `dir` prop sets (the DOM
 * attribute is not enough); RN 0.81's View type omits `dir`, and native ignores it.
 */
const DirView = View as unknown as ComponentType<ViewProps & { dir?: "ltr" | "rtl" }>;

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

function AppTabBar({ state, navigation, onHeight }: TabBarProps & { onHeight: (h: number) => void }) {
  const active = TAB_OF[state.routes[state.index]?.name ?? ""];
  useEffect(() => {
    if (!active) onHeight(0);
  }, [active, onHeight]);
  if (!active) return null;
  return (
    <View onLayout={(e) => onHeight(e.nativeEvent.layout.height)}>
      <BottomTabs active={active} onChange={(tab) => navigation.navigate(ROUTE_OF[tab])} />
    </View>
  );
}

/**
 * The authenticated area: a session gate (UI-tier defense-in-depth on top of
 * RLS, invariant #2) around the main tabs Home / Search / Profile. Search and
 * Profile are "coming soon" placeholders.
 */
export default function AppLayout() {
  const { session, initializing } = useSession();
  const [tabBarHeight, setTabBarHeight] = useState(0);

  if (initializing) return <Splash />;
  // Dev fixture mode (web, __DEV__) renders the real screens without a session, for pixel comparison.
  if (!session && !inFixtureMode()) return <Redirect href="/welcome" />;

  return (
    // The MVP is RTL-only (invariant #9); on web I18nManager.isRTL stays false, so the arrow glyphs need this stated.
    <DirectionProvider value="rtl">
      <TabBarHeightContext.Provider value={tabBarHeight}>
        <DirView dir="rtl" style={{ flex: 1 }}>
          <Tabs
            screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.colors.background } }}
            tabBar={(props) => <AppTabBar {...props} onHeight={setTabBarHeight} />}
          />
        </DirView>
      </TabBarHeightContext.Provider>
    </DirectionProvider>
  );
}
