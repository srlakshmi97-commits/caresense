import { route } from "@/lib/api";
import { auditRecordView, loadRecordFor } from "@/lib/services/records";

export const GET = route<{ id: string }>(async (_req, ctx, { id }) => {
  const { record, viewer } = await loadRecordFor(ctx, id);
  const [extraction] = await ctx.store.list("record_extractions", { record_id: record.id });
  await auditRecordView(ctx, record, viewer);
  return { record, extraction: extraction ?? null, viewer };
});
