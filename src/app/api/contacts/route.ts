import { route } from "@/lib/api";
import { requireParent } from "@/lib/access";

// Phone numbers the parent can call from the urgent-care screen and Contact Family.
export const GET = route(async (_req, ctx) => {
  const { patient } = await requireParent(ctx);
  const links = await ctx.store.list("family_links", { patient_id: patient.id });
  return {
    emergency_number: patient.emergency_number,
    emergency_contact: patient.emergency_contact_phone
      ? { name: patient.emergency_contact_name ?? "", phone: patient.emergency_contact_phone }
      : null,
    family: links
      .filter((l) => l.status !== "revoked" && l.family_phone)
      .map((l) => ({ name: l.family_name, relationship: l.relationship, phone: l.family_phone! })),
  };
});
