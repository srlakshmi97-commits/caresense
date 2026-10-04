"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { AIChat } from "@/components/AIChat";
import { PageHeader } from "@/components/PageHeader";
import { Loading } from "@/components/States";

function AskInner() {
  const t = useT();
  const q = useSearchParams().get("q") ?? undefined;
  return (
    <main className="page pb-4">
      <PageHeader title={t("ask.title")} />
      <AIChat initialQuestion={q} />
    </main>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AskInner />
    </Suspense>
  );
}
