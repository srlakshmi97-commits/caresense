"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageKey } from "../i18n";

/** Error with a machine code from the server (never a raw technical message). */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly field?: string,
  ) {
    super(code);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new ApiError("offline", 0);
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "generic", 0);
  }
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) throw new ApiError(String(body.error ?? "generic"), res.status, body.field as string | undefined);
  return body as T;
}

/** Maps an error to a friendly, localized message key. */
export function errorKey(err: unknown): MessageKey {
  const code = err instanceof ApiError ? err.code : "generic";
  switch (code) {
    case "offline":
      return "errors.offline";
    case "unauthorized":
      return "errors.unauthorized";
    case "forbidden":
      return "errors.forbidden";
    case "revoked":
      return "errors.accessRevoked";
    case "not_found":
      return "errors.notFound";
    case "upload_failed":
      return "errors.uploadFailed";
    case "file_too_big":
      return "errors.fileTooBig";
    case "file_type":
      return "errors.fileType";
    case "ai_unavailable":
      return "errors.aiUnavailable";
    case "bad_request":
      return "errors.incomplete";
    default:
      return "errors.generic";
  }
}

/** GET with loading / error / reload state. Redirects to sign-in on 401. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const my = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const d = await api<T>(path);
      if (my === seq.current) setData(d);
    } catch (e) {
      if (my !== seq.current) return;
      if (e instanceof ApiError && e.code === "unauthorized") {
        window.location.href = "/";
        return;
      }
      if (e instanceof ApiError && e.code === "needs_onboarding") {
        window.location.href = "/onboarding";
        return;
      }
      setError(e);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
