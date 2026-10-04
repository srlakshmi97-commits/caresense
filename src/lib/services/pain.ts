import type { Ctx } from "../auth/session";
import { HttpError } from "../api";
import { checkPainEpisode, type SafetyResult } from "../safety/engine";
import { t } from "../i18n";
import {
  BODY_REGIONS,
  PAIN_TRIGGERS,
  SEVERITY_LEVELS,
  SEVERITY_SCORE,
  SYMPTOMS,
  type Patient,
  type PainEpisode,
} from "../types";
import { clampStr, enumList, isIso, newId, nowIso, pickEnum } from "../util";
import { firstName, notifyFamily } from "./notify";
import { regionOfMuscleId } from "../body/muscles";

/** Validates a pain entry from the client. */
export function parsePainInput(b: Record<string, unknown>) {
  // Specific muscles are validated against the catalogue and always add their
  // coarse region, so the safety rules see e.g. "chest" for a chest muscle.
  const muscles = Array.isArray(b.muscles)
    ? [...new Set(b.muscles.filter((m): m is string => typeof m === "string" && regionOfMuscleId(m) !== null))].slice(0, 40)
    : [];
  const locations = [...new Set([...enumList(BODY_REGIONS, b.locations), ...muscles.map((m) => regionOfMuscleId(m)!)])];
  if (!locations.length) throw new HttpError(400, "bad_request", "locations");
  const level = pickEnum(SEVERITY_LEVELS, b.severity_level);
  if (!level) throw new HttpError(400, "bad_request", "severity");
  if (!isIso(b.started_at)) throw new HttpError(400, "bad_request", "started_at");
  const started = new Date(b.started_at);
  if (started.getTime() > Date.now() + 5 * 60000) throw new HttpError(400, "bad_request", "started_at");
  const ongoing = b.ongoing !== false;
  let ended_at: string | null = null;
  if (!ongoing) {
    if (!isIso(b.ended_at)) throw new HttpError(400, "bad_request", "ended_at");
    if (Date.parse(b.ended_at) < started.getTime()) throw new HttpError(400, "bad_request", "ended_at");
    ended_at = new Date(b.ended_at).toISOString();
  }
  let symptoms = enumList(SYMPTOMS, b.symptoms);
  if (symptoms.length > 1) symptoms = symptoms.filter((s) => s !== "none");
  let triggers = enumList(PAIN_TRIGGERS, b.triggers);
  if (triggers.length > 1) triggers = triggers.filter((s) => s !== "nothing");
  return {
    locations,
    muscles,
    other_location: locations.includes("other") ? clampStr(b.other_location, 120) : null,
    severity_level: level,
    severity_score: SEVERITY_SCORE[level],
    started_at: started.toISOString(),
    ongoing,
    ended_at,
    triggers,
    trigger_other: triggers.includes("other") ? clampStr(b.trigger_other, 200) : null,
    symptoms,
    notes: clampStr(b.notes, 1000),
  };
}

/** Runs the safety engine and records + notifies when a red flag is found. */
export async function applySafety(ctx: Ctx, patient: Patient, ep: PainEpisode, wasFlagged: boolean) {
  const safety: SafetyResult = checkPainEpisode(ep);
  let familyNotified = false;
  const name = firstName(patient);
  if (safety.urgent && !wasFlagged) {
    await ctx.store.insert("safety_alerts", {
      id: newId(),
      patient_id: patient.id,
      source: "pain",
      rules: safety.rules,
      pain_episode_id: ep.id,
      created_at: nowIso(),
    });
    familyNotified = await notifyFamily(ctx, patient, "emergency", { name });
  }
  if (ep.severity_level === "very_strong" && !wasFlagged) {
    // `locations` = English fallback; `regions` lets each reader see their own language.
    const where = ep.locations.map((l) => t(`regions.${l}`)).join(", ");
    const sent = await notifyFamily(ctx, patient, "pain", { name, locations: where, regions: ep.locations.join(",") });
    familyNotified ||= sent;
  }
  return { safety, familyNotified };
}
