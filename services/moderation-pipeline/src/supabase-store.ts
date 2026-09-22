/**
 * Production wiring: the job store, the media fetcher and the tunable config,
 * all reached with the service role.
 *
 * The moderation schema is exposed to PostgREST so these RPCs are callable,
 * but exposure is not access — no client role holds usage on the schema or
 * privileges on its tables (migration 0008), so a request bearing an anon or
 * user token gets nothing. The grants are the gate; PostgREST just needs a
 * door to find.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_BUCKET } from "@safeplace/api-client";
import type { ClassificationThresholds } from "./classification";
import type { ClaimedJob, CompletedClassification, JobStore, MediaFetcher } from "./worker";

const MODERATION_SCHEMA = "moderation";

interface ClaimRow {
  media_item_id: string;
}

interface MediaRow {
  id: string;
  storage_path: string;
  content_type: string | null;
}

export interface PipelineConfig {
  thresholds: ClassificationThresholds;
  modelId: string;
  batchSize: number;
}

/**
 * Read the operator-tunable settings. Thresholds are deliberately data rather
 * than deployed constants (07-moderation-spec.md §2.1), so this is read once
 * per pass — a retune takes effect on the next invocation, with no deploy.
 */
export async function loadPipelineConfig(
  supabase: SupabaseClient
): Promise<PipelineConfig> {
  const { data, error } = await supabase
    .schema(MODERATION_SCHEMA)
    .rpc("get_pipeline_config");

  if (error) {
    throw new Error(`loadPipelineConfig: ${error.message}`);
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { low_max: number; high_min: number; model_id: string; batch_size: number }
    | undefined;
  if (!row) {
    throw new Error("loadPipelineConfig: no configuration row");
  }

  return {
    thresholds: { lowMax: Number(row.low_max), highMin: Number(row.high_min) },
    modelId: row.model_id,
    batchSize: row.batch_size,
  };
}

export function createSupabaseJobStore(supabase: SupabaseClient): JobStore {
  return {
    async claim(batchSize: number, workerId: string): Promise<ClaimedJob[]> {
      const { data, error } = await supabase
        .schema(MODERATION_SCHEMA)
        .rpc("claim_classification_jobs", {
          p_batch_size: batchSize,
          p_worker_id: workerId,
        });
      if (error) throw new Error(`claim: ${error.message}`);

      const claimed = (data ?? []) as ClaimRow[];
      if (claimed.length === 0) return [];

      // The claim returns job rows; the bytes live behind media_items. Read as
      // the service role, which is the only role permitted to see a
      // storage_path for media nobody is allowed to view yet.
      const { data: media, error: mediaError } = await supabase
        .from("media_items")
        .select("id, storage_path, content_type")
        .in("id", claimed.map((c) => c.media_item_id));
      if (mediaError) throw new Error(`claim media: ${mediaError.message}`);

      const byId = new Map((media as MediaRow[]).map((m) => [m.id, m]));
      return claimed.flatMap((c) => {
        const row = byId.get(c.media_item_id);
        if (!row) return [];
        return [
          {
            mediaItemId: row.id,
            storagePath: row.storage_path,
            // A missing content type is treated as unsupported, which routes
            // the item to a human rather than guessing at its format.
            contentType: row.content_type ?? "application/octet-stream",
          },
        ];
      });
    },

    async complete(result: CompletedClassification): Promise<void> {
      const { error } = await supabase
        .schema(MODERATION_SCHEMA)
        .rpc("complete_classification_job", {
          p_media_item_id: result.mediaItemId,
          p_classification: result.classification,
          p_provider: result.provider,
          p_model_id: result.modelId,
          p_verdict: result.verdict,
          p_confidence: result.confidence,
          p_woman_probability: result.womanProbability,
        });
      if (error) throw new Error(`complete: ${error.message}`);
    },

    async fail(mediaItemId: string, message: string): Promise<void> {
      const { error } = await supabase
        .schema(MODERATION_SCHEMA)
        .rpc("fail_classification_job", {
          p_media_item_id: mediaItemId,
          p_error: message,
        });
      if (error) throw new Error(`fail: ${error.message}`);
    },
  };
}

/**
 * Fetch the original bytes from the private bucket. The service role reads the
 * object directly rather than minting a signed URL — a signed URL is the
 * viewer-facing path and is gated on visibility, which for an unclassified
 * item withholds it by design.
 */
export function createSupabaseMediaFetcher(supabase: SupabaseClient): MediaFetcher {
  return {
    async fetch(storagePath: string): Promise<Uint8Array> {
      const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .download(storagePath);
      if (error || !data) {
        throw new Error(`download ${storagePath}: ${error?.message ?? "no data"}`);
      }
      return new Uint8Array(await data.arrayBuffer());
    },
  };
}
