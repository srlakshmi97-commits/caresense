// Builds the health timeline from structured data only:
//  • events extracted from uploaded documents (dates stated in the document)
//  • logged pain episodes (strong / flagged ones)
//  • medicines with a known start date
// Nothing is inferred; items without a real date are left out.

import type { Store } from "../db/store";
import type { BodyRegion, SeverityLevel, Symptom, TimelineType } from "../types";

export interface TimelineItem {
  id: string;
  date: string; // YYYY-MM-DD
  at: string | null; // ISO timestamp when known
  type: TimelineType;
  source: "record" | "symptom" | "medication" | "manual";
  title: string | null;
  detail: string | null;
  record_id: string | null;
  record_title: string | null;
  quote: string | null;
  pain?: { locations: BodyRegion[]; muscles: string[]; other_location: string | null; severity_level: SeverityLevel; severity_score: number; symptoms: Symptom[]; flagged: boolean };
  med?: { name: string; dosage: string };
}

export async function buildTimeline(
  store: Store,
  patientId: string,
  opts: { records: boolean; symptoms: boolean; medications: boolean; from?: string },
): Promise<TimelineItem[]> {
  const items: TimelineItem[] = [];

  if (opts.records) {
    const [events, records] = await Promise.all([
      store.list("timeline_events", { patient_id: patientId }),
      store.list("medical_records", { patient_id: patientId }),
    ]);
    const titles = new Map(records.map((r) => [r.id, r.title]));
    for (const e of events) {
      items.push({
        id: e.id,
        date: e.event_date,
        at: null,
        type: e.type,
        source: e.source === "record" ? "record" : "manual",
        title: e.title,
        detail: e.detail,
        record_id: e.source_record_id,
        record_title: e.source_record_id ? titles.get(e.source_record_id) ?? null : null,
        quote: e.source_quote,
      });
    }
  }

  if (opts.symptoms) {
    const eps = await store.list("pain_episodes", { patient_id: patientId });
    for (const ep of eps) {
      const flagged = ep.safety_rules.length > 0;
      if (ep.severity_score < 7 && !flagged) continue;
      items.push({
        id: ep.id,
        date: ep.started_at.slice(0, 10),
        at: ep.started_at,
        type: "symptom",
        source: "symptom",
        title: null,
        detail: null,
        record_id: null,
        record_title: null,
        quote: null,
        pain: { locations: ep.locations, muscles: ep.muscles ?? [], other_location: ep.other_location, severity_level: ep.severity_level, severity_score: ep.severity_score, symptoms: ep.symptoms, flagged },
      });
    }
  }

  if (opts.medications) {
    const meds = await store.list("medications", { patient_id: patientId });
    const recordMedTitles = items.filter((i) => i.type === "medication").map((i) => (i.title ?? "").toLowerCase());
    for (const m of meds) {
      if (!m.start_date) continue;
      if (recordMedTitles.some((t) => t.includes(m.name.toLowerCase()))) continue; // already documented
      items.push({
        id: m.id,
        date: m.start_date,
        at: null,
        type: "medication",
        source: "medication",
        title: null,
        detail: null,
        record_id: null,
        record_title: null,
        quote: null,
        med: { name: m.name, dosage: m.dosage },
      });
    }
  }

  return items
    .filter((i) => !opts.from || i.date >= opts.from.slice(0, 10))
    .sort((a, b) => (b.at ?? b.date).localeCompare(a.at ?? a.date));
}
