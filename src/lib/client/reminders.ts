// Pure reminder logic (which doses are due, when to nudge again).
// Kept free of browser APIs so it is unit-tested.

import type { Medication, MedicationLog } from "../types";

export interface DueDose {
  medication: Medication;
  time: string; // "HH:MM"
  minutesLate: number;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Doses whose time has arrived today and that have not been marked at all. */
export function dueDoses(meds: Medication[], logs: MedicationLog[], date: string, nowHHMM: string): DueDose[] {
  const now = toMin(nowHHMM);
  const out: DueDose[] = [];
  for (const m of meds) {
    if (!m.active || !m.times.length) continue;
    if (m.start_date && m.start_date > date) continue;
    if (m.end_date && m.end_date < date) continue;
    for (const time of m.times) {
      const late = now - toMin(time);
      if (late < 0) continue;
      if (logs.some((l) => l.medication_id === m.id && l.scheduled_date === date && l.scheduled_time === time)) continue;
      out.push({ medication: m, time, minutesLate: late });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export interface NudgeState {
  /** how many notifications were shown for this dose */
  count: number;
  /** when the last one was shown (ms) */
  last: number;
}

export const MAX_NUDGES = 2;
export const NUDGE_GAP_MIN = 30;
/** Don't start notifying for doses that are already very late (e.g. app opened at night). */
export const NOTIFY_WINDOW_MIN = 180;

/** Should a phone notification be shown for this dose right now? */
export function shouldNotify(dose: DueDose, state: NudgeState | undefined, nowMs: number): boolean {
  if (dose.minutesLate > NOTIFY_WINDOW_MIN) return false;
  if (!state) return true;
  if (state.count >= MAX_NUDGES) return false;
  return nowMs - state.last >= NUDGE_GAP_MIN * 60000;
}
