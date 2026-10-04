"use client";

import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import { ChoiceButton } from "./ChoiceButton";

/**
 * Multi-select of large buttons. `exclusive` (e.g. "none" / "nothing")
 * clears the others when chosen, and is cleared when another is chosen.
 */
export function SymptomSelector<T extends string>({
  options,
  value,
  onChange,
  labelPrefix,
  exclusive,
  label,
}: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  labelPrefix: "symptoms" | "triggers";
  exclusive?: T;
  label: string;
}) {
  const t = useT();
  const toggle = (o: T) => {
    if (value.includes(o)) return onChange(value.filter((x) => x !== o));
    if (o === exclusive) return onChange([o]);
    onChange([...value.filter((x) => x !== exclusive), o]);
  };
  return (
    <div role="group" aria-label={label} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((o) => (
        <ChoiceButton key={o} selected={value.includes(o)} onClick={() => toggle(o)}>
          {t(`${labelPrefix}.${o}` as MessageKey)}
        </ChoiceButton>
      ))}
    </div>
  );
}
