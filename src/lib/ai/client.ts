// Server-only Anthropic client. The API key is read from the environment on
// the server and is never sent to the browser.

import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, aiModel } from "../config";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic | null {
  if (!aiConfigured()) return null;
  client ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return client;
}

/**
 * Shared request options. Server-side refusal fallbacks ("default" routing)
 * are enabled so a safety-classifier decline on the primary model is retried
 * on a fallback model inside the same call instead of failing outright.
 */
export function baseParams() {
  return {
    model: aiModel(),
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
  };
}

export class AiUnavailableError extends Error {}
