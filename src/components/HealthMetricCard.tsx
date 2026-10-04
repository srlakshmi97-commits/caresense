import { EyeOff } from "lucide-react";

const TONES = {
  plain: "border-line bg-surface",
  attention: "border-urgent/40 bg-urgent-soft",
  good: "border-ok/30 bg-ok-soft",
};

/** Headline number for the family overview. `value === null` → section not shared. */
export function HealthMetricCard({
  emoji,
  label,
  value,
  sub,
  tone = "plain",
  notSharedLabel,
}: {
  emoji: string;
  label: string;
  value: string | null;
  sub?: string;
  tone?: keyof typeof TONES;
  notSharedLabel: string;
}) {
  return (
    <div className={`rounded-card border-2 p-4 shadow-card ${value === null ? TONES.plain : TONES[tone]}`}>
      <p className="flex items-center gap-2 text-base font-semibold text-muted">
        <span aria-hidden className="text-2xl">
          {emoji}
        </span>
        {label}
      </p>
      {value === null ? (
        <p className="mt-2 flex items-center gap-2 text-lg text-muted">
          <EyeOff className="h-5 w-5" aria-hidden />
          {notSharedLabel}
        </p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
          {sub && <p className="text-base text-muted">{sub}</p>}
        </>
      )}
    </div>
  );
}
