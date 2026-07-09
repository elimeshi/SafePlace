import { describe, expect, it } from "vitest";
import { theme } from "../../theme";
import { resolveNoticeStyle, resolveNoticeTone } from "../SystemNotice.styles";

describe("resolveNoticeTone", () => {
  it("info uses the neutral blue tint + info icon", () => {
    const t = resolveNoticeTone("info");
    expect(t.bg).toBe(theme.colors.blue050);
    expect(t.border).toBe(theme.colors.blue200);
    expect(t.iconName).toBe("info");
    expect(t.iconColor).toBe(theme.colors.primary);
  });

  it("warning uses the dangerous-zone amber tint + shield-check icon", () => {
    const t = resolveNoticeTone("warning");
    expect(t.bg).toBe(theme.colors.warningSoft);
    expect(t.border).toBe(theme.colors.warning);
    expect(t.iconName).toBe("shield-check");
    expect(t.iconColor).toBe(theme.colors.warning);
  });

  it("danger uses the danger tint + lock icon", () => {
    const t = resolveNoticeTone("danger");
    expect(t.bg).toBe(theme.colors.dangerSoft);
    expect(t.border).toBe(theme.colors.danger);
    expect(t.iconName).toBe("lock");
    expect(t.iconColor).toBe(theme.colors.danger);
  });
});

describe("resolveNoticeStyle", () => {
  it("uses a flow-relative row layout, a 1px border, and the lg radius", () => {
    const s = resolveNoticeStyle("info");
    expect(s.container.flexDirection).toBe("row");
    expect(s.container.borderWidth).toBe(1);
    expect(s.container.borderRadius).toBe(theme.radius.lg);
    expect(s.container.padding).toBe(theme.spacing.lg);
  });

  it("colors the container from the resolved tone", () => {
    const danger = resolveNoticeStyle("danger");
    expect(danger.container.backgroundColor).toBe(theme.colors.dangerSoft);
    expect(danger.container.borderColor).toBe(theme.colors.danger);
  });

  it("titles the body-strong role in textPrimary and the message in meta/textSecondary", () => {
    const s = resolveNoticeStyle("info");
    expect(s.title.fontFamily).toBe(theme.typeRole.bodyStrong.fontFamily);
    expect(s.title.color).toBe(theme.colors.textPrimary);
    expect(s.message.fontFamily).toBe(theme.typeRole.meta.fontFamily);
    expect(s.message.color).toBe(theme.colors.textSecondary);
  });

  it("lays the action row out as a flow-relative row", () => {
    const s = resolveNoticeStyle("info");
    expect(s.actionsRow.flexDirection).toBe("row");
  });
});
