import { notFound, readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { parseMedicationInput } from "@/lib/services/medications";

export const PATCH = route<{ id: string }>(async (req, ctx, { id }) => {
  const { patient } = await requireParent(ctx);
  const med = await ctx.store.get("medications", id);
  if (!med || med.patient_id !== patient.id) throw notFound();
  const b = await readJson(req);
  // "No longer taking" is recorded by the user; CareSense itself never changes medicines.
  if (Object.keys(b).length === 1 && typeof b.active === "boolean") {
    return { medication: await ctx.store.update("medications", id, { active: b.active }) };
  }
  return { medication: await ctx.store.update("medications", id, parseMedicationInput(b)) };
});
