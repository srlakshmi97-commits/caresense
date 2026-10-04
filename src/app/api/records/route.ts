import { HttpError, route } from "@/lib/api";
import { audit, requireParent } from "@/lib/access";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/config";
import { t } from "@/lib/i18n";
import { firstName, notifyFamily } from "@/lib/services/notify";
import { safeFileName, sniffMime } from "@/lib/services/records";
import { clampStr, isDateOnly, newId, nowIso, pickEnum } from "@/lib/util";
import { RECORD_CATEGORIES, type MedicalRecord } from "@/lib/types";

export const GET = route(async (_req, ctx) => {
  const { patient } = await requireParent(ctx);
  const records = await ctx.store.list("medical_records", { patient_id: patient.id }, { orderBy: "created_at", ascending: false });
  return { records };
});

// Upload: stores the ORIGINAL file untouched. Reading (document AI) happens
// in a second step: POST /api/records/[id]/extract.
export const POST = route(async (req, ctx) => {
  const { profile, patient } = await requireParent(ctx);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "upload_failed");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "upload_failed");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "file_too_big");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !ALLOWED_UPLOAD_TYPES.includes(mime)) throw new HttpError(415, "file_type");

  const category = pickEnum(RECORD_CATEGORIES, form.get("category")) ?? "other";
  const title = clampStr(form.get("title"), 120) ?? t(`categories.${category}`);
  const dateRaw = form.get("record_date");
  const id = newId();
  const fileName = safeFileName(file.name || "report", mime);
  const path = `${patient.id}/${id}/${fileName}`;

  try {
    await ctx.files.put(path, buf, mime);
  } catch {
    throw new HttpError(500, "upload_failed");
  }

  const record: MedicalRecord = {
    id,
    patient_id: patient.id,
    title,
    category,
    record_date: isDateOnly(dateRaw) ? dateRaw : null,
    uploaded_by: profile.id,
    uploaded_by_name: profile.display_name || firstName(patient),
    file_path: path,
    file_name: fileName,
    mime_type: mime,
    size_bytes: buf.length,
    extraction_status: "pending",
    created_at: nowIso(),
  };
  const saved = await ctx.store.insert("medical_records", record);
  await audit(ctx, patient.id, "record_uploaded", title);
  await notifyFamily(ctx, patient, "new_report", { name: firstName(patient), title });
  return { record: saved };
});
