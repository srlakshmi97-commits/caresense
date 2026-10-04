"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api, useApi } from "@/lib/client/api";
import { fmtDay } from "@/lib/client/format";
import type { MedicalRecord, RecordExtraction } from "@/lib/types";
import { Button, ButtonLink } from "./Button";
import { CATEGORY_EMOJI } from "./MedicalRecordCard";
import { ErrorState, Loading } from "./States";

type Data = { record: MedicalRecord; extraction: RecordExtraction | null; viewer: "parent" | "family" };

/** Report page: the untouched original + a separately-stored AI summary with sources. */
export function RecordDetail({ id }: { id: string }) {
  const t = useT();
  const { data, error, loading, reload, setData } = useApi<Data>(`/api/records/${id}`);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<unknown>(null);
  const started = useRef(false);

  const read = async () => {
    setReading(true);
    setReadError(null);
    try {
      const res = await api<{ record: MedicalRecord; extraction: RecordExtraction | null }>(`/api/records/${id}/extract`, { method: "POST" });
      setData((d) => d && { ...d, record: res.record, extraction: res.extraction ?? d.extraction });
    } catch (e) {
      setReadError(e);
    } finally {
      setReading(false);
    }
  };

  // Newly uploaded reports are read automatically.
  useEffect(() => {
    if (data?.viewer === "parent" && data.record.extraction_status === "pending" && !started.current) {
      started.current = true;
      read();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;

  const { record, extraction, viewer } = data;
  const fileUrl = `/api/records/${record.id}/file`;
  const isImage = record.mime_type.startsWith("image/");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="flex items-center gap-2 text-lg font-semibold text-muted">
          <span aria-hidden className="text-3xl">{CATEGORY_EMOJI[record.category]}</span>
          {t(`categories.${record.category}`)}
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">{record.title}</h1>
        <p className="text-lg text-muted">
          {record.record_date && `${fmtDay(record.record_date, { withYear: true })} · `}
          {t("records.uploadedBy", { name: record.uploaded_by_name })}
        </p>
      </header>

      <section aria-labelledby="ai" className="card p-5">
        <h2 id="ai" className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-calm" aria-hidden />
          {t("records.aiSummary")}
        </h2>

        {reading ? (
          <Loading label={t("records.reading")} />
        ) : record.extraction_status === "done" && extraction ? (
          <>
            <p className="mt-3 text-xl leading-relaxed">{extraction.summary}</p>
            {extraction.findings.length > 0 && (
              <>
                <h3 className="mt-6 text-xl font-bold">{t("records.importantFindings")}</h3>
                <ul className="mt-2 flex flex-col gap-3">
                  {extraction.findings.map((f, i) => (
                    <li key={i} className="rounded-2xl border-2 border-calm/25 bg-calm-soft p-4">
                      <p className="text-lg font-semibold">{f.text}</p>
                      <p className="mt-1 text-base text-muted">
                        {t("records.sourceQuote")} <q className="italic">{f.source_quote}</q>
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {extraction.unclear_parts.length > 0 && (
              <>
                <h3 className="mt-6 text-xl font-bold">{t("records.unclear")}</h3>
                <ul className="mt-2 list-disc pl-6 text-lg">
                  {extraction.unclear_parts.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-5 text-base text-muted">{t("records.aiLabel")}</p>
          </>
        ) : record.extraction_status === "unreadable" ? (
          <p className="mt-3 rounded-2xl bg-warn-soft p-4 text-lg">{t("records.unreadable")}</p>
        ) : record.extraction_status === "unavailable" ? (
          <p className="mt-3 rounded-2xl bg-warn-soft p-4 text-lg">{t("records.unavailable")}</p>
        ) : (
          <p className="mt-3 text-lg text-muted">{t("records.pending")}</p>
        )}

        {readError ? <div className="mt-3"><ErrorState error={readError} /></div> : null}
        {viewer === "parent" && !reading && record.extraction_status !== "done" && (
          <Button variant="secondary" className="mt-4" onClick={read} icon={<RefreshCw className="h-5 w-5" aria-hidden />}>
            {t("records.retry")}
          </Button>
        )}
      </section>

      {viewer === "parent" && record.extraction_status === "done" && (
        <ButtonLink href={`/parent/ask?q=${encodeURIComponent(t("records.askAboutQ", { title: record.title }))}`} size="lg" variant="secondary" full icon={<MessageCircle className="h-6 w-6" aria-hidden />}>
          {t("records.askAbout")}
        </ButtonLink>
      )}

      <section aria-labelledby="orig" className="card p-5">
        <h2 id="orig" className="flex items-center gap-2 text-2xl font-bold">
          <FileText className="h-6 w-6 text-muted" aria-hidden />
          {t("records.original")}
        </h2>
        <p className="mt-1 text-lg text-muted">{t("records.originalSafe")}</p>
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={record.title} className="mt-4 max-h-[32rem] w-full rounded-xl border border-line object-contain" />
        )}
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-touch items-center gap-2 rounded-2xl border-2 border-line px-5 py-2 text-lg font-bold hover:border-brand">
          <ExternalLink className="h-5 w-5" aria-hidden />
          {t("records.openOriginal")}
        </a>
      </section>
    </div>
  );
}
