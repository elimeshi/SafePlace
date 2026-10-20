import { describe, expect, it } from "vitest";
import { commentAvatarSize, resolveCommentStyle, COMMENT_MEDIA_HEIGHT } from "../CommentBubble.styles";
import { resolveCommentBoxStyle } from "../CommentBox.styles";

describe("CommentBubble (lab .cmt)", () => {
  it("level 2 is inset 42px with a 28px avatar; level 1 has a 34px avatar", () => {
    expect(resolveCommentStyle({ level: 2, highlighted: false, hasMedia: false }).row.marginStart).toBe(42);
    expect(resolveCommentStyle({ level: 1, highlighted: false, hasMedia: false }).row.marginStart).toBeUndefined();
    expect(commentAvatarSize(2)).toBe(28);
    expect(commentAvatarSize(1)).toBe(34);
  });
  it("bubble: ground fill, radius 16, 8/12/9 padding", () => {
    const b = resolveCommentStyle({ level: 1, highlighted: false, hasMedia: false }).bubble;
    expect(b).toMatchObject({ backgroundColor: "#F3F5FC", borderRadius: 16, paddingTop: 8, paddingHorizontal: 12, paddingBottom: 9 });
  });
  it("highlight adds the cyan100 halo and the #EEF8FA fill", () => {
    const b = resolveCommentStyle({ level: 1, highlighted: true, hasMedia: false }).bubble;
    expect(b.backgroundColor).toBe("#EEF8FA");
    expect(b.boxShadow).toBe("0 0 0 2px #DBF4F8");
  });
  it("media is 120px, radius 12, 6px below the text", () => {
    const m = resolveCommentStyle({ level: 1, highlighted: false, hasMedia: true }).media;
    expect(m).toMatchObject({ height: COMMENT_MEDIA_HEIGHT, borderRadius: 12, marginTop: 6 });
  });
  it("meta row: 14px gap, 12.5px/600", () => {
    const s = resolveCommentStyle({ level: 1, highlighted: false, hasMedia: false });
    expect(s.meta).toMatchObject({ gap: 14, paddingTop: 4, paddingHorizontal: 12 });
    expect(s.metaText).toMatchObject({ fontSize: 12.5, fontFamily: "Assistant_600SemiBold" });
  });
});

describe("CommentBox (lab .cbox)", () => {
  it("rest: 42px pill with a 1.5px border", () => {
    const s = resolveCommentBoxStyle(false);
    expect(s.field).toMatchObject({ height: 42, borderWidth: 1.5, borderColor: "#DCE1F2", borderRadius: 999 });
    expect(s.field.boxShadow).toBeUndefined();
  });
  it("active / reply mode: primary border with the focus ring", () => {
    const s = resolveCommentBoxStyle(true);
    expect(s.field.borderColor).toBe("#2E3A8C");
    expect(s.field.boxShadow).toBe("0 0 0 3px rgba(46,58,140,.14)");
    expect(s.field.gap).toBe(6);
  });
  it("send is a 40px primary circle; the @ chip is 24px", () => {
    const s = resolveCommentBoxStyle(false);
    expect(s.send).toMatchObject({ width: 40, height: 40, backgroundColor: "#2E3A8C" });
    expect(s.chip.height).toBe(24);
  });
});
