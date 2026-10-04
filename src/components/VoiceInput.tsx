"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n";

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib).
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * "Speak" button: listens in the user's chosen language (ta-IN, hi-IN …) and
 * hands back the words. Hidden on browsers without speech recognition — the
 * phone keyboard's own microphone still works there.
 */
export function VoiceInput({ onText, compact = false }: { onText: (text: string) => void; compact?: boolean }) {
  const t = useT();
  const { locale } = useLocale();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => setSupported(Boolean(getCtor())), []);
  useEffect(() => () => rec.current?.stop(), []);

  if (!supported) return null;

  const start = () => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = intlLocale(locale);
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((res) => res[0]?.transcript ?? "").join(" ").trim();
      if (text) onText(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  return (
    <button
      type="button"
      onClick={() => (listening ? rec.current?.stop() : start())}
      aria-pressed={listening}
      className={`inline-flex min-h-touch shrink-0 items-center justify-center gap-2 rounded-2xl border-2 px-4 text-lg font-bold ${
        listening ? "border-urgent bg-urgent-soft text-urgent" : "border-calm/40 bg-calm-soft text-calm hover:border-calm"
      }`}
    >
      {listening ? <Square className="h-5 w-5" aria-hidden /> : <Mic className="h-6 w-6" aria-hidden />}
      {!compact && (listening ? t("voice.stop") : t("voice.speak"))}
      {compact && <span className="sr-only">{listening ? t("voice.stop") : t("voice.speak")}</span>}
      <span className="sr-only" aria-live="polite">
        {listening ? t("voice.listening") : ""}
      </span>
    </button>
  );
}
