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
import { isContentLevels, type MediaClassification } from "@safeplace/visibility-policy";
import type { ClassificationThresholds } from "./classification";
import type { MediaHashes } from "./hashes";
import type { ObjectRemover, OrphanStore } from "./sweep";
import type {
  ClaimedJob,
  CompletedClassification,
  DerivativeStore,
  JobStore,
  MediaFetcher,
  RedactionRecord,
  ResolvedByHash,
} from "./worker";

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
  /** Second-opinion model for undecided groups; null = escalation off (ADR 0018 §6). */
  escalationModelId: string | null;
  batchSize: number;
  /** Gates the redaction stage. Off until the feature has product sign-off. */
  regionBlurEnabled: boolean;
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
    | {
        low_max: number;
        high_min: number;
        model_id: string;
        escalation_model_id: string | null;
        batch_size: number;
        region_blur_enabled: boolean;
      }
    | undefined;
  if (!row) {
    throw new Error("loadPipelineConfig: no configuration row");
  }

  return {
    thresholds: { lowMax: Number(row.low_max), highMin: Number(row.high_min) },
    modelId: row.model_id,
    escalationModelId: row.escalation_model_id?.trim() || null,
    batchSize: row.batch_size,
    regionBlurEnabled: row.region_blur_enabled === true,
  };
}

/**
 * Stores redacted derivatives beside their originals, in the same private
 * bucket. The derivative is subject to exactly the same storage policy as
 * everything else: it is reachable only if media_items_visible hands the
 * caller its path.
 */
export function createSupabaseDerivativeStore(
  supabase: SupabaseClient
): DerivativeStore {
  return {
    async put(mediaItemId: string, bytes: Uint8Array): Promise<string> {
      const { data: media, error: lookupError } = await supabase
        .from("media_items")
        .select("storage_path")
        .eq("id", mediaItemId)
        .single();
      if (lookupError || !media) {
        throw new Error(`derivative put: ${lookupError?.message ?? "media not found"}`);
      }

      const storagePath = `${(media as { storage_path: string }).storage_path}.redacted.png`;
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(storagePath, bytes, { contentType: "image/png", upsert: true });
      if (error) {
        throw new Error(`derivative put: ${error.message}`);
      }
      return storagePath;
    },

    async attach(record: RedactionRecord): Promise<void> {
      const { error } = await supabase
        .schema(MODERATION_SCHEMA)
        .rpc("attach_redaction", {
          p_media_item_id: record.mediaItemId,
          p_storage_path: record.storagePath,
          p_region_count: record.regionCount,
          p_coverage: record.coverage,
          p_localizer: record.localizer,
          p_model_id: record.modelId,
          p_verified: record.verified,
        });
      if (error) {
        throw new Error(`attach redaction: ${error.message}`);
      }
    },
  };
}

export interface ResolvedRow {
  media_item_id: string;
  classification: MediaClassification;
  sex_level: number | null;
  violence_level: number | null;
  religion_level: number | null;
  addictions_level: number | null;
}

/** Shared with the PGlite store, so both copy a prior verdict under the same rule. */
export function resolvedFromRow(row: ResolvedRow | null | undefined): ResolvedByHash | null {
  if (!row) return null;
  const levels = {
    sex: row.sex_level,
    violence: row.violence_level,
    religion: row.religion_level,
    addictions: row.addictions_level,
  };
  // A row without full levels is not a verdict to copy.
  if (!isContentLevels(levels)) return null;
  return { sourceMediaItemId: row.media_item_id, classification: row.classification, levels };
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
          p_levels: result.levels,
          p_review_reason: result.reviewReason,
          p_ai_levels: result.aiLevels,
          p_content_sha256: result.contentSha256,
          p_content_dhash: result.contentDhash,
        });
      if (error) throw new Error(`complete: ${error.message}`);
    },

    async findResolvedByHash(
      hashes: MediaHashes,
      excludeMediaItemId: string
    ): Promise<ResolvedByHash | null> {
      if (!hashes.sha256 && !hashes.dhash) return null;
      const { data, error } = await supabase
        .schema(MODERATION_SCHEMA)
        .rpc("find_resolved_by_hash", {
          p_sha256: hashes.sha256,
          p_dhash: hashes.dhash,
          p_exclude: excludeMediaItemId,
        });
      if (error) throw new Error(`dedupe lookup: ${error.message}`);
      return resolvedFromRow((Array.isArray(data) ? data[0] : data) as ResolvedRow | undefined);
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

/** The orphaned-object queue (ADR 0015) and the bucket the objects live in. */
export function createSupabaseOrphanSweeper(supabase: SupabaseClient): {
  store: OrphanStore;
  objects: ObjectRemover;
} {
  return {
    store: {
      async claim(limit: number): Promise<string[]> {
        const { data, error } = await supabase
          .schema(MODERATION_SCHEMA)
          .rpc("claim_orphaned_objects", { p_limit: limit });
        if (error) throw new Error(`claim orphans: ${error.message}`);
        return (data ?? []) as string[];
      },
      async ack(paths: string[]): Promise<void> {
        const { error } = await supabase
          .schema(MODERATION_SCHEMA)
          .rpc("ack_orphaned_objects", { p_paths: paths });
        if (error) throw new Error(`ack orphans: ${error.message}`);
      },
    },
    objects: {
      async remove(paths: string[]): Promise<void> {
        const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
        if (error) throw new Error(`remove orphans: ${error.message}`);
      },
    },
  };
}
