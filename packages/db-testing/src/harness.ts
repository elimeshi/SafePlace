import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");
const PLATFORM_SHIM = join(HERE, "shims", "supabase-platform.sql");

/** A minimal query surface, satisfied by both PGlite and its transactions. */
export interface Querier {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }>;
}

export interface TestDb {
  /**
   * Superuser / table-owner connection. RLS is bypassed here — use it ONLY to
   * seed fixtures and inspect ground truth, never to assert enforcement.
   */
  readonly raw: PGlite;
  /** Run `fn` as a specific signed-in user (role `authenticated`, RLS applies). */
  asUser<T>(userId: string, fn: (q: Querier) => Promise<T>): Promise<T>;
  /** Run `fn` as an anonymous (logged-out) request (role `anon`, RLS applies). */
  asAnon<T>(fn: (q: Querier) => Promise<T>): Promise<T>;
  /** Run `fn` as the backend `service_role` (BYPASSRLS) — e.g. the pipeline. */
  asService<T>(fn: (q: Querier) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/**
 * Boot an in-process Postgres (PGlite/WASM), inject the Supabase platform shim,
 * then apply every supabase/migrations/*.sql in order. The result is a database
 * whose schema, RLS policies, triggers, and grants are byte-identical to what
 * `supabase db reset` and the cloud project run — the harness only differs in
 * the transport it uses to assume a user's identity.
 */
export async function createTestDb(): Promise<TestDb> {
  const db = new PGlite();
  await db.exec(readFileSync(PLATFORM_SHIM, "utf8"));

  for (const file of listMigrations()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await db.exec(sql);
    } catch (err) {
      throw new Error(
        `Failed applying migration ${file}: ${(err as Error).message}`
      );
    }
  }

  async function withClaims<T>(
    role: string,
    claims: Record<string, unknown> | null,
    fn: (q: Querier) => Promise<T>
  ): Promise<T> {
    return db.transaction(async (tx) => {
      await tx.query(`set local role ${role}`);
      await tx.query("select set_config('request.jwt.claims', $1, true)", [
        claims ? JSON.stringify(claims) : "",
      ]);
      return fn(tx as Querier);
    }) as Promise<T>;
  }

  return {
    raw: db,
    asUser: (userId, fn) =>
      withClaims("authenticated", { sub: userId, role: "authenticated" }, fn),
    asAnon: (fn) => withClaims("anon", { role: "anon" }, fn),
    asService: (fn) =>
      withClaims("service_role", { role: "service_role" }, fn),
    close: () => db.close(),
  };
}
