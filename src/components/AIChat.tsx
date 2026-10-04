"use client";

import Link from "next/link";
import { AlertTriangle, BookOpen, FileText, HelpCircle, Send, Stethoscope, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { api, errorKey } from "@/lib/client/api";
import { timeZone } from "@/lib/client/format";
import type { AnswerSection, AskResult, SectionKind } from "@/lib/ai/companion";
import type { MessageKey } from "@/lib/i18n";
import { Button } from "./Button";
import { UrgentWarning } from "./UrgentWarning";
import { VoiceInput } from "./VoiceInput";

type Reply = AskResult & { familyNotified?: boolean };
type Msg = { id: number; role: "user"; text: string } | { id: number; role: "assistant"; reply: Reply | { type: "error"; key: MessageKey } };

const KIND_META: Record<SectionKind, { label: MessageKey; icon: typeof FileText; cls: string }> = {
  documented: { label: "ask.kindDocumented", icon: FileText, cls: "border-calm/40 bg-calm-soft" },
  reported: { label: "ask.kindReported", icon: User, cls: "border-brand/30 bg-brand-soft" },
  general: { label: "ask.kindGeneral", icon: BookOpen, cls: "border-line bg-canvas" },
  suggestion: { label: "ask.kindSuggestion", icon: Stethoscope, cls: "border-warn/30 bg-warn-soft" },
};

/** Plain-text rendering of a reply, used as conversation history for follow-ups. */
function replyText(r: Msg): string {
  if (r.role === "user") return r.text;
  const rep = r.reply;
  if (rep.type === "answer") return rep.insufficient ? "I don't have enough information to answer that safely." : rep.sections.map((s) => s.text).join(" ");
  if (rep.type === "med_guard") return "Please ask your prescribing doctor before changing any medicine.";
  if (rep.type === "urgent") return "Your symptoms may need urgent medical attention.";
  if (rep.type === "not_understood") return "";
  return "";
}

function Section({ s }: { s: AnswerSection }) {
  const t = useT();
  const m = KIND_META[s.kind];
  return (
    <div className={`rounded-2xl border-2 p-4 ${m.cls}`}>
      <p className="flex items-center gap-2 text-base font-bold uppercase tracking-wide text-muted">
        <m.icon className="h-5 w-5" aria-hidden />
        {t(m.label)}
      </p>
      <p className="mt-1 text-lg">{s.text}</p>
      {s.kind === "documented" && s.record_id && (
        <p className="mt-2 text-base">
          <Link href={`/parent/records/${s.record_id}`} className="font-semibold text-calm underline underline-offset-4">
            {t("ask.source", { title: s.record_title ?? "" })}
          </Link>
          {s.quote && <span className="mt-1 block italic text-muted">“{s.quote}”</span>}
        </p>
      )}
    </div>
  );
}

export function AIChat({ initialQuestion }: { initialQuestion?: string }) {
  const t = useT();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [urgent, setUrgent] = useState<{ rules: string[]; kind: "medical" | "crisis"; familyNotified: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const asked = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const history = msgs.map((m) => ({ role: m.role, text: replyText(m) })).filter((h) => h.text);
    setMsgs((m) => [...m, { id: ++seq.current, role: "user", text: question }]);
    setText("");
    setBusy(true);
    try {
      const reply = await api<Reply>("/api/ask", { method: "POST", json: { question, history, tz: timeZone() } });
      if (reply.type === "urgent") setUrgent({ rules: reply.rules, kind: reply.kind, familyNotified: Boolean(reply.familyNotified) });
      setMsgs((m) => [...m, { id: ++seq.current, role: "assistant", reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { id: ++seq.current, role: "assistant", reply: { type: "error", key: errorKey(e) } }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const suggestions: MessageKey[] = ["ask.s1", "ask.s2", "ask.s3", "ask.s4", "ask.s5", "ask.s6"];

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl bg-calm-soft p-4 text-lg">{t("ask.intro")}</p>

      {msgs.length === 0 && (
        <section aria-labelledby="sugg">
          <h2 id="sugg" className="mb-2 text-lg font-bold">
            {t("ask.suggestionsTitle")}
          </h2>
          <div className="flex flex-col gap-2">
            {suggestions.map((k) => (
              <button key={k} type="button" onClick={() => ask(t(k))} className="min-h-touch rounded-2xl border-2 border-line bg-surface px-4 py-3 text-left text-lg font-semibold hover:border-brand">
                {t(k)}
              </button>
            ))}
          </div>
        </section>
      )}

      <div aria-live="polite" className="flex flex-col gap-4">
        {msgs.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-8 self-end rounded-2xl rounded-br-md bg-brand px-4 py-3 text-lg text-white">
              <span className="sr-only">{t("ask.you")}: </span>
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="mr-4 flex flex-col gap-3">
              <span className="sr-only">{t("ask.caresense")}:</span>
              {m.reply.type === "urgent" && (
                <div role="alert" className="rounded-2xl border-2 border-urgent bg-urgent-soft p-4">
                  <p className="flex items-center gap-2 text-xl font-bold text-urgent">
                    <AlertTriangle className="h-6 w-6" aria-hidden />
                    {m.reply.kind === "crisis" ? t("safety.crisisTitle") : t("safety.urgentTitle")}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{m.reply.kind === "crisis" ? t("safety.crisisBody") : t("safety.urgentBody")}</p>
                  <Button variant="urgent" className="mt-3" onClick={() => setUrgent({ rules: (m.reply as { rules: string[] }).rules, kind: (m.reply as { kind: "medical" | "crisis" }).kind, familyNotified: false })}>
                    {t("safety.showCallOptions")}
                  </Button>
                </div>
              )}
              {m.reply.type === "med_guard" && (
                <div className="rounded-2xl border-2 border-warn/40 bg-warn-soft p-4">
                  <p className="flex items-center gap-2 text-xl font-bold">
                    <Stethoscope className="h-6 w-6 text-warn" aria-hidden />
                    {t("ask.medGuardTitle")}
                  </p>
                  <p className="mt-1 text-lg">{t("meds.safetyNote")}</p>
                  {m.reply.prescribers.length > 0 && (
                    <p className="mt-2 text-lg">{m.reply.prescribers.map((p) => t("meds.prescribedBy", { name: p })).join(" · ")}</p>
                  )}
                </div>
              )}
              {m.reply.type === "answer" &&
                (m.reply.insufficient ? (
                  <div className="flex items-start gap-3 rounded-2xl border-2 border-line bg-surface p-4 text-lg">
                    <HelpCircle className="mt-0.5 h-6 w-6 shrink-0 text-muted" aria-hidden />
                    {t("ask.insufficient")}
                  </div>
                ) : (
                  <>
                    {m.reply.sections.map((s, i) => (
                      <Section key={i} s={s} />
                    ))}
                    {m.reply.escalate && (
                      <p className="rounded-2xl border-2 border-warn/40 bg-warn-soft p-4 text-lg font-semibold">{t("safety.urgentBody")}</p>
                    )}
                  </>
                ))}
              {m.reply.type === "not_understood" && <p className="rounded-2xl border-2 border-line bg-surface p-4 text-lg">{t("ask.notUnderstood")}</p>}
              {m.reply.type === "unavailable" && <p className="rounded-2xl border-2 border-warn/40 bg-warn-soft p-4 text-lg">{t("errors.aiUnavailable")}</p>}
              {m.reply.type === "error" && <p className="rounded-2xl border-2 border-warn/40 bg-warn-soft p-4 text-lg">{t(m.reply.key)}</p>}
            </div>
          ),
        )}
        {busy && (
          <p role="status" className="text-lg text-muted">
            {t("ask.thinking")}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
        className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-canvas px-4 pb-4 pt-3"
      >
        <label htmlFor="ask-input" className="sr-only">
          {t("ask.placeholder")}
        </label>
        <div className="flex gap-2">
          <textarea
            id="ask-input"
            rows={2}
            value={text}
            maxLength={2000}
            placeholder={t("ask.placeholder")}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(text);
              }
            }}
            className="field min-h-[3.5rem] flex-1 resize-none"
          />
          <VoiceInput compact onText={(spoken) => setText((cur) => (cur ? `${cur} ${spoken}` : spoken))} />
          <Button type="submit" size="lg" disabled={!text.trim()} loading={busy} icon={<Send className="h-6 w-6" aria-hidden />}>
            {t("ask.send")}
          </Button>
        </div>
        <p className="text-base text-muted">{t("ask.disclaimer")}</p>
      </form>

      <UrgentWarning open={Boolean(urgent)} rules={urgent?.rules ?? []} kind={urgent?.kind} familyNotified={urgent?.familyNotified} onClose={() => setUrgent(null)} />
    </div>
  );
}
