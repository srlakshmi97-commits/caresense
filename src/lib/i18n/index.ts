import en, { type Messages } from "./en";
import ta from "./ta";
import hi from "./hi";
import te from "./te";
import ml from "./ml";
import kn from "./kn";
import es from "./es";

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

export interface LocaleInfo {
  /** Name written in the language itself (shown on the language picker). */
  native: string;
  /** English name, for support staff and screen readers. */
  english: string;
  /** BCP-47 tag for dates, numbers and speech recognition. */
  intl: string;
  messages: DeepPartial<Messages>;
}

/** Registered UI languages. To add one: create xx.ts mirroring en.ts, then add it here. */
export const LOCALES: Record<string, LocaleInfo> = {
  en: { native: "English", english: "English", intl: "en-IN", messages: en },
  ta: { native: "தமிழ்", english: "Tamil", intl: "ta-IN", messages: ta },
  hi: { native: "हिन्दी", english: "Hindi", intl: "hi-IN", messages: hi },
  te: { native: "తెలుగు", english: "Telugu", intl: "te-IN", messages: te },
  ml: { native: "മലയാളം", english: "Malayalam", intl: "ml-IN", messages: ml },
  kn: { native: "ಕನ್ನಡ", english: "Kannada", intl: "kn-IN", messages: kn },
  es: { native: "Español", english: "Spanish", intl: "es-US", messages: es },
};

export const AVAILABLE_LOCALES = Object.keys(LOCALES);
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "cs_lang";

export function normaliseLocale(v: unknown): string {
  return typeof v === "string" && v in LOCALES ? v : DEFAULT_LOCALE;
}

export const intlLocale = (locale: string) => LOCALES[locale]?.intl ?? "en-IN";

// Dotted key paths of the message tree, e.g. "home.logPain".
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<Messages>;

export type Vars = Record<string, string | number>;

function lookup(tree: unknown, key: string): string | undefined {
  let node: unknown = tree;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as object)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(locale: string, key: MessageKey, vars?: Vars): string {
  const messages = LOCALES[locale]?.messages;
  const raw = (messages && lookup(messages, key)) ?? lookup(en, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

/** Server-side helper for English fallback text (e.g. stored notification text). */
export const t = (key: MessageKey, vars?: Vars) => translate("en", key, vars);
/** Server-side helper bound to a locale. */
export const tFor = (locale: string) => (key: MessageKey, vars?: Vars) => translate(locale, key, vars);
