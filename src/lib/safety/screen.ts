// Combines every deterministic screen for a free-text message:
//  • English rules on the original text
//  • Indian-language phrase lists on the original text
//  • English rules on an (optional) English translation of the message
// The decision itself is always rule-based; translation only widens coverage.

import { checkText, isMedicationChangeQuestion, type SafetyResult, type SafetyRuleId } from "./engine";
import { checkMultilingual, isMedicationChangeMultilingual } from "./multilingual";

export interface Screen {
  safety: SafetyResult;
  medChange: boolean;
}

export function screenMessage(original: string, english?: string | null): Screen {
  const rules = new Set<SafetyRuleId>([
    ...checkText(original).rules,
    ...checkMultilingual(original),
    ...(english ? checkText(english).rules : []),
  ]);
  const list = [...rules];
  const safety: SafetyResult = list.length
    ? { urgent: true, kind: list.every((r) => r === "self_harm") ? "crisis" : "medical", rules: list }
    : { urgent: false, kind: "none", rules: [] };
  const medChange =
    isMedicationChangeQuestion(original) || isMedicationChangeMultilingual(original) || Boolean(english && isMedicationChangeQuestion(english));
  return { safety, medChange };
}

/** Latin-only text with no vowels at all (e.g. "nvgfbhj") can't be a question in any supported language. */
export function looksLikeGibberish(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t || t.length > 40) return false;
  if (!/^[a-z\s.,?!]+$/.test(t)) return false;
  return t.split(/\s+/).every((w) => !/[aeiouy]/.test(w));
}
