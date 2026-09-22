/**
 * Anthropic implementation of RegionLocalizer. Runs only for media the
 * classifier already flagged, so most uploads never reach it.
 */
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import {
  LOCALIZER_OUTPUT_SCHEMA,
  LOCALIZER_SYSTEM_PROMPT,
  LOCALIZER_USER_INSTRUCTION,
} from "../localizer-prompt";
import { readLocalizerOutput, type LocalizerOutput, type RegionLocalizer } from "../regions";
import type { ClassifierInput } from "../classifier";
import type { MessagesParseClient } from "./anthropic";

export interface AnthropicLocalizerOptions {
  client: MessagesParseClient;
  modelId: string;
  maxImageBytes?: number;
}

/** Nothing located and no completeness claim → the caller withholds the image. */
const NOTHING: LocalizerOutput = { regions: [], foundAll: false };

const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Several rectangles, not one word — 1024 is ample and caps a runaway. */
const MAX_TOKENS = 1024;

export function createAnthropicLocalizer(
  options: AnthropicLocalizerOptions
): RegionLocalizer {
  const maxImageBytes = options.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;

  return {
    name: "anthropic",

    async locate(input: ClassifierInput): Promise<LocalizerOutput> {
      if (input.bytes.byteLength > maxImageBytes) return NOTHING;

      // Not caught: a transport failure decided nothing, so the job should
      // retry rather than fall through to withholding forever.
      const response = await options.client.messages.parse({
        model: options.modelId,
        max_tokens: MAX_TOKENS,
        system: LOCALIZER_SYSTEM_PROMPT,
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
              { type: "text", text: LOCALIZER_USER_INSTRUCTION },
            ],
          },
        ],
        output_config: { format: jsonSchemaOutputFormat(LOCALIZER_OUTPUT_SCHEMA) },
      });

      // A truncated response is the dangerous one here: it can carry a
      // syntactically fine but SHORT list of rectangles, which would blur some
      // of the women and expose the rest.
      if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
        return NOTHING;
      }

      return readLocalizerOutput(response.parsed_output ?? null);
    },
  };
}

export function createAnthropicLocalizerFromConfig(options: {
  apiKey: string;
  modelId: string;
}): RegionLocalizer {
  const client = new Anthropic({ apiKey: options.apiKey });
  return createAnthropicLocalizer({
    client: client as unknown as MessagesParseClient,
    modelId: options.modelId,
  });
}
