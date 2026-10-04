"use client";

import { AlertTriangle, Phone, Siren } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { api } from "@/lib/client/api";
import type { MessageKey } from "@/lib/i18n";
import { Button } from "./Button";

interface Contacts {
  emergency_number: string;
  emergency_contact: { name: string; phone: string } | null;
  family: { name: string; relationship: string; phone: string }[];
}

/**
 * Full-screen urgent-care warning from the deterministic safety engine.
 * Shown INSTEAD of (never after) any conversational answer.
 */
export function UrgentWarning({
  open,
  rules,
  kind = "medical",
  familyNotified = false,
  onClose,
}: {
  open: boolean;
  rules: string[];
  kind?: "medical" | "crisis";
  familyNotified?: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [contacts, setContacts] = useState<Contacts | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (open && !contacts) {
      api<Contacts>("/api/contacts")
        .then(setContacts)
        .catch(() => setContacts({ emergency_number: "112", emergency_contact: null, family: [] }));
    }
  }, [open, contacts]);

  const people = contacts
    ? [
        ...(contacts.emergency_contact ? [contacts.emergency_contact] : []),
        ...contacts.family.filter((f) => f.phone !== contacts.emergency_contact?.phone),
      ]
    : [];

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby="urgent-title"
      aria-describedby="urgent-body"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-0 h-full max-h-none w-full max-w-none bg-urgent-soft p-0 text-ink backdrop:bg-ink/60 sm:m-auto sm:h-auto sm:max-h-[95vh] sm:w-[min(94vw,36rem)] sm:rounded-card"
    >
      <div className="flex min-h-full flex-col gap-5 p-6">
        <div className="flex items-center gap-3 text-urgent">
          <AlertTriangle className="h-10 w-10 shrink-0" aria-hidden />
          <h2 id="urgent-title" className="text-2xl font-bold leading-tight">
            {kind === "crisis" ? t("safety.crisisTitle") : t("safety.urgentTitle")}
          </h2>
        </div>
        <p id="urgent-body" className="text-xl font-semibold">
          {kind === "crisis" ? t("safety.crisisBody") : t("safety.urgentBody")}
        </p>

        <div className="flex flex-col gap-3">
          <a
            href={`tel:${contacts?.emergency_number ?? "112"}`}
            className="flex min-h-action items-center justify-center gap-3 rounded-2xl bg-urgent px-5 py-4 text-xl font-bold text-white hover:bg-urgent/90"
          >
            <Siren className="h-7 w-7" aria-hidden />
            {t("safety.callEmergency", { number: contacts?.emergency_number ?? "112" })}
          </a>
          {people.map((p) => (
            <a
              key={p.phone}
              href={`tel:${p.phone.replace(/[^+\d]/g, "")}`}
              className="flex min-h-action items-center justify-center gap-3 rounded-2xl border-[3px] border-urgent bg-surface px-5 py-4 text-xl font-bold text-urgent hover:bg-urgent-soft"
            >
              <Phone className="h-6 w-6" aria-hidden />
              {t("safety.callFamily", { name: p.name })}
            </a>
          ))}
        </div>

        {familyNotified && <p className="rounded-xl bg-surface p-3 text-lg">✓ {t("safety.familyNotified")}</p>}

        {rules.length > 0 && kind === "medical" && (
          <div className="rounded-xl bg-surface p-4">
            <h3 className="text-lg font-bold">{t("safety.whyTitle")}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-lg">
              {rules.map((r) => (
                <li key={r}>{t(`safety.rules.${r}` as MessageKey)}</li>
              ))}
            </ul>
            <p className="mt-3 text-base text-muted">{t("safety.notDiagnosis")}</p>
          </div>
        )}

        <Button variant="secondary" size="lg" onClick={onClose} full className="mt-auto">
          {t("safety.iUnderstand")}
        </Button>
      </div>
    </dialog>
  );
}
