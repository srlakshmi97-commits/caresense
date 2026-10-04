import { HttpError, readJson, route } from "@/lib/api";
import { requireFamilyAccess } from "@/lib/access";

// Family member marks a notification as read.
export const PATCH = route(async (req, ctx) => {
  const b = await readJson(req);
  if (typeof b.id !== "string") throw new HttpError(400, "bad_request");
  const n = await ctx.store.get("notifications", b.id);
  if (!n) throw new HttpError(404, "not_found");
  const { link } = await requireFamilyAccess(ctx, n.patient_id);
  if (n.family_link_id !== link.id) throw new HttpError(404, "not_found");
  await ctx.store.update("notifications", n.id, { read: true });
  return { ok: true };
});
