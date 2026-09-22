import { describe, expect, it } from "vitest";
import { resolveConfidenceBand } from "../classification";
import {
  createStubClassifier,
  womanProbabilityFrom,
  type ClassifierOutput,
} from "../classifier";

/**
 * A vision LLM cannot give a calibrated probability, but it can give a
 * verdict it is good at plus its own certainty in that verdict. This module
 * projects that pair onto the 0..1 "probability the content contains women"
 * scale the product spec (07-moderation-spec.md §2.1) and the tunable
 * thresholds are written in, so the three-band mechanism is unchanged.
 */
describe("womanProbabilityFrom", () => {
  it("maps a certain 'woman_present' to the top of the scale", () => {
    expect(
      womanProbabilityFrom({ verdict: "woman_present", confidence: 1 })
    ).toBe(1);
  });

  it("maps a certain 'no_woman' to the bottom of the scale", () => {
    expect(womanProbabilityFrom({ verdict: "no_woman", confidence: 1 })).toBe(0);
  });

  it("maps 'uncertain' to the midpoint regardless of stated confidence", () => {
    expect(womanProbabilityFrom({ verdict: "uncertain", confidence: 0 })).toBe(
      0.5
    );
    expect(womanProbabilityFrom({ verdict: "uncertain", confidence: 1 })).toBe(
      0.5
    );
  });

  it("puts an unsure verdict in the medium band, whichever way it leans", () => {
    const leaningYes = womanProbabilityFrom({
      verdict: "woman_present",
      confidence: 0.3,
    });
    const leaningNo = womanProbabilityFrom({
      verdict: "no_woman",
      confidence: 0.3,
    });
    expect(resolveConfidenceBand(leaningYes)).toBe("medium");
    expect(resolveConfidenceBand(leaningNo)).toBe("medium");
  });

  it("auto-flags only a confident 'woman_present'", () => {
    expect(
      resolveConfidenceBand(
        womanProbabilityFrom({ verdict: "woman_present", confidence: 0.9 })
      )
    ).toBe("high");
  });

  it("auto-approves only a confident 'no_woman'", () => {
    expect(
      resolveConfidenceBand(
        womanProbabilityFrom({ verdict: "no_woman", confidence: 0.9 })
      )
    ).toBe("low");
  });
});

describe("womanProbabilityFrom — malformed provider output fails safe", () => {
  // A provider is a remote model behind a JSON schema; it can still return
  // nonsense. Anything unusable resolves to the midpoint, which routes the
  // item to a human rather than silently auto-approving it.
  const junk: unknown[] = [
    { verdict: "woman_present", confidence: Number.NaN },
    { verdict: "no_woman", confidence: -1 },
    { verdict: "no_woman", confidence: 42 },
    { verdict: "banana", confidence: 0.9 },
    { verdict: "no_woman" },
    null,
  ];

  for (const [i, output] of junk.entries()) {
    it(`case ${i} resolves to the human-review midpoint`, () => {
      expect(womanProbabilityFrom(output as ClassifierOutput)).toBe(0.5);
      expect(
        resolveConfidenceBand(womanProbabilityFrom(output as ClassifierOutput))
      ).toBe("medium");
    });
  }
});

describe("createStubClassifier", () => {
  const bytes = new Uint8Array([1, 2, 3]);

  it("returns the configured verdict without any network call", async () => {
    const stub = createStubClassifier({
      verdict: "woman_present",
      confidence: 0.95,
    });
    await expect(
      stub.classify({ mediaItemId: "m1", bytes, contentType: "image/jpeg" })
    ).resolves.toEqual({ verdict: "woman_present", confidence: 0.95 });
  });

  it("is deterministic — the same input always yields the same output", async () => {
    const stub = createStubClassifier();
    const input = { mediaItemId: "m1", bytes, contentType: "image/jpeg" };
    expect(await stub.classify(input)).toEqual(await stub.classify(input));
  });

  it("can be driven per media id, for tests that need a specific band", async () => {
    const stub = createStubClassifier({
      byMediaItemId: {
        "m-flagged": { verdict: "woman_present", confidence: 0.99 },
        "m-unsure": { verdict: "uncertain", confidence: 0.4 },
      },
      verdict: "no_woman",
      confidence: 0.99,
    });
    const at = async (id: string) =>
      resolveConfidenceBand(
        womanProbabilityFrom(
          await stub.classify({ mediaItemId: id, bytes, contentType: "image/jpeg" })
        )
      );
    expect(await at("m-flagged")).toBe("high");
    expect(await at("m-unsure")).toBe("medium");
    expect(await at("m-anything-else")).toBe("low");
  });

  it("identifies itself, so logs and stored scores record which model ran", () => {
    expect(createStubClassifier().name).toBe("stub");
  });
});
