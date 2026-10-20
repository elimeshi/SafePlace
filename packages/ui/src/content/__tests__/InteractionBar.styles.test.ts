import { describe, expect, it } from "vitest";
import {
  interactionIconState,
  resolveActionStyle,
  resolveBarStyle,
  resolveCountStyle,
} from "../InteractionBar.styles";
import { theme } from "../../theme";

describe("interactionIconState", () => {
  it("an active like is indigo #2E3A8C (locked choice), filled", () => {
    const s = interactionIconState({ liked: true, saved: false });
    expect(s.heartColor).toBe("#2E3A8C");
    expect(s.heartFilled).toBe(true);
  });
  it("not-liked is the neutral ink, outline", () => {
    const s = interactionIconState({ liked: false, saved: false });
    expect(s.heartColor).toBe(theme.colors.ink500);
    expect(s.heartFilled).toBe(false);
  });
  it("saved fills the bookmark but keeps the neutral ink (lab)", () => {
    const s = interactionIconState({ liked: false, saved: true });
    expect(s.bookmarkFilled).toBe(true);
    expect(s.bookmarkColor).toBe(s.iconNeutral);
  });
});

describe("bar geometry (lab .ibar / .pbar)", () => {
  it("card bar: 4px gap, 6/10/8 padding, hairline above", () => {
    const b = resolveBarStyle("card");
    expect(b.gap).toBe(4);
    expect(b.paddingTop).toBe(6);
    expect(b.paddingBottom).toBe(8);
    expect(b.paddingHorizontal).toBe(10);
    expect(b.borderTopWidth).toBe(1);
    expect(b.borderTopColor).toBe(theme.colors.ink100);
  });
  it("post bar spreads evenly with hairlines above and below", () => {
    const b = resolveBarStyle("post");
    expect(b.justifyContent).toBe("space-around");
    expect(b.borderBottomWidth).toBe(1);
  });
  it("card action is 8/8 padded, radius 12; post action 11/14", () => {
    expect(resolveActionStyle("card")).toMatchObject({ gap: 6, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12 });
    expect(resolveActionStyle("post")).toMatchObject({ gap: 7, paddingVertical: 11, paddingHorizontal: 14 });
  });
  it("numbers are tabular", () => {
    expect(resolveCountStyle("card").fontVariant).toContain("tabular-nums");
    expect(resolveCountStyle("card").fontSize).toBe(14);
    expect(resolveCountStyle("post").fontSize).toBe(15);
  });
});
