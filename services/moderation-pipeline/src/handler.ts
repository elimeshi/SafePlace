/**
 * The worker's entry point: a stateless HTTP endpoint fired by a scheduler
 * (ADR 0009), not a long-lived process. One request drains one batch.
 *
 * Deliberately framework-agnostic — it takes a Request and returns a Response,
 * so the same function serves a Vercel function, a Supabase Edge Function, or
 * `node --run dev` behind any tiny server.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createAnthropicClassifierFromConfig,
  type ClassifierUsage,
} from "./providers/anthropic";
import { createEscalatingClassifier } from "./providers/escalating";
import { DEFAULT_THRESHOLDS, type ClassificationThresholds } from "./classification";
import { createStubClassifier, type ClassifierProvider } from "./classifier";
import {
  createSupabaseDerivativeStore,
  createSupabaseJobStore,
  createSupabaseMediaFetcher,
  createSupabaseOrphanSweeper,
  loadPipelineConfig,
} from "./supabase-store";
import { createAnthropicLocalizerFromConfig } from "./providers/anthropic-localizer";
import { createStubLocalizer } from "./regions";
import { createSharpRedactor } from "./redactor";
import { drainOnce, type DrainSummary, type Logger, type RedactionDeps } from "./worker";
import { sweepOrphans, type SweepSummary } from "./sweep";

export interface PipelineEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VISION_MODEL_PROVIDER?: string;
  VISION_MODEL_API_KEY?: string;
  MODERATION_WORKER_SECRET?: string;
  MODERATION_WORKER_ID?: string;
}

/**
 * Pick the provider named by configuration. Never falls back silently: a
 * deployment that meant to classify for real but quietly ran the stub would
 * mark every upload 'uncertain', bury the review queue, and look healthy
 * while doing it.
 */
const consoleLogger: Logger = {
  log: (entry) => {
    // One JSON object per line: greppable, and carrying no bytes, no
    // confidence number and no storage path.
    console.log(JSON.stringify({ service: "moderation-pipeline", ...entry }));
  },
};

export function resolveClassifierFromEnv(
  env: PipelineEnv,
  modelId = "claude-haiku-5-5",
  escalationModelId: string | null = null,
  logger: Logger = consoleLogger,
  thresholds: ClassificationThresholds = DEFAULT_THRESHOLDS
): ClassifierProvider {
  const name = env.VISION_MODEL_PROVIDER?.trim() || "stub";

  switch (name) {
    case "stub":
      return createStubClassifier();
    case "anthropic": {
      const apiKey = env.VISION_MODEL_API_KEY;
      if (!apiKey) {
        throw new Error(
          "VISION_MODEL_API_KEY is required when VISION_MODEL_PROVIDER=anthropic"
        );
      }
      // Token counts only — never the model's text (ADR 0011).
      const onUsage =
        (id: string) =>
        (usage: ClassifierUsage): void =>
          logger.log({ event: "usage", mediaItemId: "", modelId: id, usage });
      const primary = createAnthropicClassifierFromConfig({ apiKey, modelId, onUsage: onUsage(modelId) });
      if (!escalationModelId) return primary;
      return createEscalatingClassifier({
        primary,
        secondary: createAnthropicClassifierFromConfig({
          apiKey,
          modelId: escalationModelId,
          onUsage: onUsage(escalationModelId),
        }),
        thresholds,
        onEscalate: (e) =>
          logger.log({ event: "escalated", mediaItemId: e.mediaItemId, groups: e.groups }),
      });
    }
    default:
      throw new Error(`Unknown VISION_MODEL_PROVIDER: ${name}`);
  }
}

/** Run one drain pass against the live project. */
export async function runClassificationPass(
  env: PipelineEnv,
  logger: Logger = consoleLogger
): Promise<DrainSummary & SweepSummary> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to run the pipeline"
    );
  }

  const supabase: SupabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const config = await loadPipelineConfig(supabase);
  const provider = resolveClassifierFromEnv(
    env,
    config.modelId,
    config.escalationModelId,
    logger,
    config.thresholds
  );

  // Only build the redaction stage when the feature is switched on. If nobody
  // will be served a derivative, producing one is two model calls spent on an
  // object no viewer can reach.
  let redaction: RedactionDeps | undefined;
  if (config.regionBlurEnabled) {
    redaction = {
      localizer:
        env.VISION_MODEL_PROVIDER === "anthropic" && env.VISION_MODEL_API_KEY
          ? createAnthropicLocalizerFromConfig({
              apiKey: env.VISION_MODEL_API_KEY,
              modelId: config.modelId,
            })
          : createStubLocalizer(),
      redactor: createSharpRedactor(),
      derivatives: createSupabaseDerivativeStore(supabase),
      // Re-classified by the same classifier that flagged it, on purpose: the
      // question asked of the derivative is exactly the question asked of the
      // original, so a model that sees a woman in one and not the other is
      // telling us something meaningful. The primary only: an unclean
      // recheck already declines, so escalating it would buy nothing.
      recheck: resolveClassifierFromEnv(env, config.modelId, null, logger),
      maxCoverage: 0.5,
      padding: 0.15,
    };
  }

  const summary = await drainOnce(
    {
      store: createSupabaseJobStore(supabase),
      media: createSupabaseMediaFetcher(supabase),
      provider,
      modelId: config.modelId,
      workerId: env.MODERATION_WORKER_ID ?? "worker",
      thresholds: config.thresholds,
      logger,
      redaction,
    },
    config.batchSize
  );
  // Storage objects of deleted media (abandoned drafts, removed attachments).
  // A failed sweep must not fail the classification pass that already ran.
  let swept = 0;
  try {
    swept = (await sweepOrphans(createSupabaseOrphanSweeper(supabase))).swept;
  } catch (error) {
    console.error("[moderation-pipeline] orphan sweep failed:", error);
  }
  return { ...summary, swept };
}

export interface ClassificationHandlerOptions {
  /** Shared secret the scheduler presents. Without one, the endpoint refuses. */
  secret: string | undefined;
  run: () => Promise<DrainSummary>;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function createClassificationHandler(
  options: ClassificationHandlerOptions
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    // An unauthenticated drain endpoint is a free way for anyone to burn the
    // vision-API budget, so a missing secret disables the endpoint outright
    // rather than leaving it open.
    if (!options.secret) {
      return json({ error: "worker secret not configured" }, 500);
    }
    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405);
    }
    if (request.headers.get("authorization") !== `Bearer ${options.secret}`) {
      return json({ error: "unauthorized" }, 401);
    }

    try {
      return json(await options.run(), 200);
    } catch (error) {
      // The message can carry connection strings or key fragments; it goes to
      // the log, never to the response body.
      console.error("[moderation-pipeline] pass failed:", error);
      return json({ error: "classification pass failed" }, 500);
    }
  };
}

/** Convenience wiring for a deployment target that just needs a fetch handler. */
export function createHandlerFromEnv(
  env: PipelineEnv
): (request: Request) => Promise<Response> {
  return createClassificationHandler({
    secret: env.MODERATION_WORKER_SECRET,
    run: () => runClassificationPass(env),
  });
}
