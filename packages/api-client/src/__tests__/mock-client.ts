/* eslint-disable @typescript-eslint/no-explicit-any -- test helper: loose types keep assertions readable under noUncheckedIndexedAccess */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Call {
  /** "from:<table>" or "rpc:<fn>" */
  target: string;
  /** chained method names with args, in order */
  ops: any[];
}
export type Result = { data?: unknown; error?: { message: string; code?: string } | null };

/**
 * A chainable, awaitable stand-in for the supabase-js query builder. Every
 * chained method is recorded; awaiting it calls `respond` with the recorded call.
 */
export function mockClient(respond: (call: Call) => Result = () => ({ data: null })) {
  const calls = [] as unknown as Call[] & Record<0 | 1 | 2 | 3 | 4, Call>;
  const builder = (call: Call): unknown => {
    const p: object = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === "then") {
            return (res: (v: unknown) => void, rej: (e: unknown) => void) => {
              const r = respond(call);
              return Promise.resolve({ data: r.data ?? null, error: r.error ?? null }).then(res, rej);
            };
          }
          return (...args: unknown[]) => {
            call.ops.push([prop, args]);
            return p;
          };
        },
      }
    );
    return p;
  };
  const start = (target: string, first?: [string, unknown[]]) => {
    const call: Call = { target, ops: first ? [first] : [] };
    calls.push(call);
    return builder(call);
  };
  const storage = {
    from: () => ({
      createSignedUrls: async (paths: string[]) => ({
        data: paths.map((path) => ({ path, signedUrl: `signed://${path}` })),
        error: null,
      }),
    }),
  };
  const client = {
    from: (t: string) => start(`from:${t}`),
    rpc: (fn: string, args: unknown) => start(`rpc:${fn}`, ["args", [args]]),
    storage,
  } as unknown as SupabaseClient;
  return { client, calls };
}

export const opsOf = (c: Call, name: string): any => c.ops.filter(([n]) => n === name).map(([, a]) => a);
export const rpcArgs = (c: Call): any => opsOf(c, "args")[0]?.[0];
