// Role-based access control (service layer).
// In Supabase mode Postgres RLS enforces the same rules again at the database.

import type { Ctx } from "./auth/session";
import { HttpError } from "./api";
import type { FamilyLink, Patient, PermissionKey, Profile } from "./types";
import { newId, nowIso } from "./util";

export function requireProfile(ctx: Ctx): Profile {
  if (!ctx.profile) throw new HttpError(401, "unauthorized");
  return ctx.profile;
}

/** The signed-in parent and their own patient record. */
export async function requireParent(ctx: Ctx): Promise<{ profile: Profile; patient: Patient }> {
  const profile = requireProfile(ctx);
  if (profile.role !== "parent") throw new HttpError(403, "forbidden");
  const [patient] = await ctx.store.list("patients", { owner_id: profile.id }, { limit: 1 });
  if (!patient) throw new HttpError(409, "needs_onboarding");
  return { profile, patient };
}

/**
 * A family member's view of a patient. Requires an ACTIVE link and, when a
 * permission is named, that the parent has switched that permission on.
 */
export async function requireFamilyAccess(
  ctx: Ctx,
  patientId: string,
  permission?: PermissionKey,
): Promise<{ profile: Profile; patient: Patient; link: FamilyLink }> {
  const profile = requireProfile(ctx);
  if (profile.role !== "family") throw new HttpError(403, "forbidden");
  const links = await ctx.store.list("family_links", { patient_id: patientId, family_profile_id: profile.id });
  const active = links.find((l) => l.status === "active");
  if (!active) {
    throw new HttpError(403, links.some((l) => l.status === "revoked") ? "revoked" : "forbidden");
  }
  if (permission && !active.permissions[permission]) throw new HttpError(403, "forbidden");
  const patient = await ctx.store.get("patients", patientId);
  if (!patient) throw new HttpError(404, "not_found");
  return { profile, patient, link: active };
}

export async function audit(ctx: Ctx, patientId: string, action: string, detail: string | null = null) {
  if (!ctx.profile) return;
  try {
    await ctx.store.insert("audit_log", {
      id: newId(),
      patient_id: patientId,
      actor_id: ctx.profile.id,
      actor_name: ctx.profile.display_name,
      action,
      detail,
      created_at: nowIso(),
    });
  } catch {
    // Auditing must never block the user's action.
    console.error("[caresense] audit write failed");
  }
}
