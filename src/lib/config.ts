// Server-side configuration. Nothing here is sent to the browser.

export type BackendMode = "supabase" | "demo";

export function backendMode(): BackendMode {
  return process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? "supabase" : "demo";
}

export function assertDemoAllowed() {
  if (
    backendMode() === "demo" &&
    process.env.NODE_ENV === "production" &&
    process.env.DEMO_MODE_ALLOWED_IN_PRODUCTION !== "true"
  ) {
    throw new Error(
      "CareSense is running in production without Supabase configured. Set SUPABASE_URL/SUPABASE_ANON_KEY, " +
        "or set DEMO_MODE_ALLOWED_IN_PRODUCTION=true for a fictional-data demo.",
    );
  }
}

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16 && s !== "change-me-to-a-long-random-string") return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set to a long random value in production.");
  }
  return "caresense-local-development-secret";
}

export const RECORDS_BUCKET = process.env.SUPABASE_RECORDS_BUCKET || "medical-records";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];

export function aiModel(): string {
  return process.env.CARESENSE_AI_MODEL || "claude-opus-5";
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
