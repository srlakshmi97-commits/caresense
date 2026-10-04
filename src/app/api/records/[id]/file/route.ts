import { HttpError, route } from "@/lib/api";
import { loadRecordFor } from "@/lib/services/records";

// Streams the untouched original document to an authorised viewer.
export const GET = route<{ id: string }>(async (_req, ctx, { id }) => {
  const { record } = await loadRecordFor(ctx, id);
  const data = await ctx.files.get(record.file_path);
  if (!data) throw new HttpError(404, "not_found");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": record.mime_type,
      "Content-Disposition": `inline; filename="${record.file_name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
