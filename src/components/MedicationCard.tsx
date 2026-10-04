"use client";

import { Check, HelpCircle, X } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { fmtClock } from "@/lib/client/format";
import type { Medication, MedStatus } from "@/lib/types";
import { Button } from "./Button";

const STATUS_STYLE: Record<MedStatus, { cls: string; icon: typeof Check }> = {
  taken: { cls: "bg-ok-soft text-ok border-ok/40", icon: Check },
  skipped: { cls: "bg-warn-soft text-warn border-warn/40", icon: X },
  unsure: { cls: "bg-calm-soft text-calm border-calm/40", icon: HelpCircle },
};

/** One scheduled dose: time, medicine, and a big "Mark taken" action. */
export function MedicationCard({
  med,
  time,
  status,
  onLog,
  busy,
}: {
  med: Medication;
  time: string;
  status: MedStatus | null;
  onLog: (s: MedStatus) => void;
  busy?: boolean;
}) {
  const t = useT();
  const [more, setMore] = useState(false);
  const labels: Record<MedStatus, string> = { taken: t("meds.markedTaken"), skipped: t("meds.markedSkipped"), unsure: t("meds.markedUnsure") };

  return (
    <div className={`card p-4 ${status === "taken" ? "border-ok/40" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0 pt-0.5 text-xl font-bold text-ink">{fmtClock(time)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold">{med.name}</p>
          <p className="text-base text-muted">
            {[med.dosage, med.purpose, med.instructions].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="mt-3">
        {status && !more ? (
          <div className="flex flex-wrap items-center gap-3">
            {(() => {
              const S = STATUS_STYLE[status];
              return (
                <span className={`inline-flex min-h-touch items-center gap-2 rounded-2xl border-2 px-4 text-lg font-bold ${S.cls}`}>
                  <S.icon className="h-5 w-5" aria-hidden />
                  {labels[status]}
                </span>
              );
            })()}
            <Button variant="ghost" onClick={() => setMore(true)}>
              {t("meds.change")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              full
              loading={busy}
              onClick={() => {
                onLog("taken");
                setMore(false);
              }}
              icon={<Check className="h-6 w-6" aria-hidden />}
            >
              {t("meds.markTaken")}
            </Button>
            {more || status ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" disabled={busy} onClick={() => { onLog("skipped"); setMore(false); }}>
                  {t("meds.skipped")}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => { onLog("unsure"); setMore(false); }}>
                  {t("meds.unsure")}
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setMore(true)}>
                {t("meds.otherOptions")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
