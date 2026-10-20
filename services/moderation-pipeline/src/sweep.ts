/**
 * Orphaned-object sweep (ADR 0015). Deleting a media row queues its storage
 * path (migration 20261020130100); this removes the bytes. It runs inside the
 * same scheduled invocation as the classification drain (ADR 0009), because the
 * worker is the one runtime that holds the service role. Injected like the rest
 * of the worker so it can be driven against PGlite.
 */
export interface OrphanStore {
  claim(limit: number): Promise<string[]>;
  ack(paths: string[]): Promise<void>;
}

export interface ObjectRemover {
  /** Must succeed for paths that no longer exist (already gone is the goal). */
  remove(paths: string[]): Promise<void>;
}

export interface SweepSummary {
  swept: number;
}

/**
 * Remove up to `limit` queued objects. Paths are acknowledged only after the
 * removal succeeded; a failure leaves them queued for the next pass.
 */
export async function sweepOrphans(
  deps: { store: OrphanStore; objects: ObjectRemover },
  limit = 100
): Promise<SweepSummary> {
  const paths = await deps.store.claim(limit);
  if (paths.length === 0) return { swept: 0 };
  await deps.objects.remove(paths);
  await deps.store.ack(paths);
  return { swept: paths.length };
}
