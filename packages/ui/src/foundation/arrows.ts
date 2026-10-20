export type Direction = "rtl" | "ltr";

/** "Back" and "forward" arrow glyphs for a direction (the lab's `back` / `fwd`). */
export function arrowNames(direction: Direction): {
  back: "arrow-right" | "arrow-left";
  forward: "arrow-right" | "arrow-left";
} {
  return direction === "rtl"
    ? { back: "arrow-right", forward: "arrow-left" }
    : { back: "arrow-left", forward: "arrow-right" };
}

