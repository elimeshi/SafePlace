/**
 * The Anthropic vision implementation of ClassifierProvider (ADR 0004, 0018).
 *
 * The model id is configuration and never a literal in pipeline code, so
 * escalating to a more capable model is a config change. The messages client
 * is injected, so the decision logic is testable without a network call and
 * no test run spends money.
 */
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import sharp from "sharp";
import { CONTENT_GROUPS, MAX_LEVEL_BY_GROUP } from "@safeplace/visibility-policy";
import {
  CLASSIFIER_OUTPUT_SCHEMA,
  CLASSIFIER_SYSTEM_PROMPT,
  CLASSIFIER_USER_INSTRUCTION,
} from "../classifier-prompt";
import {
  UNCERTAIN_VERDICT,
  allUncertain,
  type ClassifierInput,
  type ClassifierOutput,
  type ClassifierProvider,
  type ClassifierVerdicts,
  type GroupVerdict,
} from "../classifier";

/**
 * The narrow slice of the SDK the classifier uses. A port for injection, not a
 * re-declaration of the SDK's types — production passes a real Anthropic
 * client straight in.
 */
export interface MessagesParseClient {
  messages: {
    parse(params: Record<string, unknown>): Promise<{
      parsed_output?: unknown;
      stop_reason?: string | null;
      usage?: {
        input_tokens?: number;
        cache_read_input_tokens?: number | null;
        cache_creation_input_tokens?: number | null;
        output_tokens?: number;
      };
    }>;
  };
}

export interface ClassifierUsage {
  inputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  outputTokens: number;
}

export interface AnthropicClassifierOptions {
  client: MessagesParseClient;
  /** Read from config (VISION_MODEL_ID) — never hardcoded upstream. */
  modelId: string;
  /** Hard ceiling on what is read from storage. Defaults to 10 MB. */
  maxImageBytes?: number;
  /** Long edge the image is shrunk to before sending. Defaults to 768. */
  maxLongEdge?: number;
  /** Token accounting per call; the worker logs it. Never persisted with the image. */
  onUsage?: (usage: ClassifierUsage) => void;
}

const DEFAULT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_LONG_EDGE = 768;

/**
 * A classification answer is short and structured; 256 tokens is ample, and
 * capping it keeps a malformed generation from running up a bill.
 */
const MAX_TOKENS = 256;

/**
 * Shrink before sending: Haiku 5.5 is a high-resolution-tier model and bills
 * ceil(w/28)*ceil(h/28) visual tokens, so a 1920x1080 phone photo costs 2,691
 * tokens unresized and ~784 at 768 px. Classification does not need the
 * pixels. If sharp cannot read the bytes, the original is sent as-is.
 */
async function prepareImage(
  bytes: Uint8Array,
  contentType: string,
  maxLongEdge: number
): Promise<{ data: string; mediaType: string }> {
  try {
    const out = await sharp(Buffer.from(bytes), { animated: false })
      .rotate()
      .resize({ width: maxLongEdge, height: maxLongEdge, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { data: out.toString("base64"), mediaType: "image/jpeg" };
  } catch {
    return { data: Buffer.from(bytes).toString("base64"), mediaType: contentType };
  }
}

/** Trust boundary for model output: anything outside the rubric is uncertain. */
function readGroup(raw: unknown, group: (typeof CONTENT_GROUPS)[number]): GroupVerdict {
  if (raw === null || typeof raw !== "object") return UNCERTAIN_VERDICT;
  const { level, confidence } = raw as { level?: unknown; confidence?: unknown };
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return UNCERTAIN_VERDICT;
  }
  if (level === "uncertain") return { level: "uncertain", confidence: 0 };
  const n = typeof level === "string" ? Number(level) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > MAX_LEVEL_BY_GROUP[group]) return UNCERTAIN_VERDICT;
  return { level: n as 0 | 1 | 2 | 3, confidence };
}

export function readOutput(parsed: unknown): ClassifierOutput {
  if (parsed === null || typeof parsed !== "object") return allUncertain();
  const groups = Object.fromEntries(
    CONTENT_GROUPS.map((g) => [g, readGroup((parsed as Record<string, unknown>)[g], g)])
  ) as ClassifierVerdicts;
  return { kind: "verdicts", groups };
}

export function createAnthropicClassifier(
  options: AnthropicClassifierOptions
): ClassifierProvider {
  const maxImageBytes = options.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const maxLongEdge = options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;

  return {
    name: "anthropic",

    async classify(input: ClassifierInput): Promise<ClassifierOutput> {
      // Too large to send: report that nothing was concluded rather than
      // throwing, because retrying will not make the image smaller. The item
      // goes to a human instead of looping through the backoff schedule.
      if (input.bytes.byteLength > maxImageBytes) return allUncertain();

      const image = await prepareImage(input.bytes, input.contentType, maxLongEdge);

      // A transport failure is deliberately NOT caught here. Nothing was
      // decided, so the worker should retry with backoff — which is a
      // different outcome from the model returning something unusable.
      const response = await options.client.messages.parse({
        model: options.modelId,
        max_tokens: MAX_TOKENS,
        // Cached: the rubric is the same bytes on every call and is > 512 tokens,
        // Haiku 5.5's minimum cacheable prefix.
        system: [{ type: "text", text: CLASSIFIER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
              { type: "text", text: CLASSIFIER_USER_INSTRUCTION },
            ],
          },
        ],
        // Haiku 5.5 defaults to medium effort; classification is a low-effort route.
        output_config: { effort: "low", format: jsonSchemaOutputFormat(CLASSIFIER_OUTPUT_SCHEMA) },
      });

      if (response.usage && options.onUsage) {
        options.onUsage({
          inputTokens: response.usage.input_tokens ?? 0,
          cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
          cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
          outputTokens: response.usage.output_tokens ?? 0,
        });
      }

      // A refusal is a verdict of its own kind (ADR 0018 §5): the model saw
      // something it would not describe. A human looks; it is never retried.
      if (response.stop_reason === "refusal") return { kind: "refused" };
      if (response.stop_reason === "max_tokens") return allUncertain();
      return readOutput(response.parsed_output ?? null);
    },
  };
}

export interface AnthropicClassifierEnvOptions {
  apiKey: string;
  modelId: string;
  maxImageBytes?: number;
  onUsage?: (usage: ClassifierUsage) => void;
}

/** Production wiring: a real SDK client behind the same interface. */
export function createAnthropicClassifierFromConfig(
  options: AnthropicClassifierEnvOptions
): ClassifierProvider {
  const client = new Anthropic({ apiKey: options.apiKey });
  return createAnthropicClassifier({
    client: client as unknown as MessagesParseClient,
    modelId: options.modelId,
    maxImageBytes: options.maxImageBytes,
    onUsage: options.onUsage,
  });
}
