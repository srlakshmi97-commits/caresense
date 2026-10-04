"use client";

import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RecordDetail } from "@/components/RecordDetail";

export default function FamilyRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <main className="page">
      <PageHeader title="" back="/family" />
      <RecordDetail id={id} />
    </main>
  );
}
