"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Large toggle/choice button. Selection is shown with a check mark, a
 * thicker border AND colour — never colour alone.
 */
export function ChoiceButton({
  selected,
  onClick,
  children,
  emoji,
  sub,
  role = "checkbox",
  tone = "brand",
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  emoji?: ReactNode;
  sub?: string;
  role?: "checkbox" | "radio";
  tone?: "brand" | "urgent";
  className?: string;
}) {
  const on = tone === "urgent" ? "border-urgent bg-urgent-soft" : "border-brand bg-brand-soft";
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`relative flex min-h-[4rem] w-full items-center gap-3 rounded-2xl border-[3px] px-4 py-3 text-left text-lg font-semibold transition-colors ${
        selected ? on : "border-line bg-surface hover:border-muted"
      } ${className}`}
    >
      {emoji && (
        <span aria-hidden className="text-3xl leading-none">
          {emoji}
        </span>
      )}
      <span className="flex-1">
        <span className="block">{children}</span>
        {sub && <span className="block text-base font-normal text-muted">{sub}</span>}
      </span>
      <span
        aria-hidden
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? (tone === "urgent" ? "border-urgent bg-urgent text-white" : "border-brand bg-brand text-white") : "border-line"
        }`}
      >
        {selected && <Check className="h-5 w-5" strokeWidth={3} />}
      </span>
    </button>
  );
}
