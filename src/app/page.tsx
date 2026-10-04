"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/lib/i18n/client";
import { FirstLanguageScreen, LanguageOptions } from "@/components/LanguagePicker";
import { api } from "@/lib/client/api";
import { homeFor, type Me } from "@/lib/client/me";
import { Logo } from "@/components/Brand";
import { Loading } from "@/components/States";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Welcome() {
  const t = useT();
  const { chosen } = useLocale();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api<Me>("/api/me")
      .then((me) => {
        const home = homeFor(me);
        if (home) router.replace(home);
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) return <Loading />;
  if (!chosen) return <FirstLanguageScreen />;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <div className="flex flex-col items-center text-center">
        <Logo size={80} />
        <h1 className="mt-5 text-4xl font-bold leading-tight">{t("welcome.title")}</h1>
        <p className="mt-3 text-xl text-muted">{t("welcome.subtitle")}</p>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <Link href="/login?role=parent" className="flex min-h-[6rem] items-center gap-4 rounded-card border-2 border-brand bg-brand px-5 py-4 text-white shadow-card hover:bg-brand-deep">
          <span aria-hidden className="text-4xl">🧓</span>
          <span className="flex-1">
            <span className="block text-2xl font-bold">{t("welcome.parent")}</span>
            <span className="block text-lg text-white/90">{t("welcome.parentHint")}</span>
          </span>
          <ChevronRight className="h-8 w-8" aria-hidden />
        </Link>
        <Link href="/login?role=family" className="flex min-h-[6rem] items-center gap-4 rounded-card border-2 border-line bg-surface px-5 py-4 shadow-card hover:border-brand">
          <span aria-hidden className="text-4xl">👨‍👩‍👧</span>
          <span className="flex-1">
            <span className="block text-2xl font-bold">{t("welcome.family")}</span>
            <span className="block text-lg text-muted">{t("welcome.familyHint")}</span>
          </span>
          <ChevronRight className="h-8 w-8 text-muted" aria-hidden />
        </Link>
      </div>

      <p className="mt-10 text-center text-base text-muted">{t("app.notADoctor")}</p>

      <details className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <summary className="min-h-touch cursor-pointer text-lg font-semibold text-calm">🌐 {t("language.change")}</summary>
        <div className="mt-3">
          <LanguageOptions />
        </div>
      </details>
    </main>
  );
}
