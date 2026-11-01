import { describe, expect, it, vi } from "vitest";
import { DEFAULT_THRESHOLDS } from "../classification";
import { createStubClassifier, verdictsOf } from "../classifier";
import { createEscalatingClassifier } from "../providers/escalating";

const input = { mediaItemId: "m", bytes: new Uint8Array([1]), contentType: "image/jpeg" };

describe("createEscalatingClassifier", () => {
  it("returns the primary answer untouched when every group is settled", async () => {
    const primary = createStubClassifier({ fallback: verdictsOf({ sex: { level: 1, confidence: 0.9 } }) });
    const secondary = { name: "sonnet", classify: vi.fn() };
    const c = createEscalatingClassifier({ primary, secondary, thresholds: DEFAULT_THRESHOLDS });
    const out = await c.classify(input);
    expect(secondary.classify).not.toHaveBeenCalled();
    expect(out.kind === "verdicts" && out.groups.sex.level).toBe(1);
  });

  it("re-asks only the undecided groups and merges the second answer in", async () => {
    const primary = createStubClassifier({
      fallback: verdictsOf({ religion: { level: "uncertain", confidence: 0 }, violence: { level: 1, confidence: 0.3 } }),
    });
    const secondary = createStubClassifier({
      fallback: verdictsOf({ religion: { level: 2, confidence: 0.9 }, violence: { level: 0, confidence: 0.9 }, sex: { level: 1, confidence: 0.9 } }),
    });
    const onEscalate = vi.fn();
    const c = createEscalatingClassifier({ primary, secondary, thresholds: DEFAULT_THRESHOLDS, onEscalate });
    const out = await c.classify(input);
    expect(onEscalate).toHaveBeenCalledWith({ mediaItemId: "m", groups: ["violence", "religion"] });
    expect(out.kind === "verdicts" && out.groups).toMatchObject({
      sex: { level: 0 },        // primary's settled answer wins over secondary's
      violence: { level: 0, confidence: 0.9 },
      religion: { level: 2, confidence: 0.9 },
    });
  });

  it("a refusal from either model is returned as-is", async () => {
    const primary = createStubClassifier({ fallback: { kind: "refused" } });
    const secondary = { name: "s", classify: vi.fn() };
    const c = createEscalatingClassifier({ primary, secondary, thresholds: DEFAULT_THRESHOLDS });
    expect(await c.classify(input)).toEqual({ kind: "refused" });
    expect(secondary.classify).not.toHaveBeenCalled();
  });
});
