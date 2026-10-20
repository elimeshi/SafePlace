import { describe, expect, it } from "vitest";
import { cssGradientVector } from "../gradient";
import { arrowNames } from "../arrows";
import { assistant, lh, rubik, tintOnWhite } from "../style";

describe("cssGradientVector", () => {
  it("180deg runs top to bottom through the centre", () => {
    const v = cssGradientVector(180, 100, 50);
    expect(v.x1).toBeCloseTo(50);
    expect(v.x2).toBeCloseTo(50);
    expect(v.y1).toBeCloseTo(0);
    expect(v.y2).toBeCloseTo(50);
  });
  it("145deg on a square has the CSS gradient length and heads down-end", () => {
    const v = cssGradientVector(145, 62, 62);
    const a = (145 * Math.PI) / 180;
    expect(Math.hypot(v.x2 - v.x1, v.y2 - v.y1)).toBeCloseTo(62 * (Math.sin(a) + Math.abs(Math.cos(a))));
    expect(v.x2).toBeGreaterThan(v.x1);
    expect(v.y2).toBeGreaterThan(v.y1);
  });
});

describe("style helpers", () => {
  it("tintOnWhite matches the lab's tint()", () => {
    expect(tintOnWhite("#2E3A8C", 0.14)).toBe("rgb(226,227,239)");
  });
  it("weights map to font families, never fontWeight", () => {
    expect(assistant(12, 600).fontFamily).toBe("Assistant_600SemiBold");
    expect(rubik(15).fontFamily).toBe("Rubik_600SemiBold");
    expect(rubik(25, 700).fontFamily).toBe("Rubik_700Bold");
    expect(assistant(12, 600).fontWeight).toBeUndefined();
  });
  it("lh converts a unitless ratio", () => expect(lh(16, 1.62)).toBe(25.92));
});

describe("arrowNames", () => {
  it("back points right in RTL and left in LTR", () => {
    expect(arrowNames("rtl")).toEqual({ back: "arrow-right", forward: "arrow-left" });
    expect(arrowNames("ltr")).toEqual({ back: "arrow-left", forward: "arrow-right" });
  });
});
