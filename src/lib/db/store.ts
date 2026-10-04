import type { TableName, Tables } from "../types";

export type Where<T> = Partial<{ [K in keyof T]: T[K] }>;

export interface ListOptions<T> {
  orderBy?: keyof T & string;
  ascending?: boolean;
  limit?: number;
  /** Inclusive lower / exclusive upper bound on a date/time column. */
  range?: { column: keyof T & string; from?: string; to?: string };
  /** Column value must be one of these. */
  in?: { column: keyof T & string; values: string[] };
}

/**
 * Minimal persistence contract. Services talk only to this interface, so the
 * demo JSON store and Supabase (Postgres + RLS) are interchangeable.
 */
export interface Store {
  list<N extends TableName>(table: N, where?: Where<Tables[N]>, opts?: ListOptions<Tables[N]>): Promise<Tables[N][]>;
  get<N extends TableName>(table: N, id: string): Promise<Tables[N] | null>;
  insert<N extends TableName>(table: N, row: Tables[N]): Promise<Tables[N]>;
  update<N extends TableName>(table: N, id: string, patch: Partial<Tables[N]>): Promise<Tables[N]>;
  remove(table: TableName, id: string): Promise<void>;
  /** Accept a family invite code (privileged: bypasses RLS via a SECURITY DEFINER function). */
  acceptInvite(code: string, profileId: string, displayName: string): Promise<string | null>;
}

export interface FileStore {
  put(path: string, data: Buffer, contentType: string): Promise<void>;
  get(path: string): Promise<Buffer | null>;
}

export class StoreError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
  }
}
