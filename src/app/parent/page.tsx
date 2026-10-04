"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api, useApi } from "@/lib/client/api";
import { dayBounds, fmtClock, greetingKey } from "@/lib/client/format";
import type { MessageKey } from "@/lib/i18n";
import { Button } from "@/components/Button";
import { LargeActionCard } from "@/components/LargeActionCard";
import { ErrorState, Loading } from "@/components/States";
import { useToast } from "@/components/Toast";

interface Home {
  patient: { name: string; emergency_number: string };
  painCount: number;
  mealsCount: number;
  doses: { total: number; taken: number };
  nextDose: { name: string; time: string } | null;
  checkedIn: boolean;
  feltFine: boolean;
  alertToday: boolean;
}

function StatusRow({ done, label, value }: { done: boolean | null; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      {done === null ? null : done ? (
        <CheckCircle2 className="h-7 w-7 shrink-0 text-ok" aria-hidden />
      ) : (
        <Circle className="h-7 w-7 shrink-0 text-muted" aria-hidden />
      )}
      <div className="flex-1">
        <p className="text-base font-semibold text-muted">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function ParentHome() {
  const t = useT();
  const toast = useToast();
  const bounds = useMemo(() => dayBounds(), []);
  const { data, error, loading, reload } = useApi<Home>(`/api/home?date=${bounds.date}&from=${encodeURIComponent(bounds.from)}&to=${encodeURIComponent(bounds.to)}`);
  const [checking, setChecking] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data) return <main className="page"><ErrorState error={error} onRetry={reload} /></main>;

  const first = data.patient.name.split(" ")[0];
  const checkIn = async () => {
    setChecking(true);
    try {
      await api("/api/checkin", { method: "POST", json: { date: bounds.date } });
      toast(t("home.checkInNoPainDone"));
      reload();
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="page">
      <h1 className="text-3xl font-bold leading-tight">
        {t(greetingKey() as MessageKey, { name: first })} <span aria-hidden>❤️</span>
      </h1>
      <p className="mt-1 text-2xl text-muted">{t("home.howFeeling")}</p>

      {data.alertToday && (
        <Link href="/parent/pain" className="mt-4 flex items-start gap-3 rounded-card border-2 border-urgent/50 bg-urgent-soft p-4 text-lg font-semibold">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-urgent" aria-hidden />
          {t("home.urgentReminder")}
        </Link>
      )}

      <nav aria-label={t("home.howFeeling")} className="mt-5 flex flex-col gap-3">
        <LargeActionCard href="/parent/pain/new" emoji="😣" label={t("home.logPain")} tone="warm" />
        <LargeActionCard href="/parent/food" emoji="🍽" label={t("home.logFood")} tone="brand" />
        <LargeActionCard href="/parent/medicines" emoji="💊" label={t("home.medicines")} tone="calm" hint={data.doses.total ? t("home.medsTaken", { taken: data.doses.taken, total: data.doses.total }) : undefined} />
        <LargeActionCard href="/parent/records" emoji="📄" label={t("home.myReports")} />
      </nav>

      {!data.checkedIn && (
        <Button variant="secondary" size="lg" full className="mt-3" loading={checking} onClick={checkIn} icon={<span aria-hidden>🙂</span>}>
          {t("home.checkInNoPain")}
        </Button>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <LargeActionCard href="/parent/health" emoji="❤️" label={t("home.myHealth")} compact />
        <LargeActionCard href="/parent/contact" emoji="📞" label={t("home.contactFamily")} compact />
      </div>

      <section aria-labelledby="today" className="card mt-6 divide-y divide-line px-5 py-2">
        <h2 id="today" className="py-3 text-2xl font-bold">
          {t("home.todayTitle")}
        </h2>
        <StatusRow done={data.checkedIn} label={t("home.checkIn")} value={data.checkedIn ? `✓ ${t("home.checkInDone")}` : t("home.checkInNotDone")} />
        <StatusRow
          done={data.doses.total ? data.doses.taken === data.doses.total : null}
          label={t("home.medsToday")}
          value={data.doses.total ? t("home.medsTaken", { taken: data.doses.taken, total: data.doses.total }) : t("home.medsNone")}
        />
        {data.nextDose && <StatusRow done={null} label={t("home.nextMedicine")} value={`${fmtClock(data.nextDose.time)} · ${data.nextDose.name}`} />}
        <StatusRow
          done={null}
          label={t("home.painToday")}
          value={data.painCount === 0 ? t("home.painNone") : t(data.painCount === 1 ? "home.painCount" : "home.painCountPlural", { count: data.painCount })}
        />
      </section>

      <Link href="/parent/ask" className="mt-6 flex min-h-action items-center justify-center gap-3 rounded-card border-2 border-calm/30 bg-calm-soft px-5 text-xl font-bold text-calm hover:border-calm">
        <span aria-hidden>💬</span>
        {t("home.askCareSense")}
      </Link>
    </main>
  );
}
