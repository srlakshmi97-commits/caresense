import { NextResponse } from "next/server";
import { backendMode } from "@/lib/config";
import { DEMO_COOKIE, supabaseServerClient } from "@/lib/auth/session";

export async function POST() {
  if (backendMode() === "supabase") {
    const sb = await supabaseServerClient();
    await sb.auth.signOut();
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
