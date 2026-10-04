import { HttpError, route } from "@/lib/api";
import { requireProfile } from "@/lib/access";

// Family member: whose information has been shared with me?
export const GET = route(async (_req, ctx) => {
  const profile = requireProfile(ctx);
  if (profile.role !== "family") throw new HttpError(403, "forbidden");
  const links = await ctx.store.list("family_links", { family_profile_id: profile.id });
  const out = [];
  for (const l of links) {
    if (l.status === "active") {
      const patient = await ctx.store.get("patients", l.patient_id);
      if (patient) out.push({ patientId: l.patient_id, name: patient.name, relationship: l.relationship, status: l.status });
    } else if (l.status === "revoked") {
      // Revoked: the patient's name is no longer readable; show only that access ended.
      out.push({ patientId: l.patient_id, name: null, relationship: l.relationship, status: l.status });
    }
  }
  return { patients: out, name: profile.display_name };
});
