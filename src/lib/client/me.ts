"use client";

export interface Me {
  mode: "demo" | "supabase";
  aiAvailable: boolean;
  profile: { id: string; role: "parent" | "family"; display_name: string } | null;
  patient: { id: string; name: string; onboarded: boolean } | null;
}

/** Where a signed-in user belongs. */
export function homeFor(me: Me): string | null {
  if (!me.profile) return null;
  if (me.profile.role === "family") return "/family";
  return me.patient?.onboarded ? "/parent" : "/onboarding";
}
