"use client";

import { useT } from "@/lib/i18n/client";

/** Large on/off switch with a visible "On/Off" text state (not colour alone). */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const t = useT();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-[3.5rem] w-full items-center justify-between gap-4 rounded-2xl px-2 py-2 text-left text-lg hover:bg-canvas disabled:opacity-60"
    >
      <span className="flex-1">{label}</span>
      <span className="flex items-center gap-2">
        <span className="w-9 text-right text-base font-bold text-muted">{checked ? t("common.on") : t("common.off")}</span>
        <span className={`relative h-9 w-16 rounded-full transition-colors ${checked ? "bg-brand" : "bg-line"}`}>
          <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${checked ? "left-8" : "left-1"}`} />
        </span>
      </span>
    </button>
  );
}
