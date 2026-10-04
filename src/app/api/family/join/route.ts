import { HttpError, readJson, route } from "@/lib/api";
import { audit, requireProfile } from "@/lib/access";
import { clampStr } from "@/lib/util";

// Family member enters the parent's invite code.
export const POST = route(async (req, ctx) => {
  const profile = requireProfile(ctx);
  if (profile.role !== "family") throw new HttpError(403, "forbidden");
  const b = await readJson(req);
  const code = clampStr(b.code, 12);
  const name = clampStr(b.name, 80);
  if (name && !profile.display_name) {
    await ctx.store.update("profiles", profile.id, { display_name: name });
    profile.display_name = name;
  }
  if (!code) throw new HttpError(400, "bad_request", "code");
  const patientId = await ctx.store.acceptInvite(code, profile.id, profile.display_name);
  if (!patientId) throw new HttpError(400, "bad_request", "code");
  await audit(ctx, patientId, "family_joined");
  return { patientId };
});
