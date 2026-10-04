import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

const TONES = {
  brand: "bg-brand-soft border-brand/25 hover:border-brand",
  calm: "bg-calm-soft border-calm/25 hover:border-calm",
  warm: "bg-warn-soft border-warn/25 hover:border-warn",
  plain: "bg-surface border-line hover:border-brand",
};

/** One-tap primary action on the parent home screen. Icon + text, never icon alone. */
export function LargeActionCard({
  href,
  emoji,
  label,
  hint,
  tone = "plain",
  compact = false,
}: {
  href: string;
  emoji: ReactNode;
  label: string;
  hint?: string;
  tone?: keyof typeof TONES;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-card border-2 p-4 shadow-card transition-colors ${compact ? "min-h-[4.5rem]" : "min-h-[6rem]"} ${TONES[tone]}`}
    >
      <span aria-hidden className={`${compact ? "text-3xl" : "text-4xl"} leading-none`}>
        {emoji}
      </span>
      <span className="flex-1">
        <span className={`block font-bold uppercase tracking-wide text-ink ${compact ? "text-lg" : "text-xl"}`}>{label}</span>
        {hint && <span className="mt-0.5 block text-base text-muted">{hint}</span>}
      </span>
      <ChevronRight className="h-7 w-7 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
