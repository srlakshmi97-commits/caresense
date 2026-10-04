"use client";

import { useMemo, useState } from "react";
import { Info, Pencil, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api, useApi } from "@/lib/client/api";
import { fmtClock, localDate } from "@/lib/client/format";
import type { Medication, MedicationLog, MedStatus } from "@/lib/types";
import { Button } from "@/components/Button";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { MedicationCard } from "@/components/MedicationCard";
import { MedicationForm } from "@/components/MedicationForm";
import { PageHeader } from "@/components/PageHeader";
import { ReminderSettings } from "@/components/ReminderSettings";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { useToast } from "@/components/Toast";

export default function MedicinesPage() {
  const t = useT();
  const toast = useToast();
  const date = useMemo(() => localDate(), []);
  const { data, error, loading, reload, setData } = useApi<{ medications: Medication[]; logs: MedicationLog[] }>(`/api/medications?date=${date}`);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<Medication | "new" | null>(null);
  const [stopping, setStopping] = useState<Medication | null>(null);
  const [logError, setLogError] = useState<unknown>(null);

  const scheduled = (m: Medication) => m.active && m.times.length > 0 && (!m.start_date || m.start_date <= date) && (!m.end_date || m.end_date >= date);
  const doses = (data?.medications ?? [])
    .filter(scheduled)
    .flatMap((m) => m.times.map((time) => ({ med: m, time })))
    .sort((a, b) => a.time.localeCompare(b.time));

  const log = async (med: Medication, time: string, status: MedStatus) => {
    const key = `${med.id}|${time}`;
    setBusyKey(key);
    setLogError(null);
    try {
      const { log: saved } = await api<{ log: MedicationLog }>("/api/medications/log", { method: "POST", json: { medication_id: med.id, date, time, status } });
      setData((d) => d && { ...d, logs: [...d.logs.filter((l) => l.id !== saved.id), saved] });
      toast(`${med.name}: ${t(`meds.${status}`)}`);
    } catch (e) {
      setLogError(e);
    } finally {
      setBusyKey(null);
    }
  };

  const stop = async () => {
    if (!stopping) return;
    await api(`/api/medications/${stopping.id}`, { method: "PATCH", json: { active: false } }).catch(setLogError);
    setStopping(null);
    toast(t("meds.removedTitle"));
    reload();
  };

  if (loading && !data) return <Loading />;
  if (error || !data) return <main className="page"><ErrorState error={error} onRetry={reload} /></main>;

  const active = data.medications.filter((m) => m.active);

  return (
    <main className="page">
      <PageHeader title={t("meds.title")} />

      <section aria-labelledby="today">
        <h2 id="today" className="mb-3 text-2xl font-bold">{t("meds.today")}</h2>
        {logError ? <div className="mb-3"><ErrorState error={logError} /></div> : null}
        {doses.length === 0 ? (
          <EmptyState icon="💊">{active.length ? t("meds.noneToday") : t("meds.none")}</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {doses.map(({ med, time }) => {
              const l = data.logs.find((x) => x.medication_id === med.id && x.scheduled_time === time);
              return <MedicationCard key={`${med.id}|${time}`} med={med} time={time} status={l?.status ?? null} busy={busyKey === `${med.id}|${time}`} onLog={(s) => log(med, time, s)} />;
            })}
          </div>
        )}
      </section>

      <p className="mt-5 flex items-start gap-3 rounded-2xl bg-calm-soft p-4 text-lg">
        <Info className="mt-1 h-5 w-5 shrink-0 text-calm" aria-hidden />
        {t("meds.safetyNote")}
      </p>

      <ReminderSettings />

      <section aria-labelledby="all" className="mt-8">
        <h2 id="all" className="mb-3 text-2xl font-bold">{t("meds.allMeds")}</h2>
        {editing ? (
          <MedicationForm
            med={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              toast(t("common.saved"));
              reload();
            }}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {active.map((m) => (
                <article key={m.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-bold">
                        {m.name}
                        {m.important && <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 align-middle text-sm font-bold text-warn">★</span>}
                      </h3>
                      <p className="text-lg">{[m.dosage, m.frequency].filter(Boolean).join(" · ")}</p>
                      <p className="text-lg text-muted">{m.times.length ? m.times.map(fmtClock).join(", ") : "—"}</p>
                      {m.instructions && <p className="text-base text-muted">{m.instructions}</p>}
                      {m.prescriber && <p className="text-base text-muted">{t("meds.prescribedBy", { name: m.prescriber })}</p>}
                    </div>
                    <Button variant="ghost" onClick={() => setEditing(m)} icon={<Pencil className="h-5 w-5" aria-hidden />}>
                      {t("common.edit")}
                    </Button>
                  </div>
                  <Button variant="ghost" className="mt-1 px-0 text-muted" onClick={() => setStopping(m)}>
                    {t("meds.stopTaking")}
                  </Button>
                </article>
              ))}
            </div>
            <Button size="lg" variant="secondary" full className="mt-4" onClick={() => setEditing("new")} icon={<Plus className="h-6 w-6" aria-hidden />}>
              {t("meds.add")}
            </Button>
          </>
        )}
      </section>

      <ConfirmationModal open={Boolean(stopping)} title={`${stopping?.name ?? ""}: ${t("meds.stopTaking")}?`} confirmLabel={t("common.confirm")} onConfirm={stop} onCancel={() => setStopping(null)}>
        {t("meds.safetyNote")}
      </ConfirmationModal>
    </main>
  );
}
