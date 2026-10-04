"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { fmtDay, fmtTime } from "@/lib/client/format";
import { localDate } from "@/lib/client/format";
import { painWhere } from "@/lib/client/labels";
import type { TimelineItem } from "@/lib/services/timeline";
import type { TimelineType } from "@/lib/types";

const TYPE_EMOJI: Record<TimelineType, string> = {
  diagnosis: "📋",
  visit: "🩺",
  lab_test: "🩸",
  imaging: "🩻",
  medication: "💊",
  admission: "🏥",
  surgery: "🏥",
  symptom: "😣",
  other: "📄",
};

/** Chronological health timeline grouped by year → day. */
export function Timeline({ items, recordHref }: { items: TimelineItem[]; recordHref: (id: string) => string }) {
  const t = useT();
  const dayOf = (i: TimelineItem) => (i.at ? localDate(new Date(i.at)) : i.date);

  const years = new Map<string, Map<string, TimelineItem[]>>();
  for (const i of items) {
    const day = dayOf(i);
    const y = day.slice(0, 4);
    if (!years.has(y)) years.set(y, new Map());
    const days = years.get(y)!;
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push(i);
  }

  return (
    <div className="space-y-8">
      {[...years.entries()].map(([year, days]) => (
        <section key={year} aria-labelledby={`y-${year}`}>
          <h2 id={`y-${year}`} className="mb-3 text-2xl font-bold text-muted">
            {year}
          </h2>
          <ol className="relative space-y-4 border-l-4 border-brand/25 pl-6">
            {[...days.entries()].map(([day, list]) => (
              <li key={day} className="relative">
                <span aria-hidden className="absolute -left-[2.05rem] top-1.5 h-5 w-5 rounded-full border-4 border-canvas bg-brand" />
                <h3 className="text-xl font-bold">{fmtDay(day)}</h3>
                <ul className="mt-2 space-y-3">
                  {list.map((i) => (
                    <li key={i.id} className="card p-4">
                      <p className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-muted">
                        <span aria-hidden className="text-2xl normal-case">
                          {TYPE_EMOJI[i.type]}
                        </span>
                        {t(`timelineTypes.${i.type}`)}
                        {i.at && <span className="normal-case">· {fmtTime(i.at)}</span>}
                      </p>
                      {i.pain ? (
                        <>
                          <p className="mt-1 text-xl font-bold">
                            {t("timeline.painEpisode", { locations: painWhere(i.pain, t) })}
                          </p>
                          <p className="text-lg">
                            {t(`severity.${i.pain.severity_level}`)} · {i.pain.severity_score}/10
                            {i.pain.symptoms.filter((s) => s !== "none").length > 0 &&
                              ` · ${i.pain.symptoms.filter((s) => s !== "none").map((s) => t(`symptoms.${s}`)).join(", ")}`}
                          </p>
                          {i.pain.flagged && (
                            <p className="mt-1 flex items-center gap-2 font-semibold text-urgent">
                              <AlertTriangle className="h-5 w-5" aria-hidden />
                              {t("pain.flagged")}
                            </p>
                          )}
                        </>
                      ) : i.med ? (
                        <p className="mt-1 text-xl font-bold">
                          {t("timeline.medStarted", { name: i.med.name })}
                          {i.med.dosage && <span className="block text-lg font-normal">{i.med.dosage}</span>}
                        </p>
                      ) : (
                        <>
                          <p className="mt-1 text-xl font-bold">{i.title}</p>
                          {i.detail && <p className="text-lg">{i.detail}</p>}
                        </>
                      )}
                      {i.record_id && (
                        <Link href={recordHref(i.record_id)} className="mt-2 inline-flex min-h-touch items-center text-lg font-semibold text-calm underline underline-offset-4">
                          {t("timeline.fromReport", { title: i.record_title ?? "" })}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
