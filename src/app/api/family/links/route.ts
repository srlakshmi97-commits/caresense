import { HttpError, readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { clampStr, inviteCode, newId, nowIso } from "@/lib/util";

// Parent: list family members (and recent access history), or create an invite.
export const GET = route(async (_req, ctx) => {
  const { patient } = await requireParent(ctx);
  const [links, auditLog] = await Promise.all([
    ctx.store.list("family_links", { patient_id: patient.id }, { orderBy: "created_at" }),
    ctx.store.list("audit_log", { patient_id: patient.id }, { orderBy: "created_at", ascending: false, limit: 15 }),
  ]);
  return { links, audit: auditLog };
});

export const POST = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const b = await readJson(req);
  const name = clampStr(b.name, 80);
  if (!name) throw new HttpError(400, "bad_request", "name");
  const link = await ctx.store.insert("family_links", {
    id: newId(),
    patient_id: patient.id,
    family_profile_id: null,
    family_name: name,
    family_phone: clampStr(b.phone, 30),
    relationship: clampStr(b.relationship, 60) ?? "",
    invite_code: inviteCode(),
    status: "pending",
    permissions: { symptoms: true, meals: true, medications: true, records: false, timeline: true, alerts: true },
    alert_prefs: { pain: true, medication: true, emergency: true, new_report: false },
    created_at: nowIso(),
    revoked_at: null,
  });
  return { link };
});
