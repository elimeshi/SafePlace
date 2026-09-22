import { I18nManager, Platform } from "react-native";

/**
 * Forces RTL layout at app startup. Must be called once, as early as
 * possible (from the root layout, before any screen renders) — see
 * CLAUDE.md invariant #9. This is a Hebrew-first, RTL-first product; RTL
 * is not a toggle applied conditionally, it is the only supported layout
 * direction for the MVP (see docs/product/06-settings-spec.md §3.5 —
 * additional languages are explicitly future scope).
 *
 * Note: React Native requires a full app reload (not just a re-render)
 * for I18nManager.forceRTL to take visual effect the first time it
 * changes. In a fresh install this is transparent to the user; if you're
 * testing this in an existing Expo Go session and layout doesn't flip,
 * reload the app manually.
 */
export function bootstrapRTL(): void {
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
  // On native, forceRTL flips flex-row/flow layout after a reload. On web
  // (react-native-web) that layout mirroring keys off the DOM direction, which
  // forceRTL does not set — so set it here, or rows (gender doors, progress
  // dots, toggle rows) would lay out LTR while text still reads RTL.
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "he");
  }
}
