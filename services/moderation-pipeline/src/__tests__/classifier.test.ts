import { describe, expect, it } from "vitest";
import { resolveConfidenceBand } from "../classification";
import {
  allUncertain,
  createStubClassifier,
  verdictsOf,
  womanProbabilityFrom,
  type ClassifierOutput,
} from "../classifier";

/**
 * A vision LLM cannot give a calibrated probability, but it can give a level
 * it is good at plus its own certainty in that level. The sex group's answer
 * is projected onto the 0..1 "probability the content contains women" scale
 * the product spec (07-moderation-spec.md §2.1) and the tunable thresholds are
 * written in, so the three-band mechanism is unchanged.
 */
describe("womanProbabilityFrom", () => {
  it("maps a certain sex level >= 1 to the top of the scale", () => {
    expect(womanProbabilityFrom(verdictsOf({ sex: { level: 1, confidence: 1 } }))).toBe(1);
  });

  it("maps a certain sex level 0 to the bottom of the scale", () => {
    expect(womanProbabilityFrom(verdictsOf({ sex: { level: 0, confidence: 1 } }))).toBe(0);
  });

  it("maps 'uncertain' to the midpoint regardless of stated confidence", () => {
    expect(womanProbabilityFrom(allUncertain())).toBe(0.5);
    expect(
      womanProbabilityFrom(verdictsOf({ sex: { level: "uncertain", confidence: 1 } }))
    ).toBe(0.5);
  });

  it("maps a refusal to the midpoint", () => {
    expect(womanProbabilityFrom({ kind: "refused" })).toBe(0.5);
  });

  it("ignores the other groups", () => {
    expect(
      womanProbabilityFrom(verdictsOf({ violence: { level: 2, confidence: 1 } }, 1))
    ).toBe(0);
  });

  it("puts an unsure answer in the medium band, whichever way it leans", () => {
    const leaningYes = womanProbabilityFrom(verdictsOf({ sex: { level: 1, confidence: 0.3 } }));
    const leaningNo = womanProbabilityFrom(verdictsOf({ sex: { level: 0, confidence: 0.3 } }));
    expect(resolveConfidenceBand(leaningYes)).toBe("medium");
    expect(resolveConfidenceBand(leaningNo)).toBe("medium");
  });

  it("auto-flags only a confident sex level >= 1", () => {
    expect(
      resolveConfidenceBand(
        womanProbabilityFrom(verdictsOf({ sex: { level: 1, confidence: 0.9 } }))
      )
    ).toBe("high");
  });

  it("auto-approves only a confident sex level 0", () => {
    expect(
      resolveConfidenceBand(
        womanProbabilityFrom(verdictsOf({ sex: { level: 0, confidence: 0.9 } }))
      )
    ).toBe("low");
  });
});

describe("womanProbabilityFrom — malformed provider output fails safe", () => {
  // A provider is a remote model behind a JSON schema; it can still return
  // nonsense. An unreadable confidence resolves to the midpoint, which routes
  // the item to a human rather than silently auto-approving it.
  const junk = [Number.NaN, -1, 42, undefined] as unknown[];

  for (const [i, confidence] of junk.entries()) {
    it(`case ${i} resolves to the human-review midpoint`, () => {
      const output = verdictsOf({
        sex: { level: 0, confidence: confidence as number },
      });
      expect(womanProbabilityFrom(output)).toBe(0.5);
      expect(resolveConfidenceBand(womanProbabilityFrom(output))).toBe("medium");
    });
  }
});

describe("createStubClassifier", () => {
  const bytes = new Uint8Array([1, 2, 3]);

  it("returns the configured output without any network call", async () => {
    const fallback = verdictsOf({ sex: { level: 1, confidence: 0.95 } });
    const stub = createStubClassifier({ fallback });
    await expect(
      stub.classify({ mediaItemId: "m1", bytes, contentType: "image/jpeg" })
    ).resolves.toEqual(fallback);
  });

  it("defaults to all-uncertain, so a misconfigured stub routes to a human", async () => {
    await expect(
      createStubClassifier().classify({ mediaItemId: "m1", bytes, contentType: "image/jpeg" })
    ).resolves.toEqual(allUncertain());
  });

  it("is deterministic — the same input always yields the same output", async () => {
    const stub = createStubClassifier();
    const input = { mediaItemId: "m1", bytes, contentType: "image/jpeg" };
    expect(await stub.classify(input)).toEqual(await stub.classify(input));
  });

  it("can be driven per media id, for tests that need a specific band", async () => {
    const stub = createStubClassifier({
      byMediaItemId: {
        "m-flagged": verdictsOf({ sex: { level: 1, confidence: 0.99 } }),
        "m-unsure": verdictsOf({ sex: { level: "uncertain", confidence: 0.4 } }),
      },
      fallback: verdictsOf({}, 0.99),
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

  it("can carry a refusal", async () => {
    const refused: ClassifierOutput = { kind: "refused" };
    const stub = createStubClassifier({ fallback: refused });
    await expect(
      stub.classify({ mediaItemId: "m1", bytes, contentType: "image/jpeg" })
    ).resolves.toEqual(refused);
  });

  it("identifies itself, so logs and stored scores record which model ran", () => {
    expect(createStubClassifier().name).toBe("stub");
  });
});

describe("verdictsOf", () => {
  it("defaults every group to level 0 at the given confidence", () => {
    expect(verdictsOf({}, 0.7)).toEqual({
      kind: "verdicts",
      groups: {
        sex: { level: 0, confidence: 0.7 },
        violence: { level: 0, confidence: 0.7 },
        religion: { level: 0, confidence: 0.7 },
        addictions: { level: 0, confidence: 0.7 },
      },
    });
  });
});
