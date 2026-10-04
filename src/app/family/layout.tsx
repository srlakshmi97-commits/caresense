"use client";

import { useT } from "@/lib/i18n/client";
import { BrandBar } from "@/components/Brand";
import { LanguageOptions } from "@/components/LanguagePicker";
import { SignOutButton } from "@/components/SignOutButton";

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <>
      <BrandBar
        href="/family"
        right={
          <div className="flex items-center gap-1">
            <details className="relative">
              <summary className="flex min-h-touch cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-base font-semibold text-muted hover:bg-canvas">
                🌐 {t("language.change")}
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-card border border-line bg-surface p-3 shadow-xl">
                <LanguageOptions />
              </div>
            </details>
            <SignOutButton />
          </div>
        }
      />
      {children}
    </>
  );
}
