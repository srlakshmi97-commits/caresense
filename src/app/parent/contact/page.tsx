"use client";

import Link from "next/link";
import { Phone, Siren } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { useApi } from "@/lib/client/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, Loading } from "@/components/States";

interface Contacts {
  emergency_number: string;
  emergency_contact: { name: string; phone: string } | null;
  family: { name: string; relationship: string; phone: string }[];
}

const tel = (p: string) => `tel:${p.replace(/[^+\d]/g, "")}`;

export default function ContactFamily() {
  const t = useT();
  const { data, error, loading, reload } = useApi<Contacts>("/api/contacts");
  if (loading && !data) return <Loading />;
  if (error || !data) return <main className="page"><ErrorState error={error} onRetry={reload} /></main>;

  const people = [
    ...data.family.map((f) => ({ name: f.name, sub: f.relationship, phone: f.phone })),
    ...(data.emergency_contact && !data.family.some((f) => f.phone === data.emergency_contact!.phone)
      ? [{ name: data.emergency_contact.name, sub: t("contact.emergencyContact"), phone: data.emergency_contact.phone }]
      : []),
  ];

  return (
    <main className="page">
      <PageHeader title={t("contact.title")} subtitle={t("contact.intro")} />
      <div className="flex flex-col gap-3">
        {people.length === 0 ? (
          <EmptyState icon="📞" action={<Link href="/parent/privacy" className="text-lg font-semibold text-calm underline">{t("health.privacyLink")}</Link>}>
            {t("contact.noContacts")}
          </EmptyState>
        ) : (
          people.map((p) => (
            <a key={p.phone + p.name} href={tel(p.phone)} className="flex min-h-[6rem] items-center gap-4 rounded-card border-2 border-brand/30 bg-brand-soft p-4 shadow-card hover:border-brand">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <Phone className="h-7 w-7" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-2xl font-bold">{t("common.call", { name: p.name })}</span>
                <span className="block text-lg text-muted">{p.sub} · {p.phone}</span>
              </span>
            </a>
          ))
        )}
        <a href={tel(data.emergency_number)} className="mt-4 flex min-h-action items-center gap-4 rounded-card border-2 border-urgent/40 bg-urgent-soft p-4 hover:border-urgent">
          <Siren className="h-8 w-8 shrink-0 text-urgent" aria-hidden />
          <span>
            <span className="block text-xl font-bold text-urgent">{t("contact.emergencyServices")}</span>
            <span className="block text-lg">{t("safety.callEmergency", { number: data.emergency_number })}</span>
          </span>
        </a>
      </div>
    </main>
  );
}
