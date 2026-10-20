import { createContext, useContext, useEffect, type ReactNode } from "react";
import { Modal, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBarMock } from "@/gallery/fixtures";
import { inFixtureMode } from "./fixtures";

/** Height of the tab bar rendered by app/(app)/_layout.tsx, so screen overlays (toast) can sit above it. */
export const TabBarHeightContext = createContext(0);
export const useTabBarHeight = () => useContext(TabBarHeightContext);

/**
 * The band above the content: the real safe-area inset, or in dev fixture
 * mode the lab's fake status bar so the screen lines up with the reference.
 */
export function StatusBand() {
  const { top } = useSafeAreaInsets();
  if (inFixtureMode()) return <StatusBarMock />;
  return <View style={{ height: top }} />;
}

/**
 * Sheets render in a transparent Modal so the scrim covers the tab bar too (as
 * in the lab, where the sheet is anchored to the whole phone). The sheet
 * components position themselves absolutely inside this full-size root.
 */
export function SheetHost({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  // Dev fixtures only: the web Modal focus-trap draws a focus ring around the page in screenshots.
  useEffect(() => {
    if (!inFixtureMode()) return;
    const t = setTimeout(() => (document.activeElement as HTMLElement | null)?.blur(), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <Modal transparent animationType="none" visible onRequestClose={onDismiss} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "transparent" }} testID="sheet-host">
        {children}
      </View>
    </Modal>
  );
}
