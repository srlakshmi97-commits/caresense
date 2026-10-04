// Browser-side formatting helpers (patient-local time, chosen language).

let FMT = "en-IN";
/** Called by I18nProvider so every date follows the user's language. */
export function setFormatLocale(intl: string) {
  FMT = intl;
}
export const formatLocale = () => FMT;

const pad = (n: number) => String(n).padStart(2, "0");

export function localDate(d: Date = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dayBounds(d: Date = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString(), date: localDate(start) };
}

export function daysAgoStart(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

export const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function fmtTime(iso: string | Date) {
  return new Date(iso).toLocaleTimeString(FMT, { hour: "numeric", minute: "2-digit" });
}

/** "08:00" → "8:00 am" in the user's language */
export function fmtClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return fmtTime(d);
}

export function fmtDay(iso: string | Date, opts?: { withYear?: boolean; weekday?: boolean }) {
  const d = typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString(FMT, {
    month: "long",
    day: "numeric",
    ...(opts?.withYear ? { year: "numeric" } : {}),
    ...(opts?.weekday ? { weekday: "long" } : {}),
  });
}

export function fmtShortDay(ymd: string) {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString(FMT, { month: "short", day: "numeric" });
}

export function monthNames() {
  return Array.from({ length: 12 }, (_, i) => new Date(2000, i, 15).toLocaleDateString(FMT, { month: "long" }));
}

export function fmtDuration(ms: number) {
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const fmt = (v: number, unit: "hour" | "minute") =>
    new Intl.NumberFormat(FMT, { style: "unit", unit, unitDisplay: "short" }).format(v);
  if (h === 0) return fmt(m, "minute");
  return m ? `${fmt(h, "hour")} ${fmt(m, "minute")}` : fmt(h, "hour");
}

/** For <input type="datetime-local"> */
export function toLocalInput(d: Date) {
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function greetingKey(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "home.greetingMorning" : h < 17 ? "home.greetingAfternoon" : "home.greetingEvening";
}
