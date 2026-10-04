import { cookies } from "next/headers";
import { HttpError, readJson, route } from "@/lib/api";
import { requireProfile } from "@/lib/access";
import { LOCALE_COOKIE, normaliseLocale } from "@/lib/i18n";
import { clampStr, inviteCode, isDateOnly, newId, nowIso, pickEnum, strList } from "@/lib/util";
import { ageFrom, SEXES, type FamilyLink, type Patient } from "@/lib/types";

export const POST = route(async (req, ctx) => {
  const profile = requireProfile(ctx);
  if (profile.role !== "parent") throw new HttpError(403, "forbidden");
  const [existing] = await ctx.store.list("patients", { owner_id: profile.id }, { limit: 1 });
  if (existing?.onboarded) throw new HttpError(400, "bad_request");

  const b = await readJson(req);
  const name = clampStr(b.name, 80);
  if (!name) throw new HttpError(400, "bad_request", "name");
  const dob = isDateOnly(b.date_of_birth) && ageFrom(b.date_of_birth) !== null ? b.date_of_birth : null;
  const language = normaliseLocale(b.language ?? (await cookies()).get(LOCALE_COOKIE)?.value);

  const patient: Patient = {
    id: existing?.id ?? newId(),
    owner_id: profile.id,
    name,
    date_of_birth: dob,
    sex: pickEnum(SEXES, b.sex),
    preferred_language: language,
    emergency_contact_name: clampStr(b.emergency_contact_name, 80),
    emergency_contact_phone: clampStr(b.emergency_contact_phone, 30),
    emergency_number: clampStr(b.emergency_number, 10) ?? "112",
    conditions: strList(b.conditions),
    past_history: strList(b.past_history, 40, 200),
    allergies: strList(b.allergies),
    protein_goal_g: null,
    protein_goal_set_by: null,
    onboarded: true,
    created_at: nowIso(),
  };
  if (existing) await ctx.store.update("patients", existing.id, patient);
  else await ctx.store.insert("patients", patient);
  await ctx.store.update("profiles", profile.id, { display_name: name.split(" ")[0] });

  for (const medName of strList(b.medications, 20, 80)) {
    await ctx.store.insert("medications", {
      id: newId(),
      patient_id: patient.id,
      name: medName,
      purpose: null,
      dosage: "",
      frequency: "",
      times: [],
      instructions: null,
      prescriber: null,
      start_date: null,
      end_date: null,
      important: false,
      active: true,
      created_at: nowIso(),
    });
  }

  let invite: string | null = null;
  const share = b.share as Record<string, unknown> | null | undefined;
  if (share && clampStr(share.name, 80)) {
    const link: FamilyLink = {
      id: newId(),
      patient_id: patient.id,
      family_profile_id: null,
      family_name: clampStr(share.name, 80)!,
      family_phone: clampStr(share.phone, 30),
      relationship: clampStr(share.relationship, 60) ?? "",
      invite_code: inviteCode(),
      status: "pending",
      // Safe defaults: share the essentials; the parent can change any of these.
      permissions: { symptoms: true, meals: true, medications: true, records: false, timeline: true, alerts: true },
      alert_prefs: { pain: true, medication: true, emergency: true, new_report: false },
      created_at: nowIso(),
      revoked_at: null,
    };
    await ctx.store.insert("family_links", link);
    invite = link.invite_code;
  }
  return { ok: true, invite_code: invite };
});
