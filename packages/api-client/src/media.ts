import type { SupabaseClient } from "@supabase/supabase-js";
import { isContentLevels, type ContentLevels, type MediaClassification } from "@safeplace/visibility-policy";

export const MEDIA_BUCKET = "media";

/** The four per-group level columns. media_items_visible serves them to the uploader only (NULL for everyone else). */
export const LEVEL_COLUMNS = "sex_level, violence_level, religion_level, addictions_level";

export interface LevelColumns {
  sex_level: number | null;
  violence_level: number | null;
  religion_level: number | null;
  addictions_level: number | null;
}

/**
 * Resolved levels from a media row, or null (not the uploader's row, or not classified yet).
 * Feeds the uploader's notice ONLY — another viewer's visibility is decided by the DB.
 */
export function levelsFromRow(row: LevelColumns): ContentLevels | null {
  const levels = { sex: row.sex_level, violence: row.violence_level, religion: row.religion_level, addictions: row.addictions_level };
  return isContentLevels(levels) ? levels : null;
}

export interface SignedMedia {
  mediaId: string;
  classification: MediaClassification;
  /** True => withheld for this viewer (render a neutral placeholder). */
  filtered: boolean;
  /** A short-lived signed URL, or null when filtered/withheld. */
  url: string | null;
}

interface VisibleMediaRow {
  id: string;
  classification: MediaClassification;
  storage_path: string | null;
  is_filtered: boolean;
}

/**
 * Resolve a viewable, signed URL for a media item — the API-tier gate
 * (visibility-model §6, layer 2). It reads media_items_visible (never the base
 * table), so the DB has ALREADY withheld storage_path for a viewer the filter
 * applies to; this helper simply refuses to mint a URL when none is served.
 *
 * A filtered item still returns a row (filtered:true) so the UI can render the
 * placeholder — the underlying reference is never handed to the client.
 */
export async function getSignedMediaUrl(
  supabase: SupabaseClient,
  mediaId: string,
  options: { expiresInSeconds?: number } = {}
): Promise<SignedMedia> {
  const { data, error } = await supabase
    .from("media_items_visible")
    .select("id, classification, storage_path, is_filtered")
    .eq("id", mediaId)
    .maybeSingle();

  if (error) {
    throw new Error(`getSignedMediaUrl: ${error.message}`);
  }
  if (!data) {
    // No visible row => the viewer isn't even permitted to know it exists.
    throw new Error(`getSignedMediaUrl: media ${mediaId} not visible`);
  }

  const row = data as VisibleMediaRow;
  if (row.is_filtered || !row.storage_path) {
    return {
      mediaId: row.id,
      classification: row.classification,
      filtered: true,
      url: null,
    };
  }

  const signed = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(row.storage_path, options.expiresInSeconds ?? 3600);
  if (signed.error || !signed.data) {
    throw new Error(
      `getSignedMediaUrl: could not sign ${mediaId}: ${signed.error?.message ?? "unknown"}`
    );
  }

  return {
    mediaId: row.id,
    classification: row.classification,
    filtered: false,
    url: signed.data.signedUrl,
  };
}

export interface UploadMediaParams {
  uploaderId: string;
  data: Blob | ArrayBuffer | Uint8Array;
  contentType: string;
  /** Object key within the uploader's folder; defaults to a random UUID. */
  objectKey?: string;
}

/**
 * Upload raw media bytes to the private bucket and return its storage path
 * (which becomes media_items.storage_path). The object is owned by the
 * uploader; storage RLS + classification then govern who can ever sign it.
 * The upload is accepted immediately — classification happens async in the
 * pipeline (Phase 3); the row starts 'unclassified'.
 */
export async function uploadMedia(
  supabase: SupabaseClient,
  params: UploadMediaParams
): Promise<{ storagePath: string }> {
  const key = params.objectKey ?? globalThis.crypto.randomUUID();
  const storagePath = `${params.uploaderId}/${key}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, params.data, { contentType: params.contentType });
  if (error) {
    throw new Error(`uploadMedia: ${error.message}`);
  }
  return { storagePath };
}
