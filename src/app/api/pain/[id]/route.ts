import { notFound, readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { applySafety, parsePainInput } from "@/lib/services/pain";
import { nowIso } from "@/lib/util";

type P = { id: string };

async function load(ctx: Parameters<typeof requireParent>[0], id: string) {
  const { patient } = await requireParent(ctx);
  const ep = await ctx.store.get("pain_episodes", id);
  if (!ep || ep.patient_id !== patient.id) throw notFound();
  return { patient, ep };
}

export const GET = route<P>(async (_req, ctx, { id }) => {
  const { ep } = await load(ctx, id);
  return { episode: ep };
});

export const PATCH = route<P>(async (req, ctx, { id }) => {
  const { patient, ep } = await load(ctx, id);
  const input = parsePainInput(await readJson(req));
  const next = { ...ep, ...input, updated_at: nowIso() };
  const { safety, familyNotified } = await applySafety(ctx, patient, next, ep.safety_rules.length > 0);
  next.safety_rules = safety.rules;
  const saved = await ctx.store.update("pain_episodes", id, next);
  return { episode: saved, safety, familyNotified };
});

export const DELETE = route<P>(async (_req, ctx, { id }) => {
  await load(ctx, id);
  await ctx.store.remove("pain_episodes", id);
  return { ok: true };
});
