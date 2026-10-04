import { cookies } from "next/headers";
import { HttpError, readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { AiUnavailableError } from "@/lib/ai/client";
import { analyseDish } from "@/lib/ai/dish";
import { LOCALE_COOKIE, LOCALES, normaliseLocale } from "@/lib/i18n";
import { searchFoods } from "@/lib/nutrition/foods";
import { clampStr } from "@/lib/util";

export const maxDuration = 60;

// "What is this dish?" — catalogue matches (instant, any language) plus an
// AI estimate of ingredients and protein when AI is available.
export const POST = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const b = await readJson(req);
  const text = clampStr(b.text, 200);
  if (!text) throw new HttpError(400, "bad_request", "text");
  const locale = normaliseLocale((await cookies()).get(LOCALE_COOKIE)?.value ?? patient.preferred_language);

  const matches = searchFoods(text).map((f) => f.key);
  let ai: Awaited<ReturnType<typeof analyseDish>> = null;
  let aiStatus: "ok" | "not_recognised" | "unavailable" = "unavailable";
  try {
    ai = await analyseDish(text, LOCALES[locale].english);
    aiStatus = ai ? "ok" : "not_recognised";
  } catch (err) {
    if (!(err instanceof AiUnavailableError)) throw err;
  }
  return { matches, ai, aiStatus };
});
