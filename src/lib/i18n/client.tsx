"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { intlLocale, translate, type MessageKey, type Vars } from "./index";
import { setFormatLocale } from "../client/format";

interface LocaleState {
  locale: string;
  /** false until the user has picked a language on the first screen. */
  chosen: boolean;
}

const LocaleContext = createContext<LocaleState>({ locale: "en", chosen: false });

export function I18nProvider({ locale, chosen, children }: { locale: string; chosen: boolean; children: ReactNode }) {
  // Dates and numbers follow the chosen language everywhere (see client/format.ts).
  setFormatLocale(intlLocale(locale));
  return <LocaleContext.Provider value={{ locale, chosen }}>{children}</LocaleContext.Provider>;
}

export function useT() {
  const { locale } = useContext(LocaleContext);
  return useCallback((key: MessageKey, vars?: Vars) => translate(locale, key, vars), [locale]);
}

export const useLocale = () => useContext(LocaleContext);
