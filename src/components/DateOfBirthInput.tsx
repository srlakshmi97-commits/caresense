"use client";

import { useT } from "@/lib/i18n/client";
import { monthNames } from "@/lib/client/format";

/** Three large dropdowns (day / month / year) — easier than a calendar for older users. */
export function DateOfBirthInput({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const t = useT();
  const [y, m, d] = value ? value.split("-") : ["", "", ""];
  const set = (ny: string, nm: string, nd: string) => onChange(ny && nm && nd ? `${ny}-${nm}-${nd}` : [ny, nm, nd].join("-"));
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(thisYear - 18 - i));
  const months = monthNames();
  const cls = "field appearance-auto";
  return (
    <div className="grid grid-cols-[1fr_2fr_1.4fr] gap-2" aria-invalid={invalid}>
      <label className="flex flex-col gap-1 text-base font-semibold text-muted">
        {t("onboarding.day")}
        <select className={cls} value={d} onChange={(e) => set(y, m, e.target.value)}>
          <option value="">—</option>
          {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => (
            <option key={v} value={v}>{Number(v)}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-base font-semibold text-muted">
        {t("onboarding.month")}
        <select className={cls} value={m} onChange={(e) => set(y, e.target.value, d)}>
          <option value="">—</option>
          {months.map((name, i) => (
            <option key={i} value={String(i + 1).padStart(2, "0")}>{name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-base font-semibold text-muted">
        {t("onboarding.year")}
        <select className={cls} value={y} onChange={(e) => set(e.target.value, m, d)}>
          <option value="">—</option>
          {years.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function isRealDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && dt < new Date();
}
