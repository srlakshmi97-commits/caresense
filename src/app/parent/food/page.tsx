"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Search, Sparkles, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import { api, useApi } from "@/lib/client/api";
import { dayBounds, fromLocalInput, toLocalInput } from "@/lib/client/format";
import { foodLabel, portionLabel } from "@/lib/client/labels";
import {
  AI_FOOD_KEY,
  CUSTOM_FOOD_KEY,
  FOODS,
  GENERIC_PORTIONS,
  findFood,
  mealTypeForHour,
  searchFoods,
  sumProtein,
  type Food,
  type Portion,
} from "@/lib/nutrition/foods";
import { MEAL_TYPES, type Meal, type MealItem, type MealType } from "@/lib/types";
import type { DishEstimate } from "@/lib/ai/dish";
import { Button } from "@/components/Button";
import { ChoiceButton } from "@/components/ChoiceButton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { MealCard } from "@/components/MealCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { useToast } from "@/components/Toast";
import { VoiceInput } from "@/components/VoiceInput";

type PlateItem = MealItem;
interface Analysis {
  matches: string[];
  ai: DishEstimate | null;
  aiStatus: "ok" | "not_recognised" | "unavailable";
}

const MEAL_EMOJI: Record<MealType, string> = { breakfast: "🌅", lunch: "☀️", snack: "🍪", dinner: "🌙" };

function QuantityDialog({ food, onPick, onClose }: { food: Food | null; onPick: (q: string) => void; onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (food && !d.open) d.showModal();
    if (!food && d.open) d.close();
  }, [food]);
  const name = food ? t(`foods.${food.key}` as MessageKey) : "";
  return (
    <dialog
      ref={ref}
      aria-labelledby="qty-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="w-[min(94vw,30rem)] rounded-card border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/50"
    >
      {food && (
        <div className="flex flex-col gap-3 p-6">
          <h2 id="qty-title" className="text-2xl font-bold">
            <span aria-hidden>{food.emoji} </span>
            {t("food.howMuch", { food: name })}
          </h2>
          {food.quantities.map((q) => (
            <Button key={q.key} variant="secondary" size="lg" full onClick={() => onPick(q.key)}>
              {q.count ? `${q.count} ${name}` : t(`portions.${q.portion}` as MessageKey)}
            </Button>
          ))}
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      )}
    </dialog>
  );
}

export default function FoodPage() {
  const t = useT();
  const toast = useToast();
  const bounds = useMemo(() => dayBounds(), []);
  const { data, error, loading, reload } = useApi<{ meals: Meal[]; protein_goal_g: number | null; protein_goal_set_by: string | null }>(
    `/api/meals?from=${encodeURIComponent(bounds.from)}&to=${encodeURIComponent(bounds.to)}`,
  );
  const [mealType, setMealType] = useState<MealType>(() => mealTypeForHour(new Date().getHours()));
  const [plate, setPlate] = useState<PlateItem[]>([]);
  const [picking, setPicking] = useState<Food | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [query, setQuery] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<(Analysis & { text: string }) | null>(null);
  const [analysisError, setAnalysisError] = useState<unknown>(null);
  const [whenMode, setWhenMode] = useState<"now" | "pick">("now");
  const [whenPick, setWhenPick] = useState(() => toLocalInput(new Date()));
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [deleting, setDeleting] = useState<Meal | null>(null);

  const instant = useMemo(() => (query.trim().length >= 2 ? searchFoods(query) : []), [query]);

  const addFood = (food: Food, qKey: string) => {
    const q = food.quantities.find((x) => x.key === qKey)!;
    setPlate((p) => [...p.filter((i) => i.food_key !== food.key), { food_key: food.key, label: food.key, quantity: qKey, protein_g: q.protein_g, protein_source: "catalog" }]);
    setPicking(null);
  };
  const addAi = (dish: DishEstimate, portion: Portion, protein_g: number) => {
    setPlate((p) => [...p, { food_key: AI_FOOD_KEY, label: dish.dish_name, quantity: portion, protein_g, protein_source: "ai", ingredients: dish.ingredients }]);
    setAnalysis(null);
    setQuery("");
  };
  const addCustom = (label: string, portion: Portion) => {
    setPlate((p) => [...p, { food_key: CUSTOM_FOOD_KEY, label, quantity: portion, protein_g: null, protein_source: null }]);
    setAnalysis(null);
    setQuery("");
  };

  const find = async (text = query) => {
    const q = text.trim();
    if (!q) return;
    setAnalysing(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const res = await api<Analysis>("/api/meals/analyze", { method: "POST", json: { text: q } });
      setAnalysis({ ...res, text: q });
    } catch (e) {
      setAnalysisError(e);
    } finally {
      setAnalysing(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setSaveError(null);
    try {
      await api("/api/meals", {
        method: "POST",
        json: {
          meal_type: mealType,
          eaten_at: (whenMode === "now" ? new Date() : fromLocalInput(whenPick) ?? new Date()).toISOString(),
          items: plate,
        },
      });
      toast(t("food.savedTitle"));
      setPlate([]);
      setWhenMode("now");
      reload();
      document.getElementById("today-meals")?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      setSaveError(e);
    } finally {
      setBusy(false);
    }
  };

  const removeMeal = async () => {
    if (!deleting) return;
    try {
      await api(`/api/meals/${deleting.id}`, { method: "DELETE" });
      reload();
    } finally {
      setDeleting(null);
    }
  };

  const allItems = (data?.meals ?? []).flatMap((m) => m.items);
  const protein = sumProtein(allItems);
  const goal = data?.protein_goal_g ?? null;
  const foods = FOODS.filter((f) => f.common || showMore);

  const FoodTile = ({ f }: { f: Food }) => {
    const on = plate.some((p) => p.food_key === f.key);
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setPicking(f)}
        className={`relative flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-[3px] p-2 text-center text-base font-bold leading-tight sm:text-lg ${on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-muted"}`}
      >
        <span aria-hidden className="text-4xl leading-none">{f.emoji}</span>
        {t(`foods.${f.key}` as MessageKey)}
        {on && <Check className="absolute right-1.5 top-1.5 h-5 w-5 rounded-full bg-brand p-0.5 text-white" aria-hidden />}
      </button>
    );
  };

  return (
    <main className="page">
      <PageHeader title={t("food.title")} />

      <fieldset>
        <legend className="label text-xl">{t("food.mealQ")}</legend>
        <div role="radiogroup" className="grid grid-cols-2 gap-3">
          {MEAL_TYPES.map((m) => (
            <ChoiceButton key={m} role="radio" selected={mealType === m} onClick={() => setMealType(m)} emoji={MEAL_EMOJI[m]}>
              {t(`mealTypes.${m}`)}
            </ChoiceButton>
          ))}
        </div>
      </fieldset>

      <section aria-labelledby="pick" className="mt-6">
        <h2 id="pick" className="label text-xl">{t("food.pickFoods")}</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {foods.map((f) => (
            <FoodTile key={f.key} f={f} />
          ))}
        </div>
        <Button variant="ghost" className="mt-2" onClick={() => setShowMore(!showMore)} icon={showMore ? <ChevronUp className="h-5 w-5" aria-hidden /> : <ChevronDown className="h-5 w-5" aria-hidden />}>
          {showMore ? t("food.fewerFoods") : t("food.moreFoods", { count: FOODS.length - FOODS.filter((f) => f.common).length })}
        </Button>
      </section>

      <section aria-labelledby="search" className="card mt-4 p-4">
        <label id="search" htmlFor="food-q" className="label">{t("food.searchLabel")}</label>
        <div className="flex gap-2">
          <input
            id="food-q"
            className="field min-w-0 flex-1"
            placeholder={t("food.searchPlaceholder")}
            value={query}
            maxLength={120}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), find())}
          />
          <VoiceInput
            compact
            onText={(text) => {
              setQuery(text);
              find(text);
            }}
          />
        </div>
        {instant.length > 0 && !analysis && (
          <div className="mt-3 flex flex-wrap gap-2">
            {instant.map((f) => (
              <button key={f.key} type="button" onClick={() => setPicking(f)} className="min-h-touch rounded-2xl border-2 border-brand/40 bg-brand-soft px-3 text-lg font-semibold">
                <span aria-hidden>{f.emoji} </span>
                {t(`foods.${f.key}` as MessageKey)}
              </button>
            ))}
          </div>
        )}
        <Button className="mt-3" full loading={analysing} loadingText={t("food.looking")} disabled={!query.trim()} onClick={() => find()} icon={<Search className="h-5 w-5" aria-hidden />}>
          {t("food.find")}
        </Button>
        {analysisError ? <div className="mt-3"><ErrorState error={analysisError} /></div> : null}

        {analysis && (
          <div className="mt-4 flex flex-col gap-4" aria-live="polite">
            {analysis.ai && (
              <div className="rounded-2xl border-2 border-calm/30 bg-calm-soft p-4">
                <p className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="h-5 w-5 text-calm" aria-hidden />
                  {analysis.ai.dish_name}
                </p>
                {analysis.ai.ingredients.length > 0 && <p className="mt-1 text-lg">{t("food.aiUsuallyMade", { list: analysis.ai.ingredients.join(", ") })}</p>}
                <p className="mt-3 text-lg font-semibold">{t("food.portionQ")}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {analysis.ai.portions.map((p) => (
                    <Button key={p.portion} variant="secondary" size="lg" full onClick={() => addAi(analysis.ai!, p.portion, p.protein_g)} className="justify-between">
                      <span>{t(`portions.${p.portion}` as MessageKey)}</span>
                      <span className="text-base font-normal text-muted">~{p.protein_g} g</span>
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-base text-muted">{t("food.aiEstimateNote")}</p>
              </div>
            )}

            {analysis.matches.length > 0 && (
              <div>
                <p className="text-lg font-semibold">{t("food.matches")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.matches.map((k) => {
                    const f = findFood(k)!;
                    return (
                      <button key={k} type="button" onClick={() => setPicking(f)} className="min-h-touch rounded-2xl border-2 border-brand/40 bg-brand-soft px-3 text-lg font-semibold">
                        <span aria-hidden>{f.emoji} </span>
                        {t(`foods.${k}` as MessageKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!analysis.ai && (
              <div className="rounded-2xl border-2 border-line bg-canvas p-4">
                <p className="text-lg">{t("food.notRecognised", { dish: analysis.text })}</p>
                <p className="mt-3 text-lg font-semibold">{t("food.addAnyway", { dish: analysis.text })} — {t("food.portionQ")}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {GENERIC_PORTIONS.map((p) => (
                    <Button key={p} variant="secondary" onClick={() => addCustom(analysis.text, p)}>
                      {t(`portions.${p}` as MessageKey)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="plate" className="card mt-6 p-4">
        <h2 id="plate" className="text-xl font-bold">
          {t("food.yourPlate")} — {t(`mealTypes.${mealType}`)}
        </h2>
        {plate.length === 0 ? (
          <p className="mt-2 text-lg text-muted">{t("food.plateEmpty")}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {plate.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2 rounded-2xl bg-brand-soft py-1 pl-4 pr-1 text-lg">
                <span>
                  <strong>{foodLabel(i, t)}</strong> · {portionLabel(i, t)}
                  {i.protein_g != null && <span className="text-base text-muted"> · ~{i.protein_g} g</span>}
                </span>
                <button type="button" onClick={() => setPlate((p) => p.filter((_, j) => j !== idx))} className="flex min-h-touch min-w-touch items-center justify-center rounded-xl hover:bg-surface">
                  <X className="h-5 w-5" aria-hidden />
                  <span className="sr-only">{t("food.removeItem", { food: foodLabel(i, t) })}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {plate.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-lg font-bold">{t("food.whenQ")}</p>
            <div role="radiogroup" className="grid grid-cols-2 gap-3">
              <ChoiceButton role="radio" selected={whenMode === "now"} onClick={() => setWhenMode("now")}>
                {t("food.ateNow")}
              </ChoiceButton>
              <ChoiceButton role="radio" selected={whenMode === "pick"} onClick={() => setWhenMode("pick")}>
                {t("pain.pickTime")}
              </ChoiceButton>
            </div>
            {whenMode === "pick" && (
              <input type="datetime-local" aria-label={t("food.whenQ")} className="field" value={whenPick} max={toLocalInput(new Date())} onChange={(e) => setWhenPick(e.target.value)} />
            )}
            {saveError ? <ErrorState error={saveError} /> : null}
            <Button size="lg" full loading={busy} loadingText={t("common.saving")} onClick={save} icon={<Check className="h-6 w-6" aria-hidden />}>
              {t("food.saveMeal")}
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="protein" className="card mt-6 p-5">
        <h2 id="protein" className="text-xl font-bold">{t("food.proteinTitle")}</h2>
        <p className="mt-2 text-lg">{t("food.proteinEstimated", { grams: Math.round(protein.grams) })}</p>
        {goal ? (
          <>
            <p className="text-lg">{t("food.proteinGoal", { grams: goal })}</p>
            {data?.protein_goal_set_by && <p className="text-base text-muted">({data.protein_goal_set_by})</p>}
            <div className="mt-3" role="img" aria-label={t("food.proteinProgress", { value: Math.round(protein.grams), goal })}>
              <div className="h-4 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (protein.grams / goal) * 100)}%` }} />
              </div>
              <p className="mt-1 text-lg font-bold">{t("food.proteinProgress", { value: Math.round(protein.grams), goal })}</p>
            </div>
          </>
        ) : (
          <p className="text-lg text-muted">
            {t("food.proteinNoGoal")}{" "}
            <Link href="/parent/profile" className="font-semibold text-calm underline underline-offset-4">
              {t("food.addGoal")}
            </Link>
          </p>
        )}
        {protein.unknown > 0 && <p className="mt-2 text-base text-muted">{t("food.proteinUnknown")}</p>}
        <p className="mt-3 text-base text-muted">{t("food.proteinDisclaimer")}</p>
      </section>

      <section id="today-meals" aria-labelledby="tm" className="mt-6">
        <h2 id="tm" className="mb-3 text-2xl font-bold">{t("food.todayMeals")}</h2>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data!.meals.length === 0 ? (
          <EmptyState icon="🍽">{t("food.noMeals")}</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {data!.meals.map((m) => (
              <MealCard key={m.id} meal={m} onDelete={() => setDeleting(m)} />
            ))}
          </div>
        )}
      </section>

      <QuantityDialog food={picking} onPick={(q) => picking && addFood(picking, q)} onClose={() => setPicking(null)} />
      <ConfirmationModal open={Boolean(deleting)} title={`${t("common.remove")}?`} confirmLabel={t("common.remove")} onConfirm={removeMeal} onCancel={() => setDeleting(null)} danger>
        {deleting && `${t(`mealTypes.${deleting.meal_type}`)}: ${deleting.items.map((i) => foodLabel(i, t)).join(", ")}`}
      </ConfirmationModal>
    </main>
  );
}
