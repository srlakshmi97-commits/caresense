// Turns stored keys into words in the reader's language.

import type { MessageKey, Vars } from "../i18n";
import { findFood } from "../nutrition/foods";
import type { MealItem, PainEpisode } from "../types";

type T = (key: MessageKey, vars?: Vars) => string;

export function foodLabel(item: Pick<MealItem, "food_key" | "label">, t: T) {
  return findFood(item.food_key) ? t(`foods.${item.food_key}` as MessageKey) : item.label;
}

export function portionLabel(item: Pick<MealItem, "food_key" | "quantity" | "quantity_label">, t: T) {
  const q = findFood(item.food_key)?.quantities.find((x) => x.key === item.quantity);
  if (q?.count) return `${q.count}`;
  if (q?.portion) return t(`portions.${q.portion}` as MessageKey);
  if (item.quantity_label) return item.quantity_label;
  const known = t(`portions.${item.quantity}` as MessageKey);
  return known.startsWith("portions.") ? item.quantity : known;
}

export function muscleLabel(id: string, t: T) {
  const [side, key] = id.split(".");
  const muscle = t(`muscles.${key}` as MessageKey);
  if (side === "c" || !side) return muscle;
  return t("sides.withMuscle", { side: t(`sides.${side}` as MessageKey), muscle });
}

/** Where the pain was, preferring the specific muscles when recorded. */
export function painWhere(ep: Pick<PainEpisode, "locations" | "muscles" | "other_location">, t: T) {
  const parts = ep.muscles?.length ? ep.muscles.map((m) => muscleLabel(m, t)) : ep.locations.filter((l) => l !== "other").map((l) => t(`regions.${l}` as MessageKey));
  if (ep.locations.includes("other")) parts.push(ep.other_location || t("regions.other"));
  return parts.join(" + ");
}
