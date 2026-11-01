import { describe, expect, it, vi } from "vitest";
import { verdictsOf } from "../classifier";
import { resolveClassifierFromEnv, createClassificationHandler } from "../handler";
import type { AnthropicClassifierEnvOptions } from "../providers/anthropic";
import type { WorkerLogEntry } from "../worker";

// No network in tests: the real factory is swapped for a stub that answers by
// model id — the primary leaves religion undecided, the escalation settles it.
vi.mock("../providers/anthropic", () => ({
  createAnthropicClassifierFromConfig: (o: AnthropicClassifierEnvOptions) => ({
    name: "anthropic",
    classify: async () => {
      o.onUsage?.({ inputTokens: 10, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, outputTokens: 5 });
      return o.modelId === "primary"
        ? verdictsOf({ religion: { level: "uncertain", confidence: 0 } })
        : verdictsOf({});
    },
  }),
}));

const input = { mediaItemId: "m1", bytes: new Uint8Array([1]), contentType: "image/jpeg" };
const anthropicEnv = { VISION_MODEL_PROVIDER: "anthropic", VISION_MODEL_API_KEY: "sk-test" };

describe("resolveClassifierFromEnv — escalation wiring", () => {
  it("is off when no escalation model is configured", () => {
    expect(resolveClassifierFromEnv(anthropicEnv, "primary", null).name).toBe("anthropic");
  });

  it("wraps the primary when an escalation model is configured, and logs usage and escalation", async () => {
    const entries: WorkerLogEntry[] = [];
    const provider = resolveClassifierFromEnv(anthropicEnv, "primary", "secondary", {
      log: (e) => entries.push(e),
    });
    expect(provider.name).toBe("anthropic+anthropic");

    const out = await provider.classify(input);
    expect(out.kind === "verdicts" && out.groups.religion.level).toBe(0);
    expect(entries).toEqual([
      { event: "usage", mediaItemId: "", usage: { inputTokens: 10, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, outputTokens: 5 } },
      { event: "escalated", mediaItemId: "m1", error: "religion" },
      { event: "usage", mediaItemId: "", usage: { inputTokens: 10, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, outputTokens: 5 } },
    ]);
  });

  it("leaves the stub path alone even when an escalation model is configured", () => {
    expect(resolveClassifierFromEnv({ VISION_MODEL_PROVIDER: "stub" }, "primary", "secondary").name).toBe("stub");
  });
});

/**
 * The worker runs as a stateless endpoint fired by a scheduler (ADR 0009), so
 * two things have to be right before any classification happens: the endpoint
 * must not be callable by the internet at large, and a misconfigured
 * deployment must fail loudly rather than quietly classify everything with a
 * stub.
 */
describe("resolveClassifierFromEnv", () => {
  it("uses the stub when explicitly asked for", () => {
    const provider = resolveClassifierFromEnv({ VISION_MODEL_PROVIDER: "stub" });
    expect(provider.name).toBe("stub");
  });

  it("uses Anthropic when configured with a key", () => {
    const provider = resolveClassifierFromEnv({
      VISION_MODEL_PROVIDER: "anthropic",
      VISION_MODEL_API_KEY: "sk-test",
    });
    expect(provider.name).toBe("anthropic");
  });

  it("refuses to start rather than silently falling back to the stub", () => {
    // A deployment that meant to classify for real and quietly used a stub
    // would mark every upload 'uncertain' and bury the queue in review items,
    // while looking healthy.
    expect(() =>
      resolveClassifierFromEnv({ VISION_MODEL_PROVIDER: "anthropic" })
    ).toThrow(/VISION_MODEL_API_KEY/);
  });

  it("refuses an unknown provider name", () => {
    expect(() => resolveClassifierFromEnv({ VISION_MODEL_PROVIDER: "acme" })).toThrow(
      /acme/
    );
  });

  it("defaults to the stub when nothing is configured", () => {
    expect(resolveClassifierFromEnv({}).name).toBe("stub");
  });
});

describe("createClassificationHandler", () => {
  const run = vi.fn(async () => ({ claimed: 2, classified: 2, failed: 0 }));

  function handler(secret?: string) {
    run.mockClear();
    return createClassificationHandler({ secret, run });
  }

  it("rejects a request without the shared secret", async () => {
    const response = await handler("s3cret")(
      new Request("https://worker.test/classify", { method: "POST" })
    );
    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong secret", async () => {
    const response = await handler("s3cret")(
      new Request("https://worker.test/classify", {
        method: "POST",
        headers: { authorization: "Bearer nope" },
      })
    );
    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("runs a pass and reports what it did", async () => {
    const response = await handler("s3cret")(
      new Request("https://worker.test/classify", {
        method: "POST",
        headers: { authorization: "Bearer s3cret" },
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      claimed: 2,
      classified: 2,
      failed: 0,
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refuses to serve at all when no secret is configured", async () => {
    // An unauthenticated drain endpoint is a free way to burn the API budget.
    const response = await handler(undefined)(
      new Request("https://worker.test/classify", { method: "POST" })
    );
    expect(response.status).toBe(500);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects a method other than POST", async () => {
    const response = await handler("s3cret")(
      new Request("https://worker.test/classify", {
        method: "GET",
        headers: { authorization: "Bearer s3cret" },
      })
    );
    expect(response.status).toBe(405);
  });

  it("returns 500 without leaking internals when a pass throws", async () => {
    const failing = createClassificationHandler({
      secret: "s3cret",
      run: async () => {
        throw new Error("service_role key rejected: sk-abcdef");
      },
    });
    const response = await failing(
      new Request("https://worker.test/classify", {
        method: "POST",
        headers: { authorization: "Bearer s3cret" },
      })
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("sk-abcdef");
  });
});
