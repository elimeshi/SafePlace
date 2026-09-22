/**
 * A JobStore backed by the parity harness's real Postgres, so the worker's
 * control flow can be driven against the actual SQL functions rather than
 * against a hand-written fake. Test-only: production uses the Supabase-backed
 * store in services/moderation-pipeline.
 */
import type {
  ClaimedJob,
  CompletedClassification,
  DerivativeStore,
  JobStore,
  RedactionRecord,
} from "@safeplace/moderation-pipeline";
import type { TestDb } from "./harness";

export function createPgliteJobStore(db: TestDb): JobStore {
  return {
    async claim(batchSize: number, workerId: string): Promise<ClaimedJob[]> {
      const { rows } = await db.asService((q) =>
        q.query<{ media_item_id: string; storage_path: string; content_type: string }>(
          `select j.media_item_id, m.storage_path, coalesce(m.content_type, 'application/octet-stream') as content_type
             from moderation.claim_classification_jobs($1, $2) j
             join public.media_items m on m.id = j.media_item_id`,
          [batchSize, workerId]
        )
      );
      return rows.map((r) => ({
        mediaItemId: r.media_item_id,
        storagePath: r.storage_path,
        contentType: r.content_type,
      }));
    },

    async complete(result: CompletedClassification): Promise<void> {
      await db.asService((q) =>
        q.query(
          `select moderation.complete_classification_job(
             $1, $2::media_classification, $3, $4, $5, $6, $7)`,
          [
            result.mediaItemId,
            result.classification,
            result.provider,
            result.modelId,
            result.verdict,
            result.confidence,
            result.womanProbability,
          ]
        )
      );
    },

    async fail(mediaItemId: string, error: string): Promise<void> {
      await db.asService((q) =>
        q.query(`select moderation.fail_classification_job($1, $2)`, [mediaItemId, error])
      );
    },
  };
}

/**
 * DerivativeStore backed by the harness. "Uploading" is inserting the object
 * row that storage RLS gates on — which is the part the visibility guarantee
 * actually depends on.
 */
export function createPglitePersistedDerivativeStore(db: TestDb): DerivativeStore {
  return {
    async put(mediaItemId: string, bytes: Uint8Array): Promise<string> {
      const { rows } = await db.asService((q) =>
        q.query<{ storage_path: string; uploader_id: string }>(
          `select storage_path, uploader_id from public.media_items where id = $1`,
          [mediaItemId]
        )
      );
      const source = rows[0];
      if (!source) throw new Error(`no media ${mediaItemId}`);
      const path = `${source.storage_path}.redacted.png`;
      await db.asService((q) =>
        q.query(
          `insert into storage.objects (bucket_id, name, owner) values ('media', $1, $2)
           on conflict do nothing`,
          [path, source.uploader_id]
        )
      );
      // Byte count only — the harness has no object store, and what this test
      // proves is the wiring and the visibility rules, not blob persistence.
      void bytes.byteLength;
      return path;
    },

    async attach(record: RedactionRecord): Promise<void> {
      await db.asService((q) =>
        q.query(
          `select moderation.attach_redaction($1, $2, $3, $4, $5, $6, $7)`,
          [
            record.mediaItemId,
            record.storagePath,
            record.regionCount,
            record.coverage,
            record.localizer,
            record.modelId,
            record.verified,
          ]
        )
      );
    },
  };
}
