import { NextResponse } from "next/server";
import { backendMode } from "@/lib/config";
import { createDemoProfile, DEMO_COOKIE, encodeDemoSession } from "@/lib/auth/session";
import { DEMO_FAMILY_ID, DEMO_PARENT_ID } from "@/lib/demo/seed";
import { demoStore } from "@/lib/db/demo-store";
import { HttpError, readJson, route } from "@/lib/api";

// Demo sign-in (only when Supabase is not configured).
export const POST = route(async (req) => {
  if (backendMode() !== "demo") throw new HttpError(404, "not_found");
  const { account } = await readJson(req);
  let profileId: string;
  switch (account) {
    case "lakshmi":
      profileId = DEMO_PARENT_ID;
      break;
    case "priya":
      profileId = DEMO_FAMILY_ID;
      break;
    case "new-parent":
      profileId = (await createDemoProfile("parent")).id;
      break;
    case "new-family":
      profileId = (await createDemoProfile("family")).id;
      break;
    default:
      throw new HttpError(400, "bad_request");
  }
  const profile = await demoStore.get("profiles", profileId);
  if (!profile) throw new HttpError(500, "generic");
  const res = NextResponse.json({ ok: true, role: profile.role });
  res.cookies.set(DEMO_COOKIE, encodeDemoSession(profileId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
});
