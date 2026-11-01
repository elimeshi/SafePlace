/**
 * The Anthropic vision implementation of ClassifierProvider (ADR 0004).
 *
 * The model id is configuration and never a literal in pipeline code, so
 * escalating to a more capable model is a config change. The messages client
 * is injected, so the decision logic is testable without a network call and
 * no test run spends money.
 */
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import {
  CLASSIFIER_OUTPUT_SCHEMA,
  CLASSIFIER_SYSTEM_PROMPT,
  CLASSIFIER_USER_INSTRUCTION,
} from "../classifier-prompt";
import {
  UNCERTAIN_VERDICT,
  allUncertain,
  verdictsOf,
  type ClassifierInput,
  type ClassifierOutput,
  type ClassifierProvider,
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
    }>;
  };
}

export interface AnthropicClassifierOptions {
  client: MessagesParseClient;
  /** Read from config (VISION_MODEL_ID) — never hardcoded upstream. */
  modelId: string;
  /** Hard ceiling on what is sent to the API. Defaults to 5 MB. */
  maxImageBytes?: number;
}

/** Nothing could be concluded — routes to the medium band, i.e. to a human. */
const UNCERTAIN: ClassifierOutput = allUncertain(); // replaced in Task 4

const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * A classification answer is short and structured; 256 tokens is ample, and
 * capping it keeps a malformed generation from running up a bill.
 */
const MAX_TOKENS = 256;

function readOutput(parsed: unknown): ClassifierOutput {
  if (parsed === null || typeof parsed !== "object") return UNCERTAIN;

  const { verdict, confidence } = parsed as {
    verdict?: unknown;
    confidence?: unknown;
  };

  if (
    verdict !== "woman_present" &&
    verdict !== "no_woman" &&
    verdict !== "uncertain"
  ) {
    return UNCERTAIN;
  }
  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return UNCERTAIN;
  }

  // replaced in Task 4: the old single-axis answer, mapped onto the sex group.
  return verdictsOf({
    sex:
      verdict === "uncertain"
        ? UNCERTAIN_VERDICT
        : { level: verdict === "woman_present" ? 1 : 0, confidence },
  }, confidence);
}

export function createAnthropicClassifier(
  options: AnthropicClassifierOptions
): ClassifierProvider {
  const maxImageBytes = options.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;

  return {
    name: "anthropic",

    async classify(input: ClassifierInput): Promise<ClassifierOutput> {
      // Too large to send: report that nothing was concluded rather than
      // throwing, because retrying will not make the image smaller. The item
      // goes to a human instead of looping through the backoff schedule.
      if (input.bytes.byteLength > maxImageBytes) {
        return UNCERTAIN;
      }

      // A transport failure is deliberately NOT caught here. Nothing was
      // decided, so the worker should retry with backoff — which is a
      // different outcome from the model returning something unusable.
      const response = await options.client.messages.parse({
        model: options.modelId,
        max_tokens: MAX_TOKENS,
        system: CLASSIFIER_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: input.contentType,
                  data: Buffer.from(input.bytes).toString("base64"),
                },
              },
              { type: "text", text: CLASSIFIER_USER_INSTRUCTION },
            ],
          },
        ],
        output_config: { format: jsonSchemaOutputFormat(CLASSIFIER_OUTPUT_SCHEMA) },
      });

      // A refusal or a truncated generation decided nothing, whatever else
      // came back with it.
      if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
        return UNCERTAIN;
      }

      return readOutput(response.parsed_output ?? null);
    },
  };
}

export interface AnthropicClassifierEnvOptions {
  apiKey: string;
  modelId: string;
  maxImageBytes?: number;
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
  });
}
