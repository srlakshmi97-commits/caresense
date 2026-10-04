import { readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { parseMedicationInput } from "@/lib/services/medications";
import { isDateOnly, newId, nowIso } from "@/lib/util";

export const GET = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const date = new URL(req.url).searchParams.get("date");
  const [medications, logs] = await Promise.all([
    ctx.store.list("medications", { patient_id: patient.id }, { orderBy: "created_at" }),
    isDateOnly(date) ? ctx.store.list("medication_logs", { patient_id: patient.id, scheduled_date: date }) : Promise.resolve([]),
  ]);
  return { medications, logs };
});

export const POST = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const input = parseMedicationInput(await readJson(req));
  const medication = await ctx.store.insert("medications", {
    id: newId(),
    patient_id: patient.id,
    ...input,
    active: true,
    created_at: nowIso(),
  });
  return { medication };
});
