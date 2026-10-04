// Route-handler helpers. Errors are converted to short machine codes; the
// browser maps them to friendly, localized messages. Technical details and
// medical data are never sent to the client or written to logs.

import { NextResponse } from "next/server";
import { getCtx, type Ctx } from "./auth/session";

export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "revoked"
  | "not_found"
  | "bad_request"
  | "needs_onboarding"
  | "ai_unavailable"
  | "upload_failed"
  | "file_too_big"
  | "file_type"
  | "generic";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    readonly field?: string,
  ) {
    super(code);
  }
}

export const bad = (field?: string) => new HttpError(400, "bad_request", field);
export const notFound = () => new HttpError(404, "not_found");

type Handler<P> = (req: Request, ctx: Ctx, params: P) => Promise<unknown>;

export function route<P = Record<string, never>>(fn: Handler<P>) {
  return async (req: Request, segment: { params: Promise<P> }) => {
    try {
      const ctx = await getCtx();
      const params = segment?.params ? await segment.params : ({} as P);
      const result = await fn(req, ctx, params);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.code, field: err.field }, { status: err.status });
      }
      console.error(`[caresense] ${req.method} ${new URL(req.url).pathname} failed: ${(err as Error)?.name ?? "Error"}`);
      return NextResponse.json({ error: "generic" }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw bad();
}
