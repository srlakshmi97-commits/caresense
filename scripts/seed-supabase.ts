// Seeds a Supabase project with the FICTIONAL demo data (Lakshmi + Priya).
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DEMO_PASSWORD=... npx tsx scripts/seed-supabase.ts
//
// The service-role key bypasses RLS: use it ONLY from your own machine for
// seeding. Never put it in the app's environment or in client code.

import { createClient } from "@supabase/supabase-js";
import { buildDemoData, DEMO_FAMILY_ID, DEMO_PARENT_ID } from "../src/lib/demo/seed";
import type { FileStore } from "../src/lib/db/store";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
const bucket = process.env.SUPABASE_RECORDS_BUCKET || "medical-records";
if (!url || !key || !password || password.length < 8) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD (8+ chars).");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

async function user(email: string, role: string, name: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role, display_name: name } });
  if (error) throw new Error(`${email}: ${error.message}`);
  return data.user.id;
}

async function main() {
  const parentId = await user("lakshmi@demo.caresense.invalid", "parent", "Lakshmi");
  const familyId = await user("priya@demo.caresense.invalid", "family", "Priya");

  const files: FileStore = {
    async put(path, data, contentType) {
      const { error } = await admin.storage.from(bucket).upload(path, data, { contentType, upsert: false });
      if (error) throw error;
    },
    async get() {
      return null;
    },
  };

  const raw = await buildDemoData(files);
  // Swap the fixed demo ids for the real auth user ids.
  const data = JSON.parse(JSON.stringify(raw).replaceAll(DEMO_PARENT_ID, parentId).replaceAll(DEMO_FAMILY_ID, familyId));

  const order = [
    "profiles", "patients", "family_links", "medications", "medication_logs", "pain_episodes", "meals",
    "medical_records", "record_extractions", "timeline_events", "safety_alerts", "notifications", "audit_log",
  ];
  for (const table of order) {
    const rows = data[table] ?? [];
    if (!rows.length) continue;
    const { error } = await admin.from(table).upsert(rows);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`  ${table}: ${rows.length}`);
  }
  console.log("\nDemo accounts (fictional):\n  lakshmi@demo.caresense.invalid (parent)\n  priya@demo.caresense.invalid (family)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
