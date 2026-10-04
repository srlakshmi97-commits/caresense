import type { Ctx } from "../auth/session";
import { HttpError, notFound } from "../api";
import { audit, requireFamilyAccess, requireParent, requireProfile } from "../access";
import { AiUnavailableError } from "../ai/client";
import { extractDocument } from "../ai/extract";
import { LOCALES } from "../i18n";
import type { MedicalRecord, Patient } from "../types";
import { newId, nowIso } from "../util";

/** Loads a record for the parent who owns it, or a family member with "records" permission. */
export async function loadRecordFor(ctx: Ctx, id: string) {
  const profile = requireProfile(ctx);
  const record = await ctx.store.get("medical_records", id);
  if (!record) throw notFound();
  if (profile.role === "parent") {
    const { patient } = await requireParent(ctx);
    if (record.patient_id !== patient.id) throw notFound();
    return { record, patient, viewer: "parent" as const };
  }
  const { patient } = await requireFamilyAccess(ctx, record.patient_id, "records");
  return { record, patient, viewer: "family" as const };
}

/** Checks the first bytes so a renamed file can't pretend to be a PDF/image. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.subarray(0, 4).toString("latin1") === "%PDF") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (buf.subarray(0, 3).toString("latin1") === "GIF") return "image/gif";
  return null;
}

export function safeFileName(name: string, mime: string) {
  const ext = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[mime] ?? "bin";
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().slice(0, 60) || "report";
  return `${base.replace(/\s+/g, "-")}.${ext}`;
}

/** Runs document AI on a stored original and saves the result separately. */
export async function runExtraction(ctx: Ctx, record: MedicalRecord, patient: Patient) {
  const original = await ctx.files.get(record.file_path);
  if (!original) throw new HttpError(500, "generic");
  try {
    const result = await extractDocument(original, record.mime_type, LOCALES[patient.preferred_language]?.english ?? "English");
    const old = await ctx.store.list("record_extractions", { record_id: record.id });
    for (const o of old) await ctx.store.remove("record_extractions", o.id);
    const oldEvents = await ctx.store.list("timeline_events", { source_record_id: record.id });
    for (const e of oldEvents) await ctx.store.remove("timeline_events", e.id);

    if (result.status === "unreadable") {
      return ctx.store.update("medical_records", record.id, { extraction_status: "unreadable" });
    }
    await ctx.store.insert("record_extractions", {
      id: newId(),
      record_id: record.id,
      patient_id: patient.id,
      document_type: result.document_type,
      document_date: result.document_date,
      summary: result.summary,
      findings: result.findings,
      events: result.events,
      unclear_parts: result.unclear_parts,
      extracted_text: result.extracted_text,
      model: result.model,
      created_at: nowIso(),
    });
    for (const e of result.events) {
      await ctx.store.insert("timeline_events", {
        id: newId(),
        patient_id: patient.id,
        event_date: e.date,
        type: e.type,
        title: e.title,
        detail: e.detail,
        source: "record",
        source_record_id: record.id,
        source_quote: e.source_quote,
        created_at: nowIso(),
      });
    }
    return ctx.store.update("medical_records", record.id, {
      extraction_status: "done",
      // Only fill the date from the document if the user didn't give one.
      record_date: record.record_date ?? result.document_date,
    });
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return ctx.store.update("medical_records", record.id, { extraction_status: "unavailable" });
    }
    throw err;
  }
}

export async function auditRecordView(ctx: Ctx, record: MedicalRecord, viewer: "parent" | "family") {
  if (viewer === "family") await audit(ctx, record.patient_id, "family_viewed_record", record.title);
}
