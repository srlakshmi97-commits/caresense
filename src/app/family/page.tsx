"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, UserPlus } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api, ApiError, useApi } from "@/lib/client/api";
import { daysAgoStart, dayBounds, fmtClock, fmtDay, fmtTime, timeZone } from "@/lib/client/format";
import type { MessageKey } from "@/lib/i18n";
import type { Meal, Notification, PainEpisode, Permissions } from "@/lib/types";
import type { TimelineItem } from "@/lib/services/timeline";
import { AlertCard } from "@/components/AlertCard";
import { ButtonLink } from "@/components/Button";
import { FamilyCharts } from "@/components/FamilyCharts";
import { HealthMetricCard } from "@/components/HealthMetricCard";
import { MealCard } from "@/components/MealCard";
import { MedicalRecordCard } from "@/components/MedicalRecordCard";
import { PainEntryCard } from "@/components/PainEntryCard";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { Timeline } from "@/components/Timeline";

type Range = "today" | "d7" | "d30" | "all";
interface Dash {
  patient: { id: string; name: string; firstName: string; age: number | null; conditions: string[] | null };
  link: { relationship: string; permissions: Permissions };
  range: Range;
  symptoms: { count: number; flaggedCount: number; episodes: PainEpisode[]; daily: { date: string; count: number; max: number | null }[] } | null;
  meals: { count: number; recent: Meal[] } | null;
  medications: {
    meds: { id: string; name: string; purpose: string | null; dosage: string; times: string[]; instructions: string | null; important: boolean }[];
    taken: number; skipped: number; unsure: number; missing: number; scheduled: number;
    daily: { date: string; taken: number; scheduled: number }[];
    overdueToday: { name: string; time: string; important: boolean }[];
  } | null;
  records: { newCount: number; recent: { id: string; title: string; category: never; record_date: string | null; created_at: string; uploaded_by_name: string }[] } | null;
  attention: { count: number; alerts: { id: string; created_at: string; rules: string[]; source: string }[] } | null;
  timeline: TimelineItem[] | null;
  notifications: Notification[];
  lastActivity: string | null;
}
interface PatientRef { patientId: string; name: string | null; relationship: string; status: "active" | "revoked" }

const RANGE_FROM: Record<Range, () => string | null> = {
  today: () => dayBounds().from,
  d7: () => daysAgoStart(6).toISOString(),
  d30: () => daysAgoStart(29).toISOString(),
  all: () => null,
};

function Dashboard({ patientId }: { patientId: string }) {
  const t = useT();
  const [range, setRange] = useState<Range>("d7");
  const from = useMemo(() => RANGE_FROM[range](), [range]);
  const { data, error, loading, reload, setData } = useApi<Dash>(
    `/api/family/dashboard?patientId=${patientId}&range=${range}&tz=${encodeURIComponent(timeZone())}${from ? `&from=${encodeURIComponent(from)}` : ""}`,
  );

  if (error instanceof ApiError && (error.code === "revoked" || error.code === "forbidden")) {
    return <EmptyState icon="🔒">{t("errors.accessRevoked")}</EmptyState>;
  }
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;

  const name = data.patient.firstName;
  const s = data.symptoms, m = data.medications, meals = data.meals, rec = data.records, att = data.attention;
  const notShared = t("family.notShared");
  const markRead = async (id: string) => {
    await api("/api/family/notifications", { method: "PATCH", json: { id } }).catch(() => {});
    setData((d) => d && { ...d, notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) });
  };
  const unread = data.notifications.filter((n) => !n.read);
  // Render in the reader's language from kind + params; fall back to stored English.
  const noteText = (n: Notification, part: "Title" | "Body") => {
    if (!n.params) return part === "Title" ? n.title : n.body;
    const params: Record<string, string> = { ...n.params };
    if (n.params.regions) params.locations = n.params.regions.split(",").map((r) => t(`regions.${r}` as MessageKey)).join(", ");
    return t(`notifications.${n.kind}${part}` as MessageKey, params);
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{t("family.dashboardTitle", { name })}</h1>
          <p className="text-lg text-muted">
            {data.patient.name}
            {data.patient.age ? ` · ${data.patient.age}` : ""}
            {data.lastActivity && ` · ${t("family.lastActivity", { when: `${fmtDay(data.lastActivity)} ${fmtTime(data.lastActivity)}` })}`}
          </p>
          {data.patient.conditions && data.patient.conditions.length > 0 && <p className="text-base text-muted">{data.patient.conditions.join(" · ")}</p>}
        </div>
        <fieldset>
          <legend className="sr-only">{t("family.rangeLabel")}</legend>
          <div role="radiogroup" className="flex flex-wrap gap-1 rounded-2xl bg-line/50 p-1">
            {(["today", "d7", "d30", "all"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={range === r}
                onClick={() => setRange(r)}
                className={`min-h-touch rounded-xl px-4 text-base font-bold ${range === r ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"}`}
              >
                {t(`family.range.${r}`)}
              </button>
            ))}
          </div>
        </fieldset>
      </header>

      <p className="flex items-center gap-2 rounded-2xl bg-calm-soft px-4 py-3 text-base">
        <Eye className="h-5 w-5 shrink-0 text-calm" aria-hidden />
        {t("family.sharedByParent", { name })} {t("family.readOnly")}
      </p>

      <section aria-labelledby="ov">
        <h2 id="ov" className="sr-only">{t("family.overview")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <HealthMetricCard emoji="❤️" label={t("family.symptoms")} value={s ? t("family.painEpisodes", { count: s.count }) : null} notSharedLabel={notShared} />
          <HealthMetricCard emoji="🍽" label={t("family.food")} value={meals ? t("family.mealsLogged", { count: meals.count }) : null} notSharedLabel={notShared} />
          <HealthMetricCard
            emoji="💊"
            label={t("family.medicines")}
            value={m ? t("family.medsTaken", { taken: m.taken, total: m.scheduled }) : null}
            tone={m && m.scheduled > 0 && m.taken === m.scheduled ? "good" : "plain"}
            notSharedLabel={notShared}
          />
          <HealthMetricCard emoji="📄" label={t("family.newRecords")} value={rec ? t("family.recordsUploaded", { count: rec.newCount }) : null} notSharedLabel={notShared} />
          <HealthMetricCard
            emoji="⚠️"
            label={t("family.attention")}
            value={att ? (att.count ? t(att.count === 1 ? "family.attentionCount" : "family.attentionCountPlural", { count: att.count }) : t("family.attentionNone")) : null}
            tone={att && att.count ? "attention" : "plain"}
            notSharedLabel={notShared}
          />
        </div>
      </section>

      <section aria-labelledby="al">
        <h2 id="al" className="mb-3 text-2xl font-bold">{t("family.alerts")}</h2>
        {data.notifications.length === 0 && (!att || att.alerts.length === 0) && !(m && m.overdueToday.length) ? (
          <p className="text-lg text-muted">{t("family.noAlerts")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(unread.length ? unread : data.notifications.slice(0, 4)).map((n) => (
              <AlertCard
                key={n.id}
                kind={n.kind}
                title={noteText(n, "Title")}
                unread={!n.read}
                meta={`${fmtDay(n.created_at)} · ${fmtTime(n.created_at)}`}
                action={!n.read ? <button type="button" onClick={() => markRead(n.id)} className="min-h-touch text-base font-semibold text-calm underline">{t("family.markRead")}</button> : undefined}
              >
                {noteText(n, "Body")}
              </AlertCard>
            ))}
            {m && m.overdueToday.length > 0 && (
              <AlertCard kind="medication" title={t("reminders.overdueTitle")}>
                {m.overdueToday.map((o) => t("reminders.overdueItem", { medicine: o.name + (o.important ? " ★" : ""), time: fmtClock(o.time) })).join(" | ")}
              </AlertCard>
            )}
            {att?.alerts.slice(0, 4).map((a) => (
              <AlertCard key={a.id} kind="emergency" title={t("family.warningSigns", { name })} meta={`${fmtDay(a.created_at)} · ${fmtTime(a.created_at)}`}>
                {a.rules.map((r) => t(`safety.rules.${r}` as MessageKey)).join(" · ")}
              </AlertCard>
            ))}
          </div>
        )}
      </section>

      {(s || m) && (
        <section aria-label={t("family.overview")}>
          <FamilyCharts name={name} painDaily={s?.daily ?? null} medsDaily={m?.daily ?? null} />
          {m && (
            <p className="mt-3 text-base text-muted">
              {t("family.dosesSummary", { taken: m.taken, skipped: m.skipped, unsure: m.unsure, missing: Math.max(0, m.missing) })}
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <section aria-labelledby="tl" className="lg:col-span-3">
          <h2 id="tl" className="mb-3 text-2xl font-bold">{t("timeline.familyTitle")}</h2>
          {data.timeline === null ? (
            <EmptyState icon="🔒">{notShared}</EmptyState>
          ) : data.timeline.length === 0 ? (
            <EmptyState icon="🗓">{t("timeline.empty")}</EmptyState>
          ) : (
            <Timeline items={data.timeline} recordHref={(id) => `/family/records/${id}`} />
          )}
        </section>

        <div className="flex flex-col gap-8 lg:col-span-2">
          <section aria-labelledby="rs">
            <h2 id="rs" className="mb-3 text-2xl font-bold">{t("family.recentSymptoms")}</h2>
            {!s ? <EmptyState icon="🔒">{notShared}</EmptyState> : s.episodes.length === 0 ? <p className="text-lg text-muted">{t("pain.noPain")}</p> : (
              <div className="flex flex-col gap-3">{s.episodes.slice(0, 5).map((e) => <PainEntryCard key={e.id} ep={e} />)}</div>
            )}
          </section>

          <section aria-labelledby="rr">
            <h2 id="rr" className="mb-3 text-2xl font-bold">{t("family.recentRecords")}</h2>
            {!rec ? <EmptyState icon="🔒">{notShared}</EmptyState> : rec.recent.length === 0 ? <p className="text-lg text-muted">{t("records.none")}</p> : (
              <div className="flex flex-col gap-3">{rec.recent.map((r) => <MedicalRecordCard key={r.id} record={r} href={`/family/records/${r.id}`} />)}</div>
            )}
          </section>

          <section aria-labelledby="ml">
            <h2 id="ml" className="mb-3 text-2xl font-bold">{t("family.medicinesList")}</h2>
            {!m ? <EmptyState icon="🔒">{notShared}</EmptyState> : (
              <ul className="card divide-y divide-line px-4">
                {m.meds.map((x) => (
                  <li key={x.id} className="py-3">
                    <p className="text-lg font-bold">{x.name}{x.important && <span className="ml-2 text-warn">★</span>}</p>
                    <p className="text-base text-muted">{[x.dosage, x.purpose, x.times.map(fmtClock).join(", ")].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="rm">
            <h2 id="rm" className="mb-3 text-2xl font-bold">{t("family.recentMeals")}</h2>
            {!meals ? <EmptyState icon="🔒">{notShared}</EmptyState> : meals.recent.length === 0 ? <p className="text-lg text-muted">{t("food.noMeals")}</p> : (
              <div className="flex flex-col gap-3">{meals.recent.slice(0, 4).map((x) => <MealCard key={x.id} meal={x} showDate />)}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function FamilyHome() {
  const t = useT();
  const router = useRouter();
  const wanted = useSearchParams().get("patient");
  const { data, error, loading, reload } = useApi<{ patients: PatientRef[]; name: string }>("/api/family/patients");
  const active = data?.patients.filter((p) => p.status === "active") ?? [];
  const selected = active.find((p) => p.patientId === wanted) ?? active[0];

  useEffect(() => {
    if (selected && selected.patientId !== wanted) router.replace(`/family?patient=${selected.patientId}`);
  }, [selected, wanted, router]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;

  if (active.length === 0) {
    const revoked = data.patients.some((p) => p.status === "revoked");
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState icon={revoked ? "🔒" : "👋"} action={<ButtonLink href="/family/join" size="lg" icon={<UserPlus className="h-6 w-6" aria-hidden />}>{t("family.joinTitle")}</ButtonLink>}>
          {revoked ? t("errors.accessRevoked") : t("family.noPatients")}
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      {active.length > 1 && (
        <nav aria-label={t("family.choosePatient")} className="mb-6 flex flex-wrap gap-2">
          {active.map((p) => (
            <Link key={p.patientId} href={`/family?patient=${p.patientId}`} aria-current={p.patientId === selected?.patientId ? "page" : undefined}
              className={`min-h-touch rounded-xl border-2 px-4 py-2 text-lg font-bold ${p.patientId === selected?.patientId ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}>
              {p.name}
            </Link>
          ))}
        </nav>
      )}
      {selected && <Dashboard key={selected.patientId} patientId={selected.patientId} />}
      <div className="mt-10">
        <ButtonLink href="/family/join" variant="ghost" icon={<UserPlus className="h-5 w-5" aria-hidden />}>{t("family.joinTitle")}</ButtonLink>
      </div>
    </>
  );
}

export default function FamilyPage() {
  return (
    <main className="page-wide">
      <Suspense fallback={<Loading />}>
        <FamilyHome />
      </Suspense>
    </main>
  );
}
