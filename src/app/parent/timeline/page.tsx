"use client";

import { useT } from "@/lib/i18n/client";
import { useApi } from "@/lib/client/api";
import type { TimelineItem } from "@/lib/services/timeline";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import { Timeline } from "@/components/Timeline";

export default function TimelinePage() {
  const t = useT();
  const { data, error, loading, reload } = useApi<{ items: TimelineItem[] }>("/api/timeline");
  return (
    <main className="page">
      <PageHeader title={t("timeline.title")} back="/parent/health" />
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data!.items.length === 0 ? (
        <EmptyState icon="🗓">{t("timeline.empty")}</EmptyState>
      ) : (
        <Timeline items={data!.items} recordHref={(id) => `/parent/records/${id}`} />
      )}
    </main>
  );
}
