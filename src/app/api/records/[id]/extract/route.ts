import { HttpError, route } from "@/lib/api";
import { loadRecordFor, runExtraction } from "@/lib/services/records";

export const maxDuration = 180; // document reading can take a while

// Reads (OCR + structured extraction) a stored original. Parent only.
export const POST = route<{ id: string }>(async (_req, ctx, { id }) => {
  const { record, patient, viewer } = await loadRecordFor(ctx, id);
  if (viewer !== "parent") throw new HttpError(403, "forbidden");
  if (record.extraction_status === "done") return { record };
  const updated = await runExtraction(ctx, record, patient);
  const [extraction] = await ctx.store.list("record_extractions", { record_id: record.id });
  return { record: updated, extraction: extraction ?? null };
});
