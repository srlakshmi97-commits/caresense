import { randomUUID, randomInt } from "crypto";

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
export function inviteCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

export const isDateOnly = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const isIso = (s: unknown): s is string => typeof s === "string" && !Number.isNaN(Date.parse(s));

export function clampStr(s: unknown, max = 500): string | null {
  if (typeof s !== "string") return null;
  const v = s.trim().slice(0, max);
  return v ? v : null;
}

export function strList(v: unknown, max = 30, itemMax = 120): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, itemMax))
    .filter(Boolean)
    .slice(0, max);
}

export function pickEnum<T extends string>(allowed: readonly T[], v: unknown): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

export function enumList<T extends string>(allowed: readonly T[], v: unknown): T[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is T => (allowed as readonly string[]).includes(x as string)))];
}
