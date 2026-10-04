import { notFound, readJson, route } from "@/lib/api";
import { audit, requireParent } from "@/lib/access";
import { clampStr, nowIso } from "@/lib/util";
import { ALERT_KEYS, PERMISSION_KEYS, type AlertPrefs, type FamilyLink, type Permissions } from "@/lib/types";

type P = { id: string };

async function load(ctx: Parameters<typeof requireParent>[0], id: string) {
  const { patient } = await requireParent(ctx);
  const link = await ctx.store.get("family_links", id);
  if (!link || link.patient_id !== patient.id) throw notFound();
  return { patient, link };
}

// Parent changes what a family member can see / be notified about.
export const PATCH = route<P>(async (req, ctx, { id }) => {
  const { patient, link } = await load(ctx, id);
  const b = await readJson(req);
  const patch: Partial<FamilyLink> = {};
  if (b.permissions && typeof b.permissions === "object") {
    const p = { ...link.permissions } as Permissions;
    for (const k of PERMISSION_KEYS) {
      const v = (b.permissions as Record<string, unknown>)[k];
      if (typeof v === "boolean") p[k] = v;
    }
    patch.permissions = p;
  }
  if (b.alert_prefs && typeof b.alert_prefs === "object") {
    const a = { ...link.alert_prefs } as AlertPrefs;
    for (const k of ALERT_KEYS) {
      const v = (b.alert_prefs as Record<string, unknown>)[k];
      if (typeof v === "boolean") a[k] = v;
    }
    patch.alert_prefs = a;
  }
  if ("phone" in b) patch.family_phone = clampStr(b.phone, 30);
  const updated = await ctx.store.update("family_links", id, patch);
  await audit(ctx, patient.id, "permissions_changed", link.family_name);
  return { link: updated };
});

// Revoke: takes effect immediately for every request the family member makes.
export const DELETE = route<P>(async (_req, ctx, { id }) => {
  const { patient, link } = await load(ctx, id);
  const updated = await ctx.store.update("family_links", id, { status: "revoked", revoked_at: nowIso() });
  await audit(ctx, patient.id, "access_revoked", link.family_name);
  return { link: updated };
});
