"use client";

import { useT } from "@/lib/i18n/client";
import { SEVERITY_LEVELS, SEVERITY_SCORE, type SeverityLevel } from "@/lib/types";
import { ChoiceButton } from "./ChoiceButton";

export const SEVERITY_EMOJI: Record<SeverityLevel, string> = {
  none: "😊",
  mild: "🙂",
  moderate: "😐",
  strong: "😣",
  very_strong: "🚨",
};

export function PainSeveritySelector({ value, onChange }: { value: SeverityLevel | null; onChange: (v: SeverityLevel) => void }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("pain.howBadQ")} className="flex flex-col gap-3">
      {SEVERITY_LEVELS.map((level) => (
        <ChoiceButton
          key={level}
          role="radio"
          selected={value === level}
          onClick={() => onChange(level)}
          emoji={SEVERITY_EMOJI[level]}
          sub={t("severity.scoreLabel", { score: SEVERITY_SCORE[level] })}
          tone={level === "very_strong" ? "urgent" : "brand"}
        >
          {t(`severity.${level}`)}
        </ChoiceButton>
      ))}
    </div>
  );
}
