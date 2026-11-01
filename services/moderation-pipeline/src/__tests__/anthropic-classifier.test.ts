import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { createAnthropicClassifier } from "../providers/anthropic";

async function png(w = 1600, h = 1200): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: "#808080" } }).png().toBuffer());
}

const usage = { input_tokens: 900, cache_read_input_tokens: 800, cache_creation_input_tokens: 0, output_tokens: 60 };

const reply = (groups: unknown, stop_reason = "end_turn") => ({
  content: [{ type: "text", text: JSON.stringify(groups) }],
  stop_reason,
  usage,
});

const clearGroups = {
  sex: { level: "0", confidence: 0.95 },
  violence: { level: "0", confidence: 0.95 },
  religion: { level: "1", confidence: 0.8 },
  addictions: { level: "0", confidence: 0.95 },
};
const clear = reply(clearGroups);

const UNCERTAIN = { level: "uncertain", confidence: 0 };

function make(create: ReturnType<typeof vi.fn>, extra: Record<string, unknown> = {}) {
  return createAnthropicClassifier({ client: { messages: { create } }, modelId: "m", ...extra });
}

async function run(c: ReturnType<typeof make>, bytes?: Uint8Array) {
  return c.classify({ mediaItemId: "m", bytes: bytes ?? (await png(10, 10)), contentType: "image/png" });
}

describe("createAnthropicClassifier", () => {
  it("sends a resized JPEG, the cached rubric and the schema, and parses string levels to numbers", async () => {
    const create = vi.fn().mockResolvedValue(clear);
    const c = createAnthropicClassifier({ client: { messages: { create } }, modelId: "claude-haiku-5-5" });
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
    const params = create.mock.calls[0]![0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(params.output_config.effort).toBe("low");
    expect(params.output_config.format.type).toBe("json_schema");
    const image = params.messages[0].content[0].source;
    expect(image.media_type).toBe("image/jpeg");
    const meta = await sharp(Buffer.from(image.data, "base64")).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBe(768);
  });

  it("refusal → { kind: 'refused' }, even when the response carries non-JSON text", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "I can't describe this image." }],
      stop_reason: "refusal",
    });
    expect(await run(make(create))).toEqual({ kind: "refused" });
  });

  it("a malformed group is uncertain; the others stand", async () => {
    const create = vi.fn().mockResolvedValue(reply({ ...clearGroups, violence: { level: "7", confidence: 2 } }));
    const out = await run(make(create));
    expect(out.kind === "verdicts" && out.groups.violence).toEqual(UNCERTAIN);
    expect(out.kind === "verdicts" && out.groups.sex.level).toBe(0);
  });

  it.each([
    ["empty string", ""],
    ["whitespace", " "],
    ["decimal", "1.0"],
    ["hex", "0x1"],
    ["leading space", " 1"],
    ["number, not string", 1],
  ])("a strict level parse: %s is uncertain", async (_name, level) => {
    const create = vi.fn().mockResolvedValue(reply({ ...clearGroups, sex: { level, confidence: 0.9 } }));
    const out = await run(make(create));
    expect(out.kind === "verdicts" && out.groups.sex).toEqual(UNCERTAIN);
  });

  it("a level above the group's maximum is uncertain (addictions tops out at 2)", async () => {
    const create = vi.fn().mockResolvedValue(reply({ ...clearGroups, addictions: { level: "3", confidence: 0.9 } }));
    const out = await run(make(create));
    expect(out.kind === "verdicts" && out.groups.addictions).toEqual(UNCERTAIN);
  });

  it("max_tokens with truncated JSON → all uncertain, and the API was called", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: '{"sex":{"level":"1","conf' }],
      stop_reason: "max_tokens",
    });
    const out = await run(make(create));
    expect(create).toHaveBeenCalledTimes(1);
    expect(out.kind === "verdicts" && out.groups.sex).toEqual(UNCERTAIN);
    expect(out.kind === "verdicts" && out.groups.addictions).toEqual(UNCERTAIN);
  });

  it("end_turn with non-JSON text → all uncertain, not a throw", async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "not json" }], stop_reason: "end_turn" });
    const out = await run(make(create));
    expect(out.kind === "verdicts" && out.groups.sex).toEqual(UNCERTAIN);
  });

  it("oversized bytes → all uncertain without a call", async () => {
    const create = vi.fn();
    const out = await run(make(create, { maxImageBytes: 5 }), new Uint8Array(10));
    expect(create).not.toHaveBeenCalled();
    expect(out.kind === "verdicts" && out.groups.sex.level).toBe("uncertain");
  });

  it("undecodable bytes → all uncertain without a call", async () => {
    const create = vi.fn();
    const out = await run(make(create), new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(create).not.toHaveBeenCalled();
    expect(out.kind === "verdicts" && out.groups.sex.level).toBe("uncertain");
  });

  it("reports usage to the hook", async () => {
    const create = vi.fn().mockResolvedValue(clear);
    const onUsage = vi.fn();
    await run(make(create, { onUsage }));
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 900, cacheReadInputTokens: 800, cacheCreationInputTokens: 0, outputTokens: 60 });
  });

  it("a throwing usage hook does not fail the classification", async () => {
    const create = vi.fn().mockResolvedValue(clear);
    const out = await run(make(create, { onUsage: () => { throw new Error("boom"); } }));
    expect(out.kind).toBe("verdicts");
  });
});
