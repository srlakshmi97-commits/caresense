// Demo-mode persistence: a single JSON file in ./.data (or /tmp on serverless).
// Used only when Supabase is not configured. Contains fictional data only.
// Access control in demo mode is enforced by the service layer (lib/access.ts).

import { promises as fs } from "fs";
import path from "path";
import type { TableName, Tables } from "../types";
import type { FileStore, ListOptions, Store, Where } from "./store";
import { StoreError } from "./store";

type DB = { [N in TableName]: Tables[N][] };

export const DATA_DIR = process.env.VERCEL ? "/tmp/caresense-data" : path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "caresense.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const EMPTY: DB = {
  profiles: [],
  check_ins: [],
  patients: [],
  family_links: [],
  pain_episodes: [],
  meals: [],
  medications: [],
  medication_logs: [],
  medical_records: [],
  record_extractions: [],
  timeline_events: [],
  safety_alerts: [],
  notifications: [],
  audit_log: [],
};

// Survive Next.js dev hot reloads.
const g = globalThis as unknown as { __caresenseDb?: Promise<DB>; __caresenseWrite?: Promise<void> };

async function load(): Promise<DB> {
  if (!g.__caresenseDb) {
    g.__caresenseDb = (async () => {
      try {
        const raw = await fs.readFile(DB_FILE, "utf8");
        return { ...structuredClone(EMPTY), ...JSON.parse(raw) } as DB;
      } catch {
        const { buildDemoData } = await import("../demo/seed");
        const db = { ...structuredClone(EMPTY), ...(await buildDemoData(demoFiles)) } as DB;
        await persist(db);
        return db;
      }
    })();
  }
  return g.__caresenseDb;
}

async function persist(db: DB) {
  const write = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(db, null, 1), "utf8");
    await fs.rename(tmp, DB_FILE);
  };
  g.__caresenseWrite = (g.__caresenseWrite ?? Promise.resolve()).then(write, write);
  await g.__caresenseWrite;
}

export async function resetDemoData() {
  g.__caresenseDb = undefined;
  await fs.rm(DATA_DIR, { recursive: true, force: true });
  await load();
}

function matches<T>(row: T, where?: Where<T>): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => v === undefined || (row as Record<string, unknown>)[k] === v);
}

export const demoStore: Store = {
  async list(table, where, opts?: ListOptions<never>) {
    const db = await load();
    let rows = (db[table] as unknown[]).filter((r) => matches(r, where as Where<unknown>));
    if (opts?.range) {
      const { column, from, to } = opts.range;
      rows = rows.filter((r) => {
        const v = (r as Record<string, string>)[column];
        return v != null && (!from || v >= from) && (!to || v < to);
      });
    }
    if (opts?.in) {
      const { column, values } = opts.in;
      rows = rows.filter((r) => values.includes((r as Record<string, string>)[column]));
    }
    if (opts?.orderBy) {
      const col = opts.orderBy;
      const dir = opts.ascending === false ? -1 : 1;
      rows = [...rows].sort((a, b) => {
        const x = (a as Record<string, string>)[col] ?? "";
        const y = (b as Record<string, string>)[col] ?? "";
        return x < y ? -dir : x > y ? dir : 0;
      });
    }
    if (opts?.limit) rows = rows.slice(0, opts.limit);
    return structuredClone(rows) as never;
  },

  async get(table, id) {
    const db = await load();
    const row = (db[table] as { id: string }[]).find((r) => r.id === id);
    return row ? (structuredClone(row) as never) : null;
  },

  async insert(table, row) {
    const db = await load();
    (db[table] as unknown[]).push(structuredClone(row));
    await persist(db);
    return structuredClone(row);
  },

  async update(table, id, patch) {
    const db = await load();
    const rows = db[table] as { id: string }[];
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new StoreError(`not found: ${table}`);
    rows[i] = { ...rows[i], ...structuredClone(patch), id };
    await persist(db);
    return structuredClone(rows[i]) as never;
  },

  async remove(table, id) {
    const db = await load();
    (db as Record<string, { id: string }[]>)[table] = (db[table] as { id: string }[]).filter((r) => r.id !== id);
    await persist(db);
  },

  async acceptInvite(code, profileId, displayName) {
    const db = await load();
    const link = db.family_links.find((l) => l.invite_code === code.trim().toUpperCase() && l.status === "pending");
    if (!link) return null;
    link.family_profile_id = profileId;
    link.status = "active";
    if (!link.family_name) link.family_name = displayName;
    await persist(db);
    return link.patient_id;
  },
};

function safePath(p: string) {
  const full = path.resolve(UPLOAD_DIR, p);
  if (!full.startsWith(path.resolve(UPLOAD_DIR))) throw new StoreError("bad path");
  return full;
}

export const demoFiles: FileStore = {
  async put(p, data) {
    const full = safePath(p);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data, { flag: "wx" }); // never overwrite an original
  },
  async get(p) {
    try {
      return await fs.readFile(safePath(p));
    } catch {
      return null;
    }
  },
};
