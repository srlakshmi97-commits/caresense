"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Maximize2, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { muscleLabel } from "@/lib/client/labels";
import { BACK, FRONT, MIRROR, ZONES, sideOf, type MuscleShape, type View, type Zone } from "@/lib/body/muscles";
import { BODY_REGIONS, type BodyRegion } from "@/lib/types";
import { Button } from "./Button";
import { ChoiceButton } from "./ChoiceButton";

export interface PainPlaces {
  muscles: string[];
  regions: BodyRegion[];
}

const FULL = { x: 0, y: 0, w: 200, h: 440 };
const MUSCLE_FILL = "#EFCFC4";
const MUSCLE_STROKE = "#B77A6B";

function Figure({
  view,
  zone,
  selected,
  onTap,
}: {
  view: View;
  zone: Zone | null;
  selected: string[];
  onTap: (shape: MuscleShape, id: string) => void;
}) {
  const shapes = view === "front" ? FRONT : BACK;
  const box = zone ? ZONES[zone] : FULL;
  const draw = (s: MuscleShape, mirrored: boolean) => {
    const id = `${sideOf(view, mirrored, s.centre)}.${s.key}`;
    const on = selected.includes(id);
    return (
      <path
        key={`${id}-${mirrored}`}
        d={s.d}
        transform={mirrored ? MIRROR : undefined}
        onClick={() => onTap(s, id)}
        className="cursor-pointer"
        fill={on ? "rgb(var(--brand))" : "url(#fibres)"}
        stroke={on ? "rgb(var(--brand-deep))" : MUSCLE_STROKE}
        strokeWidth={on ? (zone ? 1.6 : 2.4) : zone ? 0.9 : 1.4}
        strokeLinejoin="round"
      />
    );
  };
  return (
    <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className={`mx-auto w-auto max-w-full ${zone ? "h-[26rem]" : "h-[24rem]"}`} aria-hidden>
      <defs>
        {/* Muscle-fibre texture so the figure reads as muscles, not a cartoon */}
        <pattern id="fibres" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(70)">
          <rect width="4" height="4" fill={MUSCLE_FILL} />
          <line x1="0" y1="0" x2="0" y2="4" stroke={MUSCLE_STROKE} strokeOpacity="0.28" strokeWidth="1" />
        </pattern>
      </defs>
      {shapes.map((s) => (s.centre ? draw(s, false) : [draw(s, false), draw(s, true)]))}
    </svg>
  );
}

export function MuscleMap({ value, onChange }: { value: PainPlaces; onChange: (v: PainPlaces) => void }) {
  const t = useT();
  const [view, setView] = useState<View>("front");
  const [zone, setZone] = useState<Zone | null>(null);
  const [showList, setShowList] = useState(false);

  const toggleMuscle = (id: string) =>
    onChange({ ...value, muscles: value.muscles.includes(id) ? value.muscles.filter((m) => m !== id) : [...value.muscles, id] });
  const toggleRegion = (r: BodyRegion) =>
    onChange({ ...value, regions: value.regions.includes(r) ? value.regions.filter((x) => x !== r) : [...value.regions, r] });

  const onTap = (shape: MuscleShape, id: string) => {
    if (!zone) setZone(shape.zone); // first tap zooms in
    else toggleMuscle(id);
  };

  // Front view: the person's right is on the viewer's left.
  const leftLabel = view === "front" ? t("common.yourRight") : t("common.yourLeft");
  const rightLabel = view === "front" ? t("common.yourLeft") : t("common.yourRight");

  return (
    <div>
      <div role="group" aria-label={t("pain.whereQ")} className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-line/40 p-1">
        {(["front", "back"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`min-h-touch rounded-xl text-lg font-bold ${view === v ? "bg-surface text-ink shadow-card" : "text-muted"}`}
          >
            {v === "front" ? t("pain.front") : t("pain.backView")}
          </button>
        ))}
      </div>

      <p className="mb-2 text-lg text-muted" aria-live="polite">
        {zone ? t("pain.zoomHint") : t("pain.whereHint")}
      </p>

      <div className="card py-3">
        <div className="flex justify-between px-4 text-base font-bold text-muted" aria-hidden>
          <span className="flex items-center gap-1"><ArrowLeft className="h-4 w-4" />{leftLabel}</span>
          <span className="flex items-center gap-1">{rightLabel}<ArrowRight className="h-4 w-4" /></span>
        </div>
        <Figure view={view} zone={zone} selected={value.muscles} onTap={onTap} />
        {zone && (
          <div className="px-4">
            <Button variant="secondary" full onClick={() => setZone(null)} icon={<Maximize2 className="h-5 w-5" aria-hidden />}>
              {t("pain.wholeBody")}
            </Button>
          </div>
        )}
      </div>

      {(value.muscles.length > 0 || value.regions.length > 0) && (
        <div className="mt-4">
          <p className="text-lg font-bold">{t("pain.youChose")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {value.muscles.map((m) => (
              <li key={m}>
                <button type="button" onClick={() => toggleMuscle(m)} className="flex min-h-touch items-center gap-2 rounded-2xl border-2 border-brand bg-brand-soft px-3 text-lg font-semibold">
                  {muscleLabel(m, t)}
                  <X className="h-5 w-5" aria-hidden />
                  <span className="sr-only">{t("common.remove")}</span>
                </button>
              </li>
            ))}
            {value.regions.map((r) => (
              <li key={r}>
                <button type="button" onClick={() => toggleRegion(r)} className="flex min-h-touch items-center gap-2 rounded-2xl border-2 border-brand bg-brand-soft px-3 text-lg font-semibold">
                  {t(`regions.${r}`)}
                  <X className="h-5 w-5" aria-hidden />
                  <span className="sr-only">{t("common.remove")}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        variant="ghost"
        className="mt-3"
        aria-expanded={showList}
        onClick={() => setShowList(!showList)}
        icon={showList ? <ChevronUp className="h-5 w-5" aria-hidden /> : <ChevronDown className="h-5 w-5" aria-hidden />}
      >
        {showList ? t("pain.hideList") : t("pain.orList")}
      </Button>
      {showList && (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BODY_REGIONS.map((r) => (
            <ChoiceButton key={r} selected={value.regions.includes(r)} onClick={() => toggleRegion(r)}>
              {t(`regions.${r}`)}
            </ChoiceButton>
          ))}
        </div>
      )}
    </div>
  );
}
