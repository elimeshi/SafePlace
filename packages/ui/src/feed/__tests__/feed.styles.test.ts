import { describe, expect, it } from "vitest";
import { resolveStatusesRailStyle, PLUS_SIZE } from "../StatusesRail.styles";
import { resolveSpaceCardStyle } from "../SpaceCard.styles";
import { resolveCollapsedStripStyle } from "../CollapsedStrip.styles";
import { resolveFollowRailStyle } from "../FollowRail.styles";
import { resolveBottomTabsStyle, tabVisual, TAB_ICONS } from "../BottomTabs.styles";
import { feedCopy, formatCount } from "../copy";
import { collapseTimings } from "../../motion/collapse";

describe("StatusesRail (lab .stories)", () => {
  const s = resolveStatusesRailStyle();
  it("62px gradient plus with the CTA shadow in a 66px story column", () => {
    expect(PLUS_SIZE).toBe(62);
    expect(s.plus).toMatchObject({ width: 62, height: 62, borderRadius: 31 });
    expect(s.plus.boxShadow).toBe("0 12px 26px -10px rgba(46,58,140,.6)");
    expect(s.story.width).toBe(66);
    expect(s.row).toMatchObject({ gap: 14, paddingHorizontal: 18 });
  });
  it("keeps the lab's .lbl quirk: 22px caption pinned to the start", () => {
    expect(s.caption).toMatchObject({ height: 22, paddingHorizontal: 9, alignSelf: "flex-start" });
  });
  it("empty hint is 13px, 1.4 line-height, max 220 wide", () => {
    expect(s.empty.maxWidth).toBe(220);
    expect(s.emptyText.fontSize).toBe(13);
    expect(s.emptyText.lineHeight).toBeCloseTo(18.2);
  });
});

describe("SpaceCard (lab .space)", () => {
  const s = resolveSpaceCardStyle();
  it("is 156 wide, radius 18, shadow; header 9/11 padded, 80px body", () => {
    expect(s.card).toMatchObject({ width: 156, borderRadius: 18 });
    expect(s.header).toMatchObject({ gap: 7, paddingVertical: 9, paddingHorizontal: 11 });
    expect(s.body.height).toBe(80);
    expect(s.headerText).toMatchObject({ fontSize: 12.5, fontFamily: "Rubik_700Bold" });
  });
});

describe("CollapsedStrip (lab .cstrip)", () => {
  it("pill with 10px gap, 2/14/10 margins, 7/12 padding, frosted fill", () => {
    const s = resolveCollapsedStripStyle().strip;
    expect(s).toMatchObject({ gap: 10, marginTop: 2, marginHorizontal: 14, marginBottom: 10, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 });
    expect(s.backgroundColor).toBe("rgba(255,255,255,.86)");
  });
  it("avatars overlap by 8px toward the start with a 2px white ring", () => {
    const s = resolveCollapsedStripStyle();
    expect(s.avatarOverlap.marginStart).toBe(-8);
    expect(s.avatarRing.boxShadow).toBe("0 0 0 2px #FFFFFF");
  });
});

describe("FollowRail (lab .frail)", () => {
  const s = resolveFollowRailStyle();
  it("rounded top sheet, 132px cards with a 32px bio slot", () => {
    expect(s.rail).toMatchObject({ borderTopStartRadius: 24, borderTopEndRadius: 24, paddingTop: 12, paddingBottom: 14 });
    expect(s.card.width).toBe(132);
    expect(s.bio.height).toBe(32);
    expect(s.button.backgroundColor).toBe("#2E3A8C");
  });
  it("formats counts as numbers with thousands separators", () => {
    expect(formatCount(2431)).toBe("2,431");
    expect(formatCount(312)).toBe("312");
    expect(feedCopy.followersSuffix).toBe("עוקבים");
  });
});

describe("BottomTabs (lab .bnav)", () => {
  it("is Home / Search / Profile with 70px tabs", () => {
    expect(TAB_ICONS).toEqual({ home: "home", search: "search", profile: "user" });
    expect(resolveBottomTabsStyle().tab.width).toBe(70);
    expect(resolveBottomTabsStyle().bar).toMatchObject({ paddingTop: 8, paddingHorizontal: 24, paddingBottom: 22 });
  });
  it("active tab is indigo with a heavier stroke", () => {
    expect(tabVisual(true)).toEqual({ color: "#2E3A8C", strokeWidth: 2.4 });
    expect(tabVisual(false)).toEqual({ color: "#8A93B5", strokeWidth: 2 });
  });
});

describe("collapseTimings", () => {
  it("full motion: height 260ms, zones fade 220ms, strip 200ms from -8px", () => {
    expect(collapseTimings(false)).toEqual({ heightMs: 260, zonesFadeMs: 220, stripMs: 200, stripOffsetY: -8, animateHeight: true });
  });
  it("reduced motion: opacity only — no height tween, no slide", () => {
    const t = collapseTimings(true);
    expect(t.animateHeight).toBe(false);
    expect(t.stripOffsetY).toBe(0);
    expect(t.stripMs).toBe(200);
  });
});
