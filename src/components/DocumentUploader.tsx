"use client";

import { Camera, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { api } from "@/lib/client/api";
import { RECORD_CATEGORIES, type MedicalRecord, type RecordCategory } from "@/lib/types";
import { Button } from "./Button";
import { ChoiceButton } from "./ChoiceButton";
import { CATEGORY_EMOJI } from "./MedicalRecordCard";
import { ErrorState, InlineError } from "./States";

const MAX = 10 * 1024 * 1024;
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];

/** Photo / PDF upload with category + date. The original is stored untouched. */
export function DocumentUploader({ onUploaded }: { onUploaded: (r: MedicalRecord) => void }) {
  const t = useT();
  const camera = useRef<HTMLInputElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const pdf = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<RecordCategory | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = (f: File | undefined) => {
    setFileError(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) return setFileError(t("errors.fileType"));
    if (f.size > MAX) return setFileError(t("errors.fileTooBig"));
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("category", category ?? "other");
    form.set("title", title.trim() || t(`categories.${category ?? "other"}`));
    if (date) form.set("record_date", date);
    try {
      const { record } = await api<{ record: MedicalRecord }>("/api/records", { method: "POST", body: form });
      onUploaded(record);
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  const hidden = "sr-only";
  if (!file) {
    return (
      <div className="flex flex-col gap-3">
        <input ref={camera} type="file" accept="image/*" capture="environment" className={hidden} tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
        <input ref={photo} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className={hidden} tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
        <input ref={pdf} type="file" accept="application/pdf" className={hidden} tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
        <Button size="lg" full onClick={() => camera.current?.click()} icon={<Camera className="h-7 w-7" aria-hidden />}>
          {t("records.takePhoto")}
        </Button>
        <Button size="lg" variant="secondary" full onClick={() => photo.current?.click()} icon={<ImageIcon className="h-7 w-7" aria-hidden />}>
          {t("records.choosePhoto")}
        </Button>
        <Button size="lg" variant="secondary" full onClick={() => pdf.current?.click()} icon={<FileText className="h-7 w-7" aria-hidden />}>
          {t("records.choosePdf")}
        </Button>
        {fileError && <InlineError>{fileError}</InlineError>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex items-center gap-4 p-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-24 w-24 rounded-xl object-cover" />
        ) : (
          <FileText className="h-16 w-16 text-calm" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-semibold">{t("records.selected", { name: file.name })}</p>
          <Button variant="ghost" onClick={() => { setFile(null); setPreview(null); }}>
            {t("records.change")}
          </Button>
        </div>
      </div>

      <fieldset>
        <legend className="label">{t("records.category")}</legend>
        <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RECORD_CATEGORIES.map((c) => (
            <ChoiceButton key={c} role="radio" selected={category === c} onClick={() => setCategory(c)} emoji={CATEGORY_EMOJI[c]}>
              {t(`categories.${c}`)}
            </ChoiceButton>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="doc-title" className="label">
          {t("records.docName")} <span className="font-normal text-muted">({t("common.optional")})</span>
        </label>
        <input id="doc-title" className="field" value={title} maxLength={120} placeholder={category ? t(`categories.${category}`) : t("records.docNamePlaceholder")} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="doc-date" className="label">
          {t("records.docDate")} <span className="font-normal text-muted">({t("common.optional")})</span>
        </label>
        <input id="doc-date" type="date" className="field" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
      </div>

      {error ? <ErrorState error={error} /> : null}
      <Button size="lg" full loading={busy} loadingText={t("records.uploading")} onClick={upload} icon={<Upload className="h-6 w-6" aria-hidden />}>
        {t("common.save")}
      </Button>
    </div>
  );
}
