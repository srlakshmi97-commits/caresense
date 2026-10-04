"use client";

import Link from "next/link";
import { AlertTriangle, Pencil } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { fmtDay, fmtDuration, fmtTime } from "@/lib/client/format";
import { painWhere } from "@/lib/client/labels";
import type { PainEpisode } from "@/lib/types";
import { SEVERITY_EMOJI } from "./PainSeveritySelector";

export function PainEntryCard({ ep, editHref }: { ep: PainEpisode; editHref?: string }) {
  const t = useT();
  const others = ep.symptoms.filter((s) => s !== "none");
  const where = painWhere(ep, t);
  return (
    <article className={`card p-4 ${ep.safety_rules.length ? "border-urgent/50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-muted">
            {fmtDay(ep.started_at)} · {fmtTime(ep.started_at)}
          </p>
          <p className="mt-0.5 text-xl font-bold">{where}</p>
        </div>
        {editHref && (
          <Link href={editHref} className="flex min-h-touch items-center gap-1 rounded-xl px-3 text-lg font-semibold text-calm hover:bg-calm-soft">
            <Pencil className="h-5 w-5" aria-hidden />
            {t("common.edit")}
          </Link>
        )}
      </div>
      <p className="mt-1 text-lg">
        <span aria-hidden>{SEVERITY_EMOJI[ep.severity_level]} </span>
        {t(`severity.${ep.severity_level}`)} · <strong>{ep.severity_score}/10</strong>
      </p>
      <p className="text-lg">
        {ep.ongoing || !ep.ended_at ? t("pain.ongoing") : t("pain.lasted", { duration: fmtDuration(Date.parse(ep.ended_at) - Date.parse(ep.started_at)) })}
      </p>
      {others.length > 0 && <p className="text-lg text-muted">{others.map((s) => t(`symptoms.${s}`)).join(", ")}</p>}
      {ep.safety_rules.length > 0 && (
        <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-urgent">
          <AlertTriangle className="h-5 w-5" aria-hidden />
          {t("pain.flagged")}
        </p>
      )}
    </article>
  );
}
