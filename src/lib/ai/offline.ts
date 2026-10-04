// Deterministic answers for simple factual questions. These never call an
// LLM, so they work when AI is unavailable and cannot hallucinate.
// `question` is English (the original, or its translation); answers are
// written in the user's language.

import { intlLocale, tFor, type MessageKey } from "../i18n";
import type { Medication, PainEpisode } from "../types";
import type { AnswerSection } from "./grounding";

interface Ctx {
  meds: Medication[];
  pain: PainEpisode[];
}

const section = (kind: AnswerSection["kind"], text: string): AnswerSection => ({ kind, text, record_id: null, record_title: null, quote: null });

function when(iso: string, tz: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(intlLocale(locale), { timeZone: tz, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return new Date(iso).toDateString();
  }
}

export function offlineAnswer(question: string, ctx: Ctx, tz: string, locale: string): AnswerSection[] | null {
  const t = tFor(locale);
  const q = question.toLowerCase();

  if (/(what|which|list|my)\b.*\b(medicines?|medications?|tablets?|pills?)\b/.test(q) && /(taking|take|on|list|have)\b/.test(q) && !/\b(for|why|side|effect|mean)\b/.test(q)) {
    if (!ctx.meds.length) return [section("reported", t("ask.medsEmpty"))];
    const list = ctx.meds
      .map((m) => t("ask.medsItem", { name: m.name, dosage: m.dosage, times: m.times.join(", ") || "—" }))
      .join("; ");
    return [section("reported", t("ask.medsList", { count: ctx.meds.length, list })), section("suggestion", t("ask.medsShowDoctor"))];
  }

  if (/\b(last|latest|recent|most recent)\b/.test(q) && /\bpain\b/.test(q) && /\b(when|what|episode|time)\b/.test(q)) {
    const last = [...ctx.pain].sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
    if (!last) return [section("reported", t("ask.noPainLogged"))];
    const where = last.locations.map((l) => t(`regions.${l}` as MessageKey)).join(" + ");
    const parts = [t("ask.lastPain", { when: when(last.started_at, tz, locale), where, score: last.severity_score })];
    if (last.ended_at) {
      const mins = Math.max(1, Math.round((Date.parse(last.ended_at) - Date.parse(last.started_at)) / 60000));
      parts.push(t("ask.lastPainLasted", { duration: new Intl.NumberFormat(intlLocale(locale), { style: "unit", unit: "minute" }).format(mins) }));
    } else parts.push(t("ask.lastPainOngoing"));
    const other = last.symptoms.filter((s) => s !== "none").map((s) => t(`symptoms.${s}` as MessageKey));
    if (other.length) parts.push(t("ask.lastPainAlso", { list: other.join(", ") }));
    return [section("reported", parts.join(" "))];
  }

  return null;
}
