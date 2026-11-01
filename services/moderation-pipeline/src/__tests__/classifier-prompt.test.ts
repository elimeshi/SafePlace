import { describe, expect, it } from "vitest";
import { CLASSIFIER_OUTPUT_SCHEMA, CLASSIFIER_SYSTEM_PROMPT } from "../classifier-prompt";

describe("classifier prompt", () => {
  it("is long enough to be cached on Haiku 5.5 (minimum cacheable prefix 512 tokens ≈ 2,000 chars)", () => {
    expect(CLASSIFIER_SYSTEM_PROMPT.length).toBeGreaterThan(2400);
  });
  it("asks for every group and only string-enum levels", () => {
    for (const g of ["sex", "violence", "religion", "addictions"]) {
      expect(CLASSIFIER_OUTPUT_SCHEMA.properties[g as "sex"].properties.level.enum).toContain("uncertain");
    }
    expect(CLASSIFIER_OUTPUT_SCHEMA.properties.addictions.properties.level.enum).not.toContain("3");
    expect(CLASSIFIER_OUTPUT_SCHEMA.required).toEqual(["sex", "violence", "religion", "addictions"]);
  });
});
