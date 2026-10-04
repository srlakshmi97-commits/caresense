"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { api } from "@/lib/client/api";
import { fmtClock } from "@/lib/client/format";
import type { Medication } from "@/lib/types";
import { Button } from "./Button";
import { ErrorState, InlineError } from "./States";

export function MedicationForm({ med, onSaved, onCancel }: { med?: Medication; onSaved: (m: Medication) => void; onCancel: () => void }) {
  const t = useT();
  const [f, setF] = useState({
    name: med?.name ?? "",
    purpose: med?.purpose ?? "",
    dosage: med?.dosage ?? "",
    frequency: med?.frequency ?? "",
    instructions: med?.instructions ?? "",
    prescriber: med?.prescriber ?? "",
    start_date: med?.start_date ?? "",
    end_date: med?.end_date ?? "",
    important: med?.important ?? false,
  });
  const [times, setTimes] = useState<string[]>(med?.times ?? []);
  const [newTime, setNewTime] = useState("08:00");
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const save = async () => {
    if (!f.name.trim()) return setProblem(t("meds.nameRequired"));
    if (times.length === 0) return setProblem(t("meds.timeRequired"));
    setProblem(null);
    setBusy(true);
    setError(null);
    try {
      const body = { ...f, times, start_date: f.start_date || null, end_date: f.end_date || null };
      const { medication } = await api<{ medication: Medication }>(med ? `/api/medications/${med.id}` : "/api/medications", {
        method: med ? "PATCH" : "POST",
        json: body,
      });
      onSaved(medication);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const field = (k: "name" | "purpose" | "dosage" | "frequency" | "instructions" | "prescriber", label: string) => (
    <div>
      <label htmlFor={`m-${k}`} className="label">
        {label}
      </label>
      <input id={`m-${k}`} className="field" value={f[k]} maxLength={k === "instructions" ? 200 : 80} onChange={set(k)} />
    </div>
  );

  return (
    <div className="card flex flex-col gap-4 p-5">
      <h2 className="text-2xl font-bold">{med ? t("meds.editTitle") : t("meds.add")}</h2>
      {field("name", t("meds.name"))}
      {field("purpose", t("meds.purpose"))}
      {field("dosage", t("meds.dosage"))}
      {field("frequency", t("meds.frequency"))}
      <fieldset>
        <legend className="label">{t("meds.times")}</legend>
        {times.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {times.map((tm) => (
              <li key={tm} className="flex items-center gap-1 rounded-2xl border-2 border-brand/30 bg-brand-soft py-1 pl-4 pr-1 text-lg font-bold">
                {fmtClock(tm)}
                <button type="button" onClick={() => setTimes(times.filter((x) => x !== tm))} className="flex min-h-touch min-w-touch items-center justify-center rounded-xl hover:bg-surface">
                  <X className="h-5 w-5" aria-hidden />
                  <span className="sr-only">
                    {t("common.remove")} {fmtClock(tm)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input type="time" aria-label={t("meds.addTime")} className="field flex-1" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
          <Button variant="secondary" onClick={() => newTime && !times.includes(newTime) && setTimes([...times, newTime].sort())} icon={<Plus className="h-5 w-5" aria-hidden />}>
            {t("meds.addTime")}
          </Button>
        </div>
      </fieldset>
      {field("instructions", t("meds.instructions"))}
      {field("prescriber", t("meds.prescriber"))}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="m-start" className="label">{t("meds.startDate")}</label>
          <input id="m-start" type="date" className="field" value={f.start_date} onChange={set("start_date")} />
        </div>
        <div>
          <label htmlFor="m-end" className="label">{t("meds.endDate")}</label>
          <input id="m-end" type="date" className="field" value={f.end_date} onChange={set("end_date")} />
        </div>
      </div>
      <label className="flex min-h-touch items-center gap-3 text-lg">
        <input type="checkbox" className="h-7 w-7 accent-[rgb(var(--brand))]" checked={f.important} onChange={set("important")} />
        {t("meds.important")}
      </label>
      {problem && <InlineError>{problem}</InlineError>}
      {error ? <ErrorState error={error} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button size="lg" full loading={busy} onClick={save}>
          {t("common.save")}
        </Button>
        <Button variant="secondary" size="lg" full onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
