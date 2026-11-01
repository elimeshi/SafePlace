import { describe, expect, it, vi } from "vitest";
import { createAnthropicLocalizer } from "../providers/anthropic-localizer";
import type { MessagesParseClient } from "../providers/anthropic";

function fakeClient(result: unknown, capture?: (params: unknown) => void) {
  const parse = vi.fn(async (params: unknown) => {
    capture?.(params);
    return result;
  });
  return { messages: { parse } } as unknown as MessagesParseClient;
}

const input = {
  mediaItemId: "m1",
  bytes: new Uint8Array([137, 80, 78, 71]),
  contentType: "image/png",
};

describe("createAnthropicLocalizer", () => {
  it("returns the regions the model reported", async () => {
    const client = fakeClient({
      parsed_output: {
        regions: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }],
        found_all: true,
      },
      stop_reason: "end_turn",
    });
    const localizer = createAnthropicLocalizer({ client, modelId: "claude-haiku-5-5" });

    await expect(localizer.locate(input)).resolves.toEqual({
      regions: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }],
      foundAll: true,
    });
  });

  it("reads the model id from configuration", async () => {
    let captured: Record<string, unknown> = {};
    const client = fakeClient(
      { parsed_output: { regions: [], found_all: true }, stop_reason: "end_turn" },
      (p) => {
        captured = p as Record<string, unknown>;
      }
    );
    await createAnthropicLocalizer({ client, modelId: "some-model" }).locate(input);
    expect(captured.model).toBe("some-model");
  });

  it("gives up on an unusable answer rather than blurring part of the image", async () => {
    // Falling back to "no regions, not complete" makes the pipeline withhold
    // the whole image — the behaviour that existed before blurring did.
    for (const result of [
      { parsed_output: null, stop_reason: "end_turn" },
      { parsed_output: { regions: "several" }, stop_reason: "end_turn" },
      { parsed_output: { regions: [{ x: 5, y: 5, width: 1, height: 1 }] } },
      { parsed_output: null, stop_reason: "refusal" },
      { parsed_output: { regions: [] }, stop_reason: "max_tokens" },
    ]) {
      const localizer = createAnthropicLocalizer({
        client: fakeClient(result),
        modelId: "claude-haiku-5-5",
      });
      await expect(localizer.locate(input)).resolves.toEqual({
        regions: [],
        foundAll: false,
      });
    }
  });

  it("lets a transport failure propagate so the job retries", async () => {
    const client = {
      messages: {
        parse: vi.fn(async () => {
          throw new Error("503 upstream");
        }),
      },
    } as unknown as MessagesParseClient;
    await expect(
      createAnthropicLocalizer({ client, modelId: "claude-haiku-5-5" }).locate(input)
    ).rejects.toThrow(/503/);
  });
});
