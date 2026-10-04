import { backendMode } from "@/lib/config";
import { supabaseServerClient } from "@/lib/auth/session";
import { HttpError, readJson, route } from "@/lib/api";
import { clampStr } from "@/lib/util";

// Email + password sign-in / sign-up through Supabase Auth.
// Session cookies are set server-side by @supabase/ssr (httpOnly).
export const POST = route(async (req) => {
  if (backendMode() !== "supabase") throw new HttpError(404, "not_found");
  const body = await readJson(req);
  const email = clampStr(body.email, 200);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || password.length < 8) throw new HttpError(400, "bad_request", "credentials");
  const sb = await supabaseServerClient();

  if (body.mode === "signup") {
    const role = body.role === "family" ? "family" : "parent";
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { role, display_name: clampStr(body.name, 80) ?? "" } },
    });
    if (error) throw new HttpError(400, "bad_request", "credentials");
    return { ok: true, needsConfirmation: !data.session };
  }

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new HttpError(401, "unauthorized", "credentials");
  return { ok: true };
});
