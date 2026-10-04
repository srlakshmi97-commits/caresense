import { HttpError, readJson, route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { AI_FOOD_KEY, CUSTOM_FOOD_KEY, estimateProtein, findFood, PORTIONS, sumProtein } from "@/lib/nutrition/foods";
import { t, type MessageKey } from "@/lib/i18n";
import { clampStr, isIso, newId, nowIso, pickEnum, strList } from "@/lib/util";
import { MEAL_TYPES, type MealItem } from "@/lib/types";

export const GET = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const meals = await ctx.store.list(
    "meals",
    { patient_id: patient.id },
    {
      orderBy: "eaten_at",
      ascending: false,
      limit: 100,
      range: isIso(from) ? { column: "eaten_at", from, to: isIso(to) ? to : undefined } : undefined,
    },
  );
  return { meals, protein_goal_g: patient.protein_goal_g, protein_goal_set_by: patient.protein_goal_set_by };
});

export const POST = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const b = await readJson(req);
  const meal_type = pickEnum(MEAL_TYPES, b.meal_type);
  if (!meal_type) throw new HttpError(400, "bad_request", "meal_type");
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 20) throw new HttpError(400, "bad_request", "items");

  const items: MealItem[] = [];
  for (const raw of b.items as Record<string, unknown>[]) {
    const key = typeof raw?.food_key === "string" ? raw.food_key : "";
    const quantity = typeof raw?.quantity === "string" ? raw.quantity.slice(0, 20) : "";
    if (key === CUSTOM_FOOD_KEY || key === AI_FOOD_KEY) {
      const label = clampStr(raw.label, 80);
      if (!label || !(PORTIONS as readonly string[]).includes(quantity)) throw new HttpError(400, "bad_request", "items");
      if (key === AI_FOOD_KEY) {
        // AI estimate chosen by the user: informational, so we only bound it.
        const g = Number(raw.protein_g);
        const protein = Number.isFinite(g) && g >= 0 && g <= 80 ? Math.round(g * 10) / 10 : null;
        items.push({ food_key: key, label, quantity, protein_g: protein, protein_source: protein == null ? null : "ai", ingredients: strList(raw.ingredients, 6, 40) });
      } else {
        items.push({ food_key: key, label, quantity, protein_g: null, protein_source: null });
      }
    } else {
      const food = findFood(key);
      if (!food || !food.quantities.some((q) => q.key === quantity)) throw new HttpError(400, "bad_request", "items");
      // Catalogue protein is always computed on the server, never trusted from the client.
      items.push({ food_key: key, label: t(`foods.${key}` as MessageKey), quantity, protein_g: estimateProtein(key, quantity), protein_source: "catalog" });
    }
  }
  if (!items.length) throw new HttpError(400, "bad_request", "items");

  const eaten_at = isIso(b.eaten_at) && Date.parse(b.eaten_at) <= Date.now() + 5 * 60000 ? new Date(b.eaten_at).toISOString() : nowIso();
  const { grams, unknown } = sumProtein(items);
  const meal = await ctx.store.insert("meals", {
    id: newId(),
    patient_id: patient.id,
    meal_type,
    eaten_at,
    items,
    notes: clampStr(b.notes, 500),
    protein_est_g: unknown === items.length ? null : grams,
    created_at: nowIso(),
  });
  return { meal };
});
