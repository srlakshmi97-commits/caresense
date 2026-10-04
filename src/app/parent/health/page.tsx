"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Pencil } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api, useApi } from "@/lib/client/api";
import { ageFrom, type Patient } from "@/lib/types";
import { fmtDay } from "@/lib/client/format";
import { LanguageOptions } from "@/components/LanguagePicker";
import { Button, ButtonLink } from "@/components/Button";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { LargeActionCard } from "@/components/LargeActionCard";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, Loading } from "@/components/States";

export default function MyHealth() {
  const t = useT();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ patient: Patient }>("/api/patient");
  const [signingOut, setSigningOut] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data) return <main className="page"><ErrorState error={error} onRetry={reload} /></main>;
  const p = data.patient;

  return (
    <main className="page">
      <PageHeader title={t("health.title")} />

      <div className="flex flex-col gap-3">
        <LargeActionCard href="/parent/timeline" emoji="🗓" label={t("health.timelineLink")} compact tone="brand" />
        <LargeActionCard href="/parent/pain" emoji="😣" label={t("health.painLink")} compact />
        <LargeActionCard href="/parent/ask" emoji="💬" label={t("health.askLink")} compact tone="calm" />
        <LargeActionCard href="/parent/privacy" emoji="🔒" label={t("health.privacyLink")} compact />
      </div>

      <section aria-labelledby="about" className="card mt-6 p-5">
        <h2 id="about" className="text-xl font-bold">{t("health.aboutMe")}</h2>
        <p className="mt-2 text-lg">
          {[
            p.name,
            ageFrom(p.date_of_birth) != null ? t("health.age", { age: ageFrom(p.date_of_birth)! }) : null,
            p.sex ? t(`sexes.${p.sex}`) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {p.date_of_birth && <p className="text-base text-muted">{t("health.born", { date: fmtDay(p.date_of_birth, { withYear: true }) })}</p>}
        {(
          [
            ["health.conditions", p.conditions],
            ["health.pastHistory", p.past_history ?? []],
            ["health.allergies", p.allergies],
          ] as const
        ).map(([label, items]) => (
          <div key={label}>
            <h2 className="mt-5 text-xl font-bold">{t(label)}</h2>
            {items.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-6 text-lg">
                {items.map((c) => <li key={c}>{c}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-lg text-muted">{t("health.noneRecorded")}</p>
            )}
          </div>
        ))}
        <ButtonLink href="/parent/profile" variant="secondary" className="mt-5" icon={<Pencil className="h-5 w-5" aria-hidden />}>
          {t("health.editProfile")}
        </ButtonLink>
      </section>

      <section aria-labelledby="lang" className="card mt-6 p-5">
        <h2 id="lang" className="mb-3 text-xl font-bold">🌐 {t("language.change")}</h2>
        <LanguageOptions />
      </section>

      <p className="mt-6 text-base text-muted">{t("app.notADoctor")}</p>
      <Button variant="ghost" className="mt-4" onClick={() => setSigningOut(true)} icon={<LogOut className="h-5 w-5" aria-hidden />}>
        {t("common.signOut")}
      </Button>
      <ConfirmationModal
        open={signingOut}
        title={`${t("common.signOut")}?`}
        confirmLabel={t("common.signOut")}
        onCancel={() => setSigningOut(false)}
        onConfirm={async () => {
          await api("/api/auth/logout", { method: "POST" }).catch(() => {});
          router.replace("/");
        }}
      />
    </main>
  );
}
