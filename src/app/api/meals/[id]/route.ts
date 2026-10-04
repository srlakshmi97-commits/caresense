import { notFound, route } from "@/lib/api";
import { requireParent } from "@/lib/access";

export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => {
  const { patient } = await requireParent(ctx);
  const meal = await ctx.store.get("meals", id);
  if (!meal || meal.patient_id !== patient.id) throw notFound();
  await ctx.store.remove("meals", id);
  return { ok: true };
});
