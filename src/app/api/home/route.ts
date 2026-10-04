import { route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { scheduledOn } from "@/lib/services/medications";
import { isDateOnly, isIso } from "@/lib/util";

// Parent home: today's simple status. The browser sends its local day bounds.
export const GET = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isDateOnly(date) || !isIso(from) || !isIso(to)) return { patient };

  // Remember the patient's own time zone, so family abroad see "today" and
  // "missed dose" by her clock, not theirs.
  const tz = url.searchParams.get("tz");
  if (tz && tz !== patient.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      await ctx.store.update("patients", patient.id, { timezone: tz });
    } catch {
      /* unknown zone name: ignore */
    }
  }

  const [pain, meds, logs, meals, alerts, checkIns] = await Promise.all([
    ctx.store.list("pain_episodes", { patient_id: patient.id }, { range: { column: "started_at", from, to } }),
    ctx.store.list("medications", { patient_id: patient.id, active: true }),
    ctx.store.list("medication_logs", { patient_id: patient.id, scheduled_date: date }),
    ctx.store.list("meals", { patient_id: patient.id }, { range: { column: "eaten_at", from, to } }),
    ctx.store.list("safety_alerts", { patient_id: patient.id }, { range: { column: "created_at", from, to } }),
    ctx.store.list("check_ins", { patient_id: patient.id, check_date: date }),
  ]);

  const doses = meds.filter((m) => scheduledOn(m, date)).flatMap((m) => m.times.map((time) => ({ medication: m, time })));
  const taken = doses.filter((d) => logs.some((l) => l.medication_id === d.medication.id && l.scheduled_time === d.time && l.status === "taken")).length;
  const pending = doses
    .filter((d) => !logs.some((l) => l.medication_id === d.medication.id && l.scheduled_time === d.time))
    .sort((a, b) => a.time.localeCompare(b.time));

  return {
    patient: { name: patient.name, emergency_number: patient.emergency_number },
    painCount: pain.length,
    mealsCount: meals.length,
    doses: { total: doses.length, taken },
    nextDose: pending[0] ? { name: pending[0].medication.name, time: pending[0].time } : null,
    // Check-in = answered "How are you feeling today?" (felt fine, or logged pain).
    checkedIn: checkIns.length > 0 || pain.length > 0,
    feltFine: checkIns.length > 0,
    alertToday: alerts.length > 0,
  };
});
