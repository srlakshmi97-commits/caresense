"use client";

import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { useApi } from "@/lib/client/api";
import { daysAgoStart, localDate } from "@/lib/client/format";
import type { PainEpisode } from "@/lib/types";
import { ButtonLink } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { PainEntryCard } from "@/components/PainEntryCard";
import { EmptyState, ErrorState, Loading } from "@/components/States";

export default function PainHistory() {
  const t = useT();
  const { data, error, loading, reload } = useApi<{ episodes: PainEpisode[] }>("/api/pain");

  const today = localDate();
  const weekStart = daysAgoStart(6).toISOString();
  const eps = data?.episodes ?? [];
  const groups = [
    { key: "today", title: t("pain.todaysEpisodes"), items: eps.filter((e) => localDate(new Date(e.started_at)) === today) },
    { key: "week", title: t("pain.weekEpisodes"), items: eps.filter((e) => localDate(new Date(e.started_at)) !== today && e.started_at >= weekStart) },
    { key: "earlier", title: t("pain.recent"), items: eps.filter((e) => e.started_at < weekStart).slice(0, 30) },
  ];

  return (
    <main className="page">
      <PageHeader title={t("pain.historyTitle")} back="/parent/health" />
      <ButtonLink href="/parent/pain/new" size="lg" full icon={<Plus className="h-6 w-6" aria-hidden />}>
        {t("pain.logNew")}
      </ButtonLink>

      <div className="mt-6">
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : eps.length === 0 ? (
          <EmptyState icon="🌿">{t("pain.noPain")}</EmptyState>
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-labelledby={`g-${g.key}`} className="mb-8">
              <h2 id={`g-${g.key}`} className="mb-3 text-2xl font-bold">
                {g.title} <span className="text-muted">({g.items.length})</span>
              </h2>
              {g.items.length === 0 ? (
                <p className="text-lg text-muted">{g.key === "today" ? t("pain.noPainToday") : "—"}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {g.items.map((ep) => (
                    <PainEntryCard key={ep.id} ep={ep} editHref={`/parent/pain/new?id=${ep.id}`} />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </main>
  );
}
