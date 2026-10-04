"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/client";

export function PageHeader({ title, back = "/parent", subtitle, right }: { title: string; back?: string | null; subtitle?: string; right?: ReactNode }) {
  const t = useT();
  return (
    <header className="mb-5">
      <div className="flex min-h-touch items-center justify-between gap-2">
        {back ? (
          <Link href={back} className="-ml-2 inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-lg font-semibold text-calm hover:bg-calm-soft">
            <ArrowLeft className="h-6 w-6" aria-hidden />
            {t("common.back")}
          </Link>
        ) : (
          <span />
        )}
        {right}
      </div>
      {title && <h1 className="mt-2 text-3xl font-bold leading-tight text-ink">{title}</h1>}
      {subtitle && <p className="mt-1 text-lg text-muted">{subtitle}</p>}
    </header>
  );
}
