"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { DocumentUploader } from "@/components/DocumentUploader";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

export default function NewRecordPage() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  return (
    <main className="page">
      <PageHeader title={t("records.upload")} back="/parent/records" />
      <DocumentUploader
        onUploaded={(r) => {
          toast(t("records.uploaded"));
          router.replace(`/parent/records/${r.id}`);
        }}
      />
    </main>
  );
}
