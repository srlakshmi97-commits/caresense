// Request context: who is signed in, and which store to use.
// Supabase mode → Supabase Auth session cookies; demo mode → signed cookie.

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertDemoAllowed, backendMode, sessionSecret } from "../config";
import { demoFiles, demoStore } from "../db/demo-store";
import { supabaseFiles, supabaseStore } from "../db/supabase-store";
import type { FileStore, Store } from "../db/store";
import type { Profile, Role } from "../types";
import { newId, nowIso } from "../util";

export const DEMO_COOKIE = "cs_session";

export interface Ctx {
  store: Store;
  files: FileStore;
  profile: Profile | null;
  supabase: SupabaseClient | null;
}

export async function supabaseServerClient(): Promise<SupabaseClient> {
  const jar = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Called from a context where cookies are read-only; middleware refreshes them.
        }
      },
    },
  });
}

// ── demo cookie signing ──────────────────────────────────────────────
function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}
export function encodeDemoSession(profileId: string) {
  const payload = Buffer.from(JSON.stringify({ uid: profileId, iat: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function decodeDemoSession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { uid, iat } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof uid !== "string" || Date.now() - iat > 1000 * 60 * 60 * 24 * 14) return null;
    return uid;
  } catch {
    return null;
  }
}

export async function getCtx(): Promise<Ctx> {
  if (backendMode() === "supabase") {
    const sb = await supabaseServerClient();
    const store = supabaseStore(sb);
    const files = supabaseFiles(sb);
    const { data } = await sb.auth.getUser();
    const user = data.user;
    if (!user) return { store, files, profile: null, supabase: sb };
    let profile = await store.get("profiles", user.id);
    if (!profile) {
      // First request after sign-up: create the profile from sign-up metadata.
      const meta = user.user_metadata ?? {};
      const role: Role = meta.role === "family" ? "family" : "parent";
      profile = await store.insert("profiles", {
        id: user.id,
        role,
        display_name: String(meta.display_name || user.email?.split("@")[0] || ""),
        phone: null,
        created_at: nowIso(),
      });
    }
    return { store, files, profile, supabase: sb };
  }

  assertDemoAllowed();
  const jar = await cookies();
  const uid = decodeDemoSession(jar.get(DEMO_COOKIE)?.value);
  const profile = uid ? await demoStore.get("profiles", uid) : null;
  return { store: demoStore, files: demoFiles, profile, supabase: null };
}

export async function createDemoProfile(role: Role): Promise<Profile> {
  return demoStore.insert("profiles", {
    id: newId(),
    role,
    display_name: "",
    phone: null,
    created_at: nowIso(),
  });
}
