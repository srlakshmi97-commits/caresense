import { route } from "@/lib/api";
import { aiConfigured, backendMode } from "@/lib/config";

// Who am I? Used by the client to route between parent / family / onboarding.
export const GET = route(async (_req, ctx) => {
  const profile = ctx.profile;
  let patient = null;
  if (profile?.role === "parent") {
    [patient] = await ctx.store.list("patients", { owner_id: profile.id }, { limit: 1 });
  }
  return {
    mode: backendMode(),
    aiAvailable: aiConfigured(),
    profile: profile ? { id: profile.id, role: profile.role, display_name: profile.display_name } : null,
    patient: patient ? { id: patient.id, name: patient.name, onboarded: patient.onboarded } : null,
  };
});
