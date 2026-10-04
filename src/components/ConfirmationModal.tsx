"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "@/lib/i18n/client";
import { Button } from "./Button";

/** Accessible confirmation dialog (native <dialog>: focus trap + Esc to close). */
export function ConfirmationModal({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-title"
      className="w-[min(92vw,32rem)] rounded-card border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/50"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-2xl font-bold">
          {title}
        </h2>
        {children && <div className="mt-3 text-lg text-muted">{children}</div>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <Button variant={danger ? "urgent" : "primary"} onClick={onConfirm} loading={loading} full>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel} full>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
