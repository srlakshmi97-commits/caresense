"use client";

import { Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { fmtTime, formatLocale } from "@/lib/client/format";
import { foodLabel, portionLabel } from "@/lib/client/labels";
import { findFood } from "@/lib/nutrition/foods";
import type { Meal } from "@/lib/types";

export function MealCard({ meal, onDelete, showDate }: { meal: Meal; onDelete?: () => void; showDate?: boolean }) {
  const t = useT();
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold">{t(`mealTypes.${meal.meal_type}`)}</p>
          <p className="text-base text-muted">
            {showDate && `${new Date(meal.eaten_at).toLocaleDateString(formatLocale(), { month: "short", day: "numeric" })} · `}
            {fmtTime(meal.eaten_at)}
          </p>
        </div>
        {onDelete && (
          <button type="button" onClick={onDelete} className="flex min-h-touch min-w-touch items-center justify-center gap-1 rounded-xl px-2 text-base font-semibold text-muted hover:bg-urgent-soft hover:text-urgent">
            <Trash2 className="h-5 w-5" aria-hidden />
            {t("common.remove")}
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-1 text-lg">
        {meal.items.map((i, idx) => (
          <li key={idx}>
            <span className="flex flex-wrap items-center gap-x-2">
              <span aria-hidden>{findFood(i.food_key)?.emoji ?? "🍽"}</span>
              <span className="font-semibold">{foodLabel(i, t)}</span>
              <span className="text-muted">· {portionLabel(i, t)}</span>
            </span>
            {i.ingredients && i.ingredients.length > 0 && <span className="ml-8 block text-base text-muted">{t("food.aiUsuallyMade", { list: i.ingredients.join(", ") })}</span>}
          </li>
        ))}
      </ul>
      {meal.protein_est_g != null && (
        <p className="mt-2 text-base text-muted">
          {t("food.proteinItem", {
            grams: meal.protein_est_g,
            source: meal.items.some((i) => i.protein_source === "ai") ? t("food.sourceAi") : t("food.sourceCatalog"),
          })}
        </p>
      )}
    </div>
  );
}
