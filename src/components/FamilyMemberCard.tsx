"use client";

import { Phone, ShieldOff, UserRound } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { api } from "@/lib/client/api";
import { ALERT_KEYS, PERMISSION_KEYS, type FamilyLink } from "@/lib/types";
import { Button } from "./Button";
import { ConfirmationModal } from "./ConfirmationModal";
import { ErrorState } from "./States";
import { Toggle } from "./Toggle";
import { useToast } from "./Toast";

/** Parent's control panel for one family member: status, what they see, alerts, revoke. */
export function FamilyMemberCard({ link, onChange }: { link: FamilyLink; onChange: (l: FamilyLink) => void }) {
  const t = useT();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const name = link.family_name;

  const patch = async (body: object) => {
    setError(null);
    try {
      const { link: updated } = await api<{ link: FamilyLink }>(`/api/family/links/${link.id}`, { method: "PATCH", json: body });
      onChange(updated);
      toast(t("privacy.settingsSaved"));
    } catch (e) {
      setError(e);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      const { link: updated } = await api<{ link: FamilyLink }>(`/api/family/links/${link.id}`, { method: "DELETE" });
      onChange(updated);
      toast(t("privacy.revokedDone", { name }));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  const status =
    link.status === "active" ? t("privacy.active") : link.status === "pending" ? t("privacy.pending", { name }) : t("privacy.revoked");

  return (
    <article className="card p-5" aria-labelledby={`fm-${link.id}`}>
      <div className="flex items-start gap-3">
        <UserRound className="mt-1 h-8 w-8 shrink-0 text-brand" aria-hidden />
        <div className="flex-1">
          <h3 id={`fm-${link.id}`} className="text-2xl font-bold">
            {name}
          </h3>
          {link.relationship && <p className="text-lg text-muted">{link.relationship}</p>}
          <p className={`mt-1 text-lg font-semibold ${link.status === "revoked" ? "text-urgent" : link.status === "active" ? "text-ok" : "text-warn"}`}>
            {link.status === "active" ? "✓ " : link.status === "revoked" ? "✕ " : "… "}
            {status}
          </p>
          {link.family_phone && (
            <a href={`tel:${link.family_phone.replace(/[^+\d]/g, "")}`} className="mt-1 inline-flex min-h-touch items-center gap-2 text-lg font-semibold text-calm underline underline-offset-4">
              <Phone className="h-5 w-5" aria-hidden />
              {link.family_phone}
            </a>
          )}
        </div>
      </div>

      {link.status === "pending" && (
        <div className="mt-4 rounded-2xl bg-calm-soft p-4">
          <p className="text-lg font-semibold">{t("privacy.inviteCode")}</p>
          <p className="my-1 font-mono text-4xl font-bold tracking-[0.3em]" aria-label={link.invite_code.split("").join(" ")}>
            {link.invite_code}
          </p>
          <p className="text-lg">{t("privacy.inviteInstructions", { name })}</p>
        </div>
      )}

      {link.status !== "revoked" && (
        <>
          <fieldset className="mt-5">
            <legend className="mb-1 text-xl font-bold">{t("privacy.whatCanSee", { name })}</legend>
            <div className="divide-y divide-line">
              {PERMISSION_KEYS.map((k) => (
                <Toggle key={k} label={t(`privacy.permissions.${k}`)} checked={link.permissions[k]} onChange={(v) => patch({ permissions: { [k]: v } })} />
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-5">
            <legend className="mb-1 text-xl font-bold">{t("privacy.notifyTitle", { name })}</legend>
            <div className="divide-y divide-line">
              {ALERT_KEYS.map((k) => (
                <Toggle key={k} label={t(`privacy.alertPrefs.${k}`)} checked={link.alert_prefs[k]} onChange={(v) => patch({ alert_prefs: { [k]: v } })} />
              ))}
            </div>
          </fieldset>
          {error ? <div className="mt-4"><ErrorState error={error} /></div> : null}
          <Button variant="danger" full className="mt-5" onClick={() => setConfirm(true)} icon={<ShieldOff className="h-5 w-5" aria-hidden />}>
            {t("privacy.revoke")}
          </Button>
        </>
      )}

      <ConfirmationModal
        open={confirm}
        title={t("privacy.revokeConfirmTitle", { name })}
        confirmLabel={t("privacy.revoke")}
        onConfirm={revoke}
        onCancel={() => setConfirm(false)}
        danger
        loading={busy}
      >
        {t("privacy.revokeConfirmBody", { name })}
      </ConfirmationModal>
    </article>
  );
}
