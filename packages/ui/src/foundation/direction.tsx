import { createContext, useContext } from "react";
import { I18nManager } from "react-native";
import type { Direction } from "./arrows";

export { arrowNames, type Direction } from "./arrows";

const DirectionContext = createContext<Direction | null>(null);

/**
 * Lets a subtree (the gallery's RTL toggle, a future English/LTR account)
 * state its reading direction for the few places that must choose a glyph
 * (back/forward arrows). Layout itself stays flow-relative (ADR 0007), so it
 * needs no provider. Default: I18nManager.
 */
export const DirectionProvider = DirectionContext.Provider;

export function useDirection(): Direction {
  return useContext(DirectionContext) ?? (I18nManager.isRTL ? "rtl" : "ltr");
}
