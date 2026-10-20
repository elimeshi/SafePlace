import { useMemo } from "react";
import { View } from "react-native";
import { DirectionProvider, MotionPreferenceProvider } from "@safeplace/ui";
import { DirView, SceneArt, StatusBarMock, type SceneKey } from "@/gallery/fixtures";
import { theme } from "@/lib/theme";
import { createFixtureBackend, SCENES } from "./fixtures";
import { PostScreen } from "./PostScreen";

/**
 * DEV ONLY. Renders the real PostScreen on fixture data inside the lab's
 * 390x844 phone frame (with its mock status bar) for scripts/pixel-compare.
 * Imported lazily from the dev route behind `__DEV__`.
 */
export function PostFixtureHost({ scene }: { scene: string }) {
  const s = SCENES[scene] ?? SCENES.post;
  const backend = useMemo(() => createFixtureBackend(s as NonNullable<typeof s>), [s]);
  return (
    <DirectionProvider value="rtl"><MotionPreferenceProvider value="reduce">
    <DirView dir="rtl"
      testID="post-fixture"
      style={{ width: 390, height: 844, overflow: "hidden", backgroundColor: theme.colors.background, flexDirection: "column", position: "relative" }}
    >
      <View style={{ position: "absolute", top: 0, start: 0, end: 0 }}>
        <StatusBarMock />
      </View>
      <PostScreen
        backend={backend}
        postId="p1"
        topInset={37}
        onBack={() => undefined}
        onOpenPost={() => undefined}
        devInit={s?.init}
        renderMedia={(uri) => (uri.startsWith("fixture:") ? <SceneArt k={uri.slice(8) as SceneKey} /> : null)}
      />
    </DirView></MotionPreferenceProvider></DirectionProvider>
  );
}
