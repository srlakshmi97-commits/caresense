"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api } from "@/lib/client/api";
import { ConfirmationModal } from "./ConfirmationModal";

/** Header sign-out (to switch profile). Asks first, so an accidental tap does nothing. */
export function SignOutButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-touch items-center gap-2 rounded-xl px-3 text-base font-semibold text-muted hover:bg-canvas"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        {t("common.signOut")}
      </button>
      <ConfirmationModal
        open={open}
        title={`${t("common.signOut")}?`}
        confirmLabel={t("common.signOut")}
        loading={busy}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          await api("/api/auth/logout", { method: "POST" }).catch(() => {});
          // Full reload so no previous person's data stays in memory.
          window.location.href = "/";
        }}
      />
    </>
  );
}
