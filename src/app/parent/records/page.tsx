"use client";

import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { useApi } from "@/lib/client/api";
import type { MedicalRecord } from "@/lib/types";
import { ButtonLink } from "@/components/Button";
import { MedicalRecordCard } from "@/components/MedicalRecordCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, Loading } from "@/components/States";

export default function RecordsPage() {
  const t = useT();
  const { data, error, loading, reload } = useApi<{ records: MedicalRecord[] }>("/api/records");
  return (
    <main className="page">
      <PageHeader title={t("records.title")} subtitle={t("records.subtitle")} />
      <ButtonLink href="/parent/records/new" size="lg" full icon={<Plus className="h-6 w-6" aria-hidden />}>
        {t("records.upload")}
      </ButtonLink>
      <div className="mt-6 flex flex-col gap-3">
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data!.records.length === 0 ? (
          <EmptyState icon="📄">{t("records.none")}</EmptyState>
        ) : (
          data!.records.map((r) => <MedicalRecordCard key={r.id} record={r} href={`/parent/records/${r.id}`} />)
        )}
      </div>
    </main>
  );
}
