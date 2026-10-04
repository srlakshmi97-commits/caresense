import { HttpError, readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { isDateOnly, newId, nowIso } from "@/lib/util";

// "I feel fine today" — completes the daily check-in without logging pain.
export const POST = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const { date } = await readJson(req);
  if (!isDateOnly(date)) throw new HttpError(400, "bad_request");
  const [existing] = await ctx.store.list("check_ins", { patient_id: patient.id, check_date: date });
  if (existing) return { checkIn: existing };
  const checkIn = await ctx.store.insert("check_ins", { id: newId(), patient_id: patient.id, check_date: date, feeling: "fine", created_at: nowIso() });
  return { checkIn };
});
