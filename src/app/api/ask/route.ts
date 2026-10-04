import { HttpError, readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { AiUnavailableError } from "@/lib/ai/client";
import { askCareSense, type ChatTurn } from "@/lib/ai/companion";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normaliseLocale } from "@/lib/i18n";
import { firstName, notifyFamily } from "@/lib/services/notify";
import { newId, nowIso } from "@/lib/util";

export const maxDuration = 120;

export const POST = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const b = await readJson(req);
  const question = typeof b.question === "string" ? b.question.trim().slice(0, 2000) : "";
  if (!question) throw new HttpError(400, "bad_request", "question");
  const history: ChatTurn[] = Array.isArray(b.history)
    ? (b.history as ChatTurn[])
        .filter((h) => (h?.role === "user" || h?.role === "assistant") && typeof h.text === "string")
        .slice(-6)
    : [];
  let tz = typeof b.tz === "string" ? b.tz : "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    tz = "UTC";
  }

  try {
    const locale = normaliseLocale((await cookies()).get(LOCALE_COOKIE)?.value ?? patient.preferred_language);
    const result = await askCareSense({ store: ctx.store, patient, question, history, tz, locale });
    let familyNotified = false;
    if (result.type === "urgent") {
      // Record the alert (never the message text) and notify family if allowed.
      await ctx.store.insert("safety_alerts", {
        id: newId(),
        patient_id: patient.id,
        source: "chat",
        rules: result.rules,
        pain_episode_id: null,
        created_at: nowIso(),
      });
      familyNotified = await notifyFamily(ctx, patient, "emergency", { name: firstName(patient) });
    }
    return { ...result, familyNotified };
  } catch (err) {
    if (err instanceof AiUnavailableError) return { type: "unavailable" };
    throw err;
  }
});
