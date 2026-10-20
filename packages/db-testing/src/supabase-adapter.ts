import type { SupabaseClient } from "@supabase/supabase-js";
import type { TestDb } from "./harness";

type Result = { data: unknown; error: { message: string; code?: string } | null };
type Op = "select" | "insert" | "update" | "delete";

/**
 * The smallest slice of the supabase-js API the @safeplace/api-client wrappers
 * use (from/select/insert/update/delete/eq/in/is/order/limit/single/maybeSingle
 * and rpc), executed as a signed-in user against PGlite — so the wrappers'
 * real calls hit the real migrations and RLS. Not a general PostgREST clone:
 * `.or()` and `storage` are deliberately absent.
 */
export function pgliteClient(db: TestDb, userId: string): SupabaseClient {
  const run = async (sql: string, params: unknown[]): Promise<Result> => {
    try {
      const { rows } = await db.asUser(userId, (q) => q.query(sql, params));
      return { data: rows, error: null };
    } catch (e) {
      const err = e as { message: string; code?: string };
      return { data: null, error: { message: err.message, code: err.code } };
    }
  };

  const from = (table: string) => {
    let op: Op = "select";
    let cols = "*";
    let returning = false;
    let body: Record<string, unknown>[] = [];
    const where: string[] = [];
    const params: unknown[] = [];
    let order = "";
    let limit = "";
    let mode: "many" | "single" | "maybe" = "many";

    const p = (v: unknown) => `$${params.push(v)}`;
    const exec = async (): Promise<Result> => {
      const w = where.length ? ` where ${where.join(" and ")}` : "";
      let sql: string;
      if (op === "insert") {
        const keys = Object.keys(body[0] ?? {});
        const values = body.map((r) => `(${keys.map((k) => p(r[k])).join(", ")})`).join(", ");
        sql = `insert into ${table} (${keys.join(", ")}) values ${values}`;
      } else if (op === "update") {
        const sets = Object.entries(body[0] ?? {}).map(([k, v]) => `${k} = ${p(v)}`);
        sql = `update ${table} set ${sets.join(", ")}${w}`;
      } else if (op === "delete") {
        sql = `delete from ${table}${w}`;
      } else {
        sql = `select ${cols} from ${table}${w}${order}${limit}`;
      }
      if (op !== "select" && returning) sql += ` returning ${cols}`;
      const r = await run(sql, params);
      if (r.error || mode === "many") return r;
      const rows = r.data as unknown[];
      if (mode === "single" && rows.length !== 1) {
        return { data: null, error: { message: `expected 1 row, got ${rows.length}` } };
      }
      return { data: rows[0] ?? null, error: null };
    };

    const b: Record<string, unknown> = {
      select(c = "*") {
        cols = c;
        if (op !== "select") returning = true;
        return b;
      },
      insert(v: Record<string, unknown> | Record<string, unknown>[]) {
        op = "insert";
        body = Array.isArray(v) ? v : [v];
        return b;
      },
      update(v: Record<string, unknown>) {
        op = "update";
        body = [v];
        return b;
      },
      delete() {
        op = "delete";
        return b;
      },
      eq(k: string, v: unknown) {
        where.push(`${k} = ${p(v)}`);
        return b;
      },
      in(k: string, v: unknown[]) {
        where.push(`${k} = any(${p(v)})`);
        return b;
      },
      is(k: string, v: null) {
        where.push(`${k} is ${v === null ? "null" : "not null"}`);
        return b;
      },
      order(k: string, o: { ascending?: boolean } = {}) {
        order += `${order ? ", " : " order by "}${k}${o.ascending === false ? " desc" : ""}`;
        return b;
      },
      limit(n: number) {
        limit = ` limit ${Number(n)}`;
        return b;
      },
      single() {
        mode = "single";
        return b;
      },
      maybeSingle() {
        mode = "maybe";
        return b;
      },
      then: (res: (v: Result) => unknown, rej: (e: unknown) => unknown) => exec().then(res, rej),
    };
    return b;
  };

  const rpc = (fn: string, args: Record<string, unknown> = {}) => {
    const keys = Object.keys(args);
    const sql = `select * from public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`;
    const result = run(sql, keys.map((k) => args[k])).then((r) => {
      // Scalar-returning functions come back as {fn: value}; unwrap like PostgREST.
      const rows = r.data as Record<string, unknown>[] | null;
      return rows && rows.length === 1 && Object.keys(rows[0] ?? {}).length === 1 && Object.keys(rows[0] ?? {})[0] === fn
        ? { data: rows[0]?.[fn], error: r.error }
        : r;
    });
    return { then: result.then.bind(result) };
  };

  return { from, rpc } as unknown as SupabaseClient;
}
