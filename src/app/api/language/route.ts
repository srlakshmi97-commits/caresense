import { NextResponse } from "next/server";
import { getCtx } from "@/lib/auth/session";
import { LOCALE_COOKIE, LOCALES } from "@/lib/i18n";
import { readJson } from "@/lib/api";

// Sets the UI language (cookie, works before sign-in). For a signed-in
// parent it is also saved as their preferred language (used by the AI).
export async function POST(req: Request) {
  let locale: unknown;
  try {
    ({ locale } = await readJson(req));
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof locale !== "string" || !(locale in LOCALES)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const ctx = await getCtx();
    if (ctx.profile?.role === "parent") {
      const [patient] = await ctx.store.list("patients", { owner_id: ctx.profile.id }, { limit: 1 });
      if (patient) await ctx.store.update("patients", patient.id, { preferred_language: locale });
    }
  } catch {
    // Saving the preference is best-effort; the cookie still applies.
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
