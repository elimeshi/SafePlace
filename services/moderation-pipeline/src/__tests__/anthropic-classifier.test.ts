import { describe, expect, it, vi } from "vitest";
import {
  createAnthropicClassifier,
  type MessagesParseClient,
} from "../providers/anthropic";

/**
 * The real provider, exercised through an injected messages client so the
 * suite never makes a network call or spends money. What matters here is that
 * a usable answer is read correctly and that every unusable one fails safe
 * toward human review rather than toward auto-approval.
 */

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

describe("createAnthropicClassifier", () => {
  it("returns the model's verdict and confidence", async () => {
    const client = fakeClient({
      parsed_output: { verdict: "woman_present", confidence: 0.93 },
      stop_reason: "end_turn",
    });
    const provider = createAnthropicClassifier({ client, modelId: "claude-haiku-4-5" });

    await expect(provider.classify(input)).resolves.toEqual({
      verdict: "woman_present",
      confidence: 0.93,
    });
  });

  it("reads the model id from configuration, never a literal", async () => {
    let captured: Record<string, unknown> = {};
    const client = fakeClient(
      { parsed_output: { verdict: "no_woman", confidence: 0.9 }, stop_reason: "end_turn" },
      (p) => {
        captured = p as Record<string, unknown>;
      }
    );
    const provider = createAnthropicClassifier({ client, modelId: "some-other-model" });
    await provider.classify(input);
    expect(captured.model).toBe("some-other-model");
  });

  it("sends the image as base64 with its own media type", async () => {
    interface ImageBlock {
      type: string;
      source?: { type: string; media_type: string; data: string };
    }
    interface Params {
      messages: Array<{ content: ImageBlock[] }>;
    }
    let captured: Params | undefined;
    const client = fakeClient(
      { parsed_output: { verdict: "no_woman", confidence: 0.9 }, stop_reason: "end_turn" },
      (p) => {
        captured = p as Params;
      }
    );
    const provider = createAnthropicClassifier({ client, modelId: "claude-haiku-4-5" });
    await provider.classify(input);

    const imageBlock = captured?.messages[0]?.content.find((b) => b.type === "image");
    expect(imageBlock?.source).toMatchObject({ type: "base64", media_type: "image/png" });
    expect(imageBlock?.source?.data).toBe(Buffer.from(input.bytes).toString("base64"));
  });

  it("names itself after the provider, for attributable stored scores", () => {
    const provider = createAnthropicClassifier({
      client: fakeClient({}),
      modelId: "claude-haiku-4-5",
    });
    expect(provider.name).toBe("anthropic");
  });
});

describe("createAnthropicClassifier — unusable answers fail safe", () => {
  const cases: Array<[string, unknown]> = [
    ["parsing failed", { parsed_output: null, stop_reason: "end_turn" }],
    ["verdict is not one of ours", { parsed_output: { verdict: "maybe", confidence: 0.9 } }],
    ["confidence is out of range", { parsed_output: { verdict: "no_woman", confidence: 7 } }],
    ["confidence is missing", { parsed_output: { verdict: "no_woman" } }],
    ["the model declined", { parsed_output: null, stop_reason: "refusal" }],
    ["the response was truncated", { parsed_output: null, stop_reason: "max_tokens" }],
  ];

  for (const [label, result] of cases) {
    it(`${label} → uncertain, so a human decides`, async () => {
      const provider = createAnthropicClassifier({
        client: fakeClient(result),
        modelId: "claude-haiku-4-5",
      });
      await expect(provider.classify(input)).resolves.toEqual({
        verdict: "uncertain",
        confidence: 0,
      });
    });
  }
});

describe("createAnthropicClassifier — transport failures are retryable", () => {
  it("lets an API error propagate so the job retries with backoff", async () => {
    const client = {
      messages: {
        parse: vi.fn(async () => {
          throw new Error("429 rate limited");
        }),
      },
    } as unknown as MessagesParseClient;
    const provider = createAnthropicClassifier({ client, modelId: "claude-haiku-4-5" });

    // Distinct from an unusable answer: nothing was decided, so the item must
    // be retried rather than parked in review.
    await expect(provider.classify(input)).rejects.toThrow(/429/);
  });

  it("refuses an image larger than the configured ceiling without calling the API", async () => {
    const parse = vi.fn();
    const client = { messages: { parse } } as unknown as MessagesParseClient;
    const provider = createAnthropicClassifier({
      client,
      modelId: "claude-haiku-4-5",
      maxImageBytes: 8,
    });

    await expect(
      provider.classify({ ...input, bytes: new Uint8Array(64) })
    ).resolves.toEqual({ verdict: "uncertain", confidence: 0 });
    expect(parse).not.toHaveBeenCalled();
  });
});
