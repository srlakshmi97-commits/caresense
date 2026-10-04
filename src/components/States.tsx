"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/client";
import { errorKey } from "@/lib/client/api";
import { Button } from "./Button";

export function Loading({ label }: { label?: string }) {
  const t = useT();
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-12 text-lg text-muted">
      <Loader2 className="h-7 w-7 animate-spin text-brand" aria-hidden />
      {label ?? t("common.loading")}
    </div>
  );
}

export function EmptyState({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-8 text-center">
      {icon && <span aria-hidden className="text-4xl">{icon}</span>}
      <p className="text-lg text-muted">{children}</p>
      {action}
    </div>
  );
}

/** Friendly error — never a technical message. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-card border-2 border-warn/40 bg-warn-soft p-5">
      <p className="flex items-start gap-3 text-lg text-ink">
        <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-warn" aria-hidden />
        {t(errorKey(error))}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} icon={<RefreshCw className="h-5 w-5" aria-hidden />}>
          {t("common.tryAgain")}
        </Button>
      )}
    </div>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 flex items-center gap-2 text-lg font-semibold text-urgent">
      <AlertCircle className="h-5 w-5" aria-hidden />
      {children}
    </p>
  );
}
