"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { fmtDay } from "@/lib/client/format";
import type { MedicalRecord, RecordCategory } from "@/lib/types";

export const CATEGORY_EMOJI: Record<RecordCategory, string> = {
  blood_test: "🩸",
  ultrasound: "🩻",
  ct_mri: "🧠",
  prescription: "💊",
  discharge_summary: "🏥",
  doctor_note: "🩺",
  surgery: "🏥",
  other: "📄",
};

export function MedicalRecordCard({
  record,
  href,
}: {
  record: Pick<MedicalRecord, "id" | "title" | "category" | "record_date" | "created_at" | "uploaded_by_name"> & { extraction_status?: MedicalRecord["extraction_status"] };
  href: string;
}) {
  const t = useT();
  return (
    <Link href={href} className="card flex min-h-[5rem] items-center gap-4 p-4 transition-colors hover:border-brand">
      <span aria-hidden className="text-4xl">
        {CATEGORY_EMOJI[record.category]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-bold">{record.title}</span>
        <span className="block text-base text-muted">
          {t(`categories.${record.category}`)}
          {record.record_date && ` · ${fmtDay(record.record_date, { withYear: true })}`}
        </span>
        <span className="block text-base text-muted">{t("records.uploadedBy", { name: record.uploaded_by_name })}</span>
      </span>
      <ChevronRight className="h-7 w-7 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
