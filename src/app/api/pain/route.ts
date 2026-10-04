import { readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { applySafety, parsePainInput } from "@/lib/services/pain";
import { isIso, newId, nowIso } from "@/lib/util";
import type { PainEpisode } from "@/lib/types";

export const GET = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const episodes = await ctx.store.list(
    "pain_episodes",
    { patient_id: patient.id },
    {
      orderBy: "started_at",
      ascending: false,
      limit: 200,
      range: isIso(from) || isIso(to) ? { column: "started_at", from: isIso(from) ? from : undefined, to: isIso(to) ? to : undefined } : undefined,
    },
  );
  return { episodes };
});

export const POST = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const input = parsePainInput(await readJson(req));
  const episode: PainEpisode = {
    id: newId(),
    patient_id: patient.id,
    ...input,
    safety_rules: [],
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const { safety, familyNotified } = await applySafety(ctx, patient, episode, false);
  episode.safety_rules = safety.rules;
  const saved = await ctx.store.insert("pain_episodes", episode);
  return { episode: saved, safety, familyNotified };
});
