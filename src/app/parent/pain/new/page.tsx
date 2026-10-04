"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api } from "@/lib/client/api";
import { fmtDuration, fromLocalInput, toLocalInput } from "@/lib/client/format";
import { regionOfMuscleId } from "@/lib/body/muscles";
import { PAIN_TRIGGERS, SYMPTOMS, type PainEpisode, type PainTrigger, type SeverityLevel, type Symptom } from "@/lib/types";
import type { SafetyResult } from "@/lib/safety/engine";
import { Button } from "@/components/Button";
import { ChoiceButton } from "@/components/ChoiceButton";
import { PageHeader } from "@/components/PageHeader";
import { MuscleMap, type PainPlaces } from "@/components/MuscleMap";
import { PainSeveritySelector } from "@/components/PainSeveritySelector";
import { ErrorState, InlineError, Loading } from "@/components/States";
import { SymptomSelector } from "@/components/SymptomSelector";
import { useToast } from "@/components/Toast";
import { UrgentWarning } from "@/components/UrgentWarning";

const STEPS = ["where", "severity", "when", "still", "trigger", "symptoms"] as const;
type Step = (typeof STEPS)[number];

function PainFlow() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const editId = useSearchParams().get("id");

  const [loaded, setLoaded] = useState(!editId);
  const [step, setStep] = useState<Step>("where");
  const [places, setPlaces] = useState<PainPlaces>({ muscles: [], regions: [] });
  const [otherLocation, setOtherLocation] = useState("");
  const [severity, setSeverity] = useState<SeverityLevel | null>(null);
  const [startMode, setStartMode] = useState<"now" | "pick">("now");
  const [startNow] = useState(() => new Date());
  const [startPick, setStartPick] = useState(() => toLocalInput(new Date()));
  const [ongoing, setOngoing] = useState<boolean | null>(null);
  const [endMode, setEndMode] = useState<"now" | "pick">("now");
  const [endPick, setEndPick] = useState(() => toLocalInput(new Date()));
  const [triggers, setTriggers] = useState<PainTrigger[]>([]);
  const [triggerOther, setTriggerOther] = useState("");
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [notes, setNotes] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [urgent, setUrgent] = useState<{ rules: string[]; familyNotified: boolean } | null>(null);

  useEffect(() => {
    if (!editId) return;
    api<{ episode: PainEpisode }>(`/api/pain/${editId}`)
      .then(({ episode: e }) => {
        const muscles = e.muscles ?? [];
        setPlaces({ muscles, regions: e.locations.filter((l) => !muscles.some((m) => regionOfMuscleId(m) === l)) });
        setOtherLocation(e.other_location ?? "");
        setSeverity(e.severity_level);
        setStartMode("pick");
        setStartPick(toLocalInput(new Date(e.started_at)));
        setOngoing(e.ongoing);
        if (e.ended_at) {
          setEndMode("pick");
          setEndPick(toLocalInput(new Date(e.ended_at)));
        }
        setTriggers(e.triggers);
        setTriggerOther(e.trigger_other ?? "");
        setSymptoms(e.symptoms);
        setNotes(e.notes ?? "");
        setLoaded(true);
      })
      .catch((e) => {
        setError(e);
        setLoaded(true);
      });
  }, [editId]);

  const startDate = startMode === "now" ? startNow : fromLocalInput(startPick);
  const endDate = useMemo(() => (endMode === "now" ? new Date() : fromLocalInput(endPick)), [endMode, endPick]);
  const idx = STEPS.indexOf(step);

  const validate = (): boolean => {
    setProblem(null);
    if (step === "where" && places.muscles.length + places.regions.length === 0) return setProblem(t("pain.selectOne")), false;
    if (step === "severity" && !severity) return setProblem(t("pain.chooseSeverity")), false;
    if (step === "when" && !startDate) return setProblem(t("errors.incomplete")), false;
    if (step === "still") {
      if (ongoing === null) return setProblem(t("errors.incomplete")), false;
      if (!ongoing && (!endDate || !startDate || endDate < startDate)) return setProblem(t("pain.endBeforeStart")), false;
    }
    return true;
  };
  const next = () => {
    if (!validate()) return;
    setStep(STEPS[idx + 1]);
    window.scrollTo(0, 0);
  };
  const back = () => {
    setProblem(null);
    if (idx === 0) router.back();
    else setStep(STEPS[idx - 1]);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        locations: places.regions,
        muscles: places.muscles,
        other_location: otherLocation,
        severity_level: severity,
        started_at: startDate?.toISOString(),
        ongoing: Boolean(ongoing),
        ended_at: ongoing ? null : (endMode === "now" ? new Date() : endDate)?.toISOString(),
        triggers,
        trigger_other: triggerOther,
        symptoms,
        notes,
      };
      const res = await api<{ episode: PainEpisode; safety: SafetyResult; familyNotified: boolean }>(editId ? `/api/pain/${editId}` : "/api/pain", {
        method: editId ? "PATCH" : "POST",
        json: body,
      });
      if (res.safety.urgent) {
        // Safety first: the urgent screen appears before anything else.
        setUrgent({ rules: res.safety.rules, familyNotified: res.familyNotified });
      } else {
        toast(t("pain.savedTitle"));
        router.push(editId ? "/parent/pain" : "/parent");
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <Loading />;

  return (
    <main className="page">
      <PageHeader title={editId ? t("pain.editTitle") : t("pain.title")} back={editId ? "/parent/pain" : "/parent"} />
      <p className="text-lg font-semibold text-muted">{t("common.step", { n: idx + 1, total: STEPS.length })}</p>
      <div className="mb-6 mt-2 h-3 w-full overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} />
      </div>

      {step === "where" && (
        <section aria-labelledby="q">
          <h2 id="q" className="text-2xl font-bold">{t("pain.whereQ")}</h2>
          <MuscleMap value={places} onChange={setPlaces} />
          {places.regions.includes("other") && (
            <input className="field mt-3" aria-label={t("pain.otherPlaceholder")} placeholder={t("pain.otherPlaceholder")} value={otherLocation} maxLength={120} onChange={(e) => setOtherLocation(e.target.value)} />
          )}
        </section>
      )}

      {step === "severity" && (
        <section aria-labelledby="q">
          <h2 id="q" className="mb-4 text-2xl font-bold">{t("pain.howBadQ")}</h2>
          <PainSeveritySelector value={severity} onChange={setSeverity} />
        </section>
      )}

      {step === "when" && (
        <section aria-labelledby="q" className="flex flex-col gap-3">
          <h2 id="q" className="mb-1 text-2xl font-bold">{t("pain.whenQ")}</h2>
          <div role="radiogroup" className="flex flex-col gap-3">
            <ChoiceButton role="radio" selected={startMode === "now"} onClick={() => setStartMode("now")} emoji="⏱">
              {t("pain.startedNow")}
            </ChoiceButton>
            <ChoiceButton role="radio" selected={startMode === "pick"} onClick={() => setStartMode("pick")} emoji="🕘">
              {t("pain.pickTime")}
            </ChoiceButton>
          </div>
          {startMode === "pick" && (
            <div>
              <label htmlFor="start" className="label">{t("pain.startedAt")}</label>
              <input id="start" type="datetime-local" className="field" value={startPick} max={toLocalInput(new Date())} onChange={(e) => setStartPick(e.target.value)} />
            </div>
          )}
        </section>
      )}

      {step === "still" && (
        <section aria-labelledby="q" className="flex flex-col gap-3">
          <h2 id="q" className="mb-1 text-2xl font-bold">{t("pain.stillQ")}</h2>
          <div role="radiogroup" className="grid grid-cols-2 gap-3">
            <ChoiceButton role="radio" selected={ongoing === true} onClick={() => setOngoing(true)}>
              {t("common.yes")}
            </ChoiceButton>
            <ChoiceButton role="radio" selected={ongoing === false} onClick={() => setOngoing(false)}>
              {t("common.no")}
            </ChoiceButton>
          </div>
          {ongoing === false && (
            <div className="mt-3 flex flex-col gap-3">
              <h3 className="text-xl font-bold">{t("pain.endedQ")}</h3>
              <div role="radiogroup" className="flex flex-col gap-3">
                <ChoiceButton role="radio" selected={endMode === "now"} onClick={() => setEndMode("now")} emoji="⏱">
                  {t("pain.endedNow")}
                </ChoiceButton>
                <ChoiceButton role="radio" selected={endMode === "pick"} onClick={() => setEndMode("pick")} emoji="🕘">
                  {t("pain.pickTime")}
                </ChoiceButton>
              </div>
              {endMode === "pick" && (
                <input type="datetime-local" aria-label={t("pain.endedQ")} className="field" value={endPick} max={toLocalInput(new Date())} onChange={(e) => setEndPick(e.target.value)} />
              )}
              {startDate && endDate && endDate >= startDate && (
                <p className="rounded-2xl bg-brand-soft p-4 text-xl font-bold">{t("pain.duration", { duration: fmtDuration(endDate.getTime() - startDate.getTime()) })}</p>
              )}
            </div>
          )}
        </section>
      )}

      {step === "trigger" && (
        <section aria-labelledby="q" className="flex flex-col gap-3">
          <h2 id="q" className="mb-1 text-2xl font-bold">{t("pain.triggerQ")}</h2>
          <SymptomSelector options={PAIN_TRIGGERS} value={triggers} onChange={setTriggers} labelPrefix="triggers" exclusive="nothing" label={t("pain.triggerQ")} />
          {triggers.includes("other") && (
            <input className="field" aria-label={t("pain.triggerOtherPlaceholder")} placeholder={t("pain.triggerOtherPlaceholder")} value={triggerOther} maxLength={200} onChange={(e) => setTriggerOther(e.target.value)} />
          )}
        </section>
      )}

      {step === "symptoms" && (
        <section aria-labelledby="q" className="flex flex-col gap-3">
          <h2 id="q" className="mb-1 text-2xl font-bold">{t("pain.symptomsQ")}</h2>
          <SymptomSelector options={SYMPTOMS} value={symptoms} onChange={setSymptoms} labelPrefix="symptoms" exclusive="none" label={t("pain.symptomsQ")} />
          <label htmlFor="notes" className="label mt-3">{t("pain.notesLabel")}</label>
          <textarea id="notes" rows={2} className="field" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
        </section>
      )}

      {problem && <InlineError>{problem}</InlineError>}
      {error ? <div className="mt-4"><ErrorState error={error} /></div> : null}

      <div className="sticky bottom-0 -mx-4 mt-6 flex gap-3 border-t border-line bg-canvas px-4 py-4">
        <Button variant="secondary" size="lg" onClick={back} icon={<ArrowLeft className="h-6 w-6" aria-hidden />}>
          {t("common.back")}
        </Button>
        {step === "symptoms" ? (
          <Button size="lg" full loading={busy} loadingText={t("common.saving")} onClick={save} icon={<Check className="h-6 w-6" aria-hidden />}>
            {t("pain.saveEntry")}
          </Button>
        ) : (
          <Button size="lg" full onClick={next} icon={<ArrowRight className="h-6 w-6" aria-hidden />}>
            {t("common.next")}
          </Button>
        )}
      </div>

      <UrgentWarning
        open={Boolean(urgent)}
        rules={urgent?.rules ?? []}
        familyNotified={urgent?.familyNotified}
        onClose={() => {
          setUrgent(null);
          toast(t("pain.savedTitle"));
          router.push("/parent/pain");
        }}
      />
    </main>
  );
}

export default function PainNewPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PainFlow />
    </Suspense>
  );
}
