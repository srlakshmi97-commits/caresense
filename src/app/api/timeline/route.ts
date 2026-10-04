import { route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { buildTimeline } from "@/lib/services/timeline";

export const GET = route(async (_req, ctx) => {
  const { patient } = await requireParent(ctx);
  const items = await buildTimeline(ctx.store, patient.id, { records: true, symptoms: true, medications: true });
  return { items };
});
