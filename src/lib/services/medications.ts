import { HttpError } from "../api";
import type { Medication } from "../types";
import { clampStr, isDateOnly, isTime } from "../util";

export function parseMedicationInput(b: Record<string, unknown>): Omit<Medication, "id" | "patient_id" | "created_at" | "active"> {
  const name = clampStr(b.name, 80);
  if (!name) throw new HttpError(400, "bad_request", "name");
  const times = Array.isArray(b.times) ? [...new Set(b.times.filter(isTime))].sort() : [];
  return {
    name,
    purpose: clampStr(b.purpose, 80),
    dosage: clampStr(b.dosage, 80) ?? "",
    frequency: clampStr(b.frequency, 80) ?? "",
    times: times.slice(0, 8),
    instructions: clampStr(b.instructions, 200),
    prescriber: clampStr(b.prescriber, 80),
    start_date: isDateOnly(b.start_date) ? b.start_date : null,
    end_date: isDateOnly(b.end_date) ? b.end_date : null,
    important: b.important === true,
  };
}

/** Is this medicine scheduled on a given patient-local date? */
export function scheduledOn(m: Medication, date: string) {
  return m.active && m.times.length > 0 && (!m.start_date || m.start_date <= date) && (!m.end_date || m.end_date >= date);
}
