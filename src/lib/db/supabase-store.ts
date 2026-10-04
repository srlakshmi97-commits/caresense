// Supabase persistence. Every query runs with the signed-in user's JWT, so
// Postgres row-level security (supabase/schema.sql) is the final gatekeeper —
// the service-layer checks in lib/access.ts are defence in depth.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileStore, Store } from "./store";
import { StoreError } from "./store";
import { RECORDS_BUCKET } from "../config";

export function supabaseStore(sb: SupabaseClient): Store {
  const fail = (op: string, error: unknown): never => {
    // Never log row contents — only the operation and error code.
    const code = (error as { code?: string })?.code ?? "unknown";
    console.error(`[caresense] supabase ${op} failed (code ${code})`);
    throw new StoreError(`database ${op} failed`, error);
  };

  return {
    async list(table, where, opts) {
      let q = sb.from(table).select("*");
      for (const [k, v] of Object.entries(where ?? {})) if (v !== undefined) q = q.eq(k, v as never);
      if (opts?.range) {
        if (opts.range.from) q = q.gte(opts.range.column, opts.range.from);
        if (opts.range.to) q = q.lt(opts.range.column, opts.range.to);
      }
      if (opts?.in) q = q.in(opts.in.column as string, opts.in.values as never[]);
      if (opts?.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending !== false });
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) fail(`list ${table}`, error);
      return (data ?? []) as never;
    },
    async get(table, id) {
      const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
      if (error) fail(`get ${table}`, error);
      return (data ?? null) as never;
    },
    async insert(table, row) {
      const { data, error } = await sb.from(table).insert(row as never).select("*").single();
      if (error) fail(`insert ${table}`, error);
      return data as never;
    },
    async update(table, id, patch) {
      const { data, error } = await sb.from(table).update(patch as never).eq("id", id).select("*").single();
      if (error) fail(`update ${table}`, error);
      return data as never;
    },
    async remove(table, id) {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) fail(`delete ${table}`, error);
    },
    async acceptInvite(code) {
      const { data, error } = await sb.rpc("accept_family_invite", { code: code.trim().toUpperCase() });
      if (error) fail("accept invite", error);
      return (data as string | null) ?? null;
    },
  };
}

export function supabaseFiles(sb: SupabaseClient): FileStore {
  return {
    async put(path, data, contentType) {
      // upsert: false — originals are immutable.
      const { error } = await sb.storage.from(RECORDS_BUCKET).upload(path, data, { contentType, upsert: false });
      if (error) throw new StoreError("upload failed", error);
    },
    async get(path) {
      const { data, error } = await sb.storage.from(RECORDS_BUCKET).download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
  };
}
