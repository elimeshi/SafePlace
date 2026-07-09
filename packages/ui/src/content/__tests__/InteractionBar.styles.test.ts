import { describe, expect, it } from "vitest";
import { interactionIconState } from "../InteractionBar.styles";
import { theme } from "../../theme";

describe("interactionIconState", () => {
  it("liked tints the heart with danger", () => {
    const s = interactionIconState({ liked: true, saved: false });
    expect(s.heartColor).toBe(theme.colors.danger);
  });

  it("not-liked leaves the heart neutral", () => {
    const s = interactionIconState({ liked: false, saved: false });
    expect(s.heartColor).toBe(theme.colors.ink500);
  });

  it("saved tints the bookmark with primary", () => {
    const s = interactionIconState({ liked: false, saved: true });
    expect(s.bookmarkColor).toBe(theme.colors.primary);
  });

  it("not-saved leaves the bookmark at the shared neutral", () => {
    const s = interactionIconState({ liked: false, saved: false });
    expect(s.bookmarkColor).toBe(s.iconNeutral);
  });
});
