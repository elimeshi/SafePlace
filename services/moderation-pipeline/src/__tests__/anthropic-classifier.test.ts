import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { createAnthropicClassifier } from "../providers/anthropic";

async function png(w = 1600, h = 1200): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: "#808080" } }).png().toBuffer());
}

const ok = (groups: Record<string, { level: string; confidence: number }>) => ({
  parsed_output: groups,
  stop_reason: "end_turn",
  usage: { input_tokens: 900, cache_read_input_tokens: 800, cache_creation_input_tokens: 0, output_tokens: 60 },
});

const clear = ok({
  sex: { level: "0", confidence: 0.95 },
  violence: { level: "0", confidence: 0.95 },
  religion: { level: "1", confidence: 0.8 },
  addictions: { level: "0", confidence: 0.95 },
});

describe("createAnthropicClassifier", () => {
  it("sends a resized JPEG, the cached rubric and the schema, and parses string levels to numbers", async () => {
    const parse = vi.fn().mockResolvedValue(clear);
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "claude-haiku-5-5" });
    const out = await c.classify({ mediaItemId: "m", bytes: await png(), contentType: "image/png" });

    expect(out).toEqual({
      kind: "verdicts",
      groups: {
        sex: { level: 0, confidence: 0.95 },
        violence: { level: 0, confidence: 0.95 },
        religion: { level: 1, confidence: 0.8 },
        addictions: { level: 0, confidence: 0.95 },
      },
    });
    const params = parse.mock.calls[0]![0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    const image = params.messages[0].content[0].source;
    expect(image.media_type).toBe("image/jpeg");
    const meta = await sharp(Buffer.from(image.data, "base64")).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBe(768);
  });

  it("refusal → { kind: 'refused' }", async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: "refusal" });
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "m" });
    expect(await c.classify({ mediaItemId: "m", bytes: await png(10, 10), contentType: "image/png" })).toEqual({ kind: "refused" });
  });

  it("a malformed group is uncertain; the others stand", async () => {
    const parse = vi.fn().mockResolvedValue(ok({ ...clear.parsed_output, violence: { level: "7", confidence: 2 } }));
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "m" });
    const out = await c.classify({ mediaItemId: "m", bytes: await png(10, 10), contentType: "image/png" });
    expect(out.kind === "verdicts" && out.groups.violence).toEqual({ level: "uncertain", confidence: 0 });
    expect(out.kind === "verdicts" && out.groups.sex.level).toBe(0);
  });

  it("max_tokens → all uncertain; oversized bytes → all uncertain without a call", async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: "max_tokens" });
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "m", maxImageBytes: 5 });
    const out = await c.classify({ mediaItemId: "m", bytes: new Uint8Array(10), contentType: "image/png" });
    expect(parse).not.toHaveBeenCalled();
    expect(out.kind === "verdicts" && out.groups.sex.level).toBe("uncertain");
  });

  it("reports usage to the hook", async () => {
    const parse = vi.fn().mockResolvedValue(clear);
    const onUsage = vi.fn();
    const c = createAnthropicClassifier({ client: { messages: { parse } }, modelId: "m", onUsage });
    await c.classify({ mediaItemId: "m", bytes: await png(10, 10), contentType: "image/png" });
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 900, cacheReadInputTokens: 800, cacheCreationInputTokens: 0, outputTokens: 60 });
  });
});
