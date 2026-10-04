import { HttpError, notFound, readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { firstName, notifyFamily } from "@/lib/services/notify";
import { isDateOnly, isTime, newId, nowIso, pickEnum } from "@/lib/util";
import { MED_STATUSES } from "@/lib/types";

// Mark a scheduled dose as taken / skipped / not sure (one row per dose).
export const POST = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const b = await readJson(req);
  const status = pickEnum(MED_STATUSES, b.status);
  if (!status || !isDateOnly(b.date) || !isTime(b.time) || typeof b.medication_id !== "string") {
    throw new HttpError(400, "bad_request");
  }
  const med = await ctx.store.get("medications", b.medication_id);
  if (!med || med.patient_id !== patient.id) throw notFound();

  const [existing] = await ctx.store.list("medication_logs", {
    patient_id: patient.id,
    medication_id: med.id,
    scheduled_date: b.date,
    scheduled_time: b.time,
  });
  const log = existing
    ? await ctx.store.update("medication_logs", existing.id, { status, logged_at: nowIso() })
    : await ctx.store.insert("medication_logs", {
        id: newId(),
        patient_id: patient.id,
        medication_id: med.id,
        scheduled_date: b.date,
        scheduled_time: b.time,
        status,
        logged_at: nowIso(),
      });

  if (status === "skipped" && med.important && existing?.status !== "skipped") {
    await notifyFamily(ctx, patient, "medication", { name: firstName(patient), medicine: med.name });
  }
  return { log };
});
