"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/client";
import { LOCALES } from "@/lib/i18n";
import { api } from "@/lib/client/api";
import { ChoiceButton } from "./ChoiceButton";
import { Logo } from "./Brand";

export async function chooseLanguage(locale: string) {
  await api("/api/language", { method: "POST", json: { locale } });
  // Full reload so the server renders every page in the new language.
  window.location.reload();
}

/** Big, native-script language buttons. Used on first launch and in settings. */
export function LanguageOptions() {
  const { locale } = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div role="radiogroup" aria-label="Language" className="flex flex-col gap-3">
      {Object.entries(LOCALES).map(([code, l]) => (
        <ChoiceButton
          key={code}
          role="radio"
          selected={busy ? busy === code : locale === code}
          onClick={() => {
            setBusy(code);
            chooseLanguage(code).catch(() => setBusy(null));
          }}
          sub={code === "en" ? undefined : l.english}
          className="text-2xl"
        >
          <span lang={l.intl} className="text-2xl">
            {l.native}
          </span>
        </ChoiceButton>
      ))}
    </div>
  );
}

/** First screen of the app: choose a language before anything else. */
export function FirstLanguageScreen() {
  const t = useT();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-10">
      <div className="flex flex-col items-center text-center">
        <Logo size={64} />
        <h1 className="mt-4 flex items-center gap-2 text-3xl font-bold">
          <Globe className="h-8 w-8 text-brand" aria-hidden />
          {/* Shown in every language so anyone can recognise this screen */}
          <span>Language · மொழி · भाषा · భాష · ഭാഷ · ಭಾಷೆ</span>
        </h1>
        <p className="mt-2 text-lg text-muted">{t("language.title")}</p>
      </div>
      <div className="mt-8">
        <LanguageOptions />
      </div>
    </main>
  );
}
