/**
 * A JobStore backed by the parity harness's real Postgres, so the worker's
 * control flow can be driven against the actual SQL functions rather than
 * against a hand-written fake. Test-only: production uses the Supabase-backed
 * store in services/moderation-pipeline.
 */
import type {
  ClaimedJob,
  CompletedClassification,
  JobStore,
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
