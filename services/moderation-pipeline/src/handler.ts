/**
 * The worker's entry point: a stateless HTTP endpoint fired by a scheduler
 * (ADR 0011), not a long-lived process. One request drains one batch.
 *
 * Deliberately framework-agnostic — it takes a Request and returns a Response,
 * so the same function serves a Vercel function, a Supabase Edge Function, or
 * `node --run dev` behind any tiny server.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAnthropicClassifierFromConfig } from "./providers/anthropic";
import { createStubClassifier, type ClassifierProvider } from "./classifier";
import {
  createSupabaseJobStore,
  createSupabaseMediaFetcher,
  loadPipelineConfig,
} from "./supabase-store";
import { drainOnce, type DrainSummary, type Logger } from "./worker";

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
export function resolveClassifierFromEnv(
  env: PipelineEnv,
  modelId = "claude-haiku-4-5"
): ClassifierProvider {
  const name = env.VISION_MODEL_PROVIDER?.trim() || "stub";

  switch (name) {
    case "stub":
      return createStubClassifier();
    case "anthropic": {
      if (!env.VISION_MODEL_API_KEY) {
        throw new Error(
          "VISION_MODEL_API_KEY is required when VISION_MODEL_PROVIDER=anthropic"
        );
      }
      return createAnthropicClassifierFromConfig({
        apiKey: env.VISION_MODEL_API_KEY,
        modelId,
      });
    }
    default:
      throw new Error(`Unknown VISION_MODEL_PROVIDER: ${name}`);
  }
}

const consoleLogger: Logger = {
  log: (entry) => {
    // One JSON object per line: greppable, and carrying no bytes, no
    // confidence number and no storage path.
    console.log(JSON.stringify({ service: "moderation-pipeline", ...entry }));
  },
};

/** Run one drain pass against the live project. */
export async function runClassificationPass(
  env: PipelineEnv,
  logger: Logger = consoleLogger
): Promise<DrainSummary> {
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

  return drainOnce(
    {
      store: createSupabaseJobStore(supabase),
      media: createSupabaseMediaFetcher(supabase),
      provider: resolveClassifierFromEnv(env, config.modelId),
      modelId: config.modelId,
      workerId: env.MODERATION_WORKER_ID ?? "worker",
      thresholds: config.thresholds,
      logger,
    },
    config.batchSize
  );
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
