// Post-processing of model output. Pure functions so the safety-critical
// behaviour (dropping ungrounded claims, medication instructions, invented
// dates) is unit-tested without calling a model.

import { quoteIsIn } from "./quote";

export type SectionKind = "documented" | "reported" | "general" | "suggestion";

export interface AnswerSection {
  kind: SectionKind;
  text: string;
  record_id: string | null;
  record_title: string | null;
  quote: string | null;
}

export interface RawAnswer {
  insufficient_information: boolean;
  escalate: boolean;
  sections: { kind: SectionKind; text: string; record_id: string | null; quote: string | null }[];
}

export interface GroundingDoc {
  id: string;
  title: string;
  text: string;
}

// Drops any sentence that reads like a medication instruction.
const MED_INSTRUCTION = /\b(you (should|can|could|may) (stop|skip|reduce|increase|double|halve|lower|raise|change)|stop taking|increase (your|the) dose|reduce (your|the) dose|take (an )?extra|double (your|the) dose)\b/i;
const SAFE_CONTEXT = /\b(do not|don't|never|before|ask|talk to|check with|without)\b/i;

export function looksLikeMedInstruction(text: string) {
  return MED_INSTRUCTION.test(text) && !SAFE_CONTEXT.test(text);
}

/**
 * - "documented" sections must cite a real document AND quote it exactly; otherwise dropped.
 * - Medication instructions are dropped.
 * - If nothing survives (or the model said so), the answer is "insufficient information".
 */
export function groundAnswer(out: RawAnswer, docs: GroundingDoc[]) {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const sections: AnswerSection[] = [];
  for (const s of out.sections) {
    if (!s.text.trim() || looksLikeMedInstruction(s.text)) continue;
    if (s.kind === "documented") {
      const doc = s.record_id ? byId.get(s.record_id) : undefined;
      if (!doc || !quoteIsIn(s.quote, doc.text)) continue;
      sections.push({ kind: "documented", text: s.text, record_id: doc.id, record_title: doc.title, quote: s.quote });
    } else {
      sections.push({ kind: s.kind, text: s.text, record_id: null, record_title: null, quote: null });
    }
  }
  const insufficient = out.insufficient_information || sections.length === 0;
  return { sections: insufficient ? [] : sections, insufficient, escalate: out.escalate };
}

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Keeps only findings/events that quote the transcription; events also need a real date. */
export function groundExtraction<F extends { source_quote: string }, E extends { source_quote: string; date: string | null }>(
  text: string,
  findings: F[],
  events: E[],
) {
  return {
    findings: findings.filter((f) => quoteIsIn(f.source_quote, text)),
    events: events.filter((e) => isDate(e.date) && quoteIsIn(e.source_quote, text)) as (E & { date: string })[],
  };
}
