"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api } from "@/lib/client/api";
import { SEXES, type Sex } from "@/lib/types";
import { Button } from "@/components/Button";
import { BrandBar } from "@/components/Brand";
import { SignOutButton } from "@/components/SignOutButton";
import { ChoiceButton } from "@/components/ChoiceButton";
import { DateOfBirthInput, isRealDate } from "@/components/DateOfBirthInput";
import { DocumentUploader } from "@/components/DocumentUploader";
import { ListInput } from "@/components/ListInput";
import { ErrorState, InlineError } from "@/components/States";

type Step = "name" | "dob" | "sex" | "conditions" | "history" | "medications" | "allergies" | "emergency" | "share" | "reports" | "done";
const FORM_STEPS: Step[] = ["name", "dob", "sex", "conditions", "history", "medications", "allergies", "emergency", "share"];
const ALL_STEPS: Step[] = [...FORM_STEPS, "reports"];
const SEX_EMOJI: Record<Sex, string> = { female: "👩", male: "👨", other: "🙂" };

export default function Onboarding() {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("112");
  const [conditions, setConditions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [share, setShare] = useState<boolean | null>(null);
  const [fName, setFName] = useState("");
  const [fRel, setFRel] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [invite, setInvite] = useState<string | null>(null);
  const [reportsAdded, setReportsAdded] = useState(0);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const idx = ALL_STEPS.indexOf(step);
  const go = (s: Step) => {
    setProblem(null);
    setStep(s);
    window.scrollTo(0, 0);
  };
  const next = () => {
    if (step === "name" && !name.trim()) return setProblem(t("errors.incomplete"));
    if (step === "dob" && dob && !isRealDate(dob)) return setProblem(t("onboarding.dobInvalid"));
    go(FORM_STEPS[FORM_STEPS.indexOf(step) + 1]);
  };
  const back = () => go(FORM_STEPS[Math.max(0, FORM_STEPS.indexOf(step) - 1)]);

  const finish = async (withShare: boolean) => {
    if (withShare && !fName.trim()) return setProblem(t("errors.incomplete"));
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ invite_code: string | null }>("/api/onboarding", {
        method: "POST",
        json: {
          name,
          date_of_birth: isRealDate(dob) ? dob : null,
          sex,
          emergency_contact_name: ecName,
          emergency_contact_phone: ecPhone,
          emergency_number: emergencyNumber,
          conditions,
          past_history: history,
          medications,
          allergies,
          share: withShare ? { name: fName, relationship: fRel, phone: fPhone } : null,
        },
      });
      setInvite(res.invite_code);
      go("reports");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const later = (clear: () => void) => (
    <Button variant="secondary" size="lg" full onClick={() => { clear(); next(); }}>
      {t("common.addLater")}
    </Button>
  );

  return (
    <>
      <BrandBar right={<SignOutButton />} />
      <main className="page">
        {step !== "done" && (
          <>
            <p className="text-lg font-semibold text-muted">{t("common.step", { n: idx + 1, total: ALL_STEPS.length })}</p>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-line" aria-hidden>
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((idx + 1) / ALL_STEPS.length) * 100}%` }} />
            </div>
            {idx === 0 && <h1 className="mt-6 text-3xl font-bold">{t("onboarding.title")}</h1>}
          </>
        )}

        <div className="mt-6 flex flex-col gap-5">
          {step === "name" && (
            <div>
              <label htmlFor="name" className="label text-2xl">{t("onboarding.nameQ")}</label>
              <input id="name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(problem)} />
            </div>
          )}

          {step === "dob" && (
            <fieldset>
              <legend className="label text-2xl">{t("onboarding.dobQ")}</legend>
              <DateOfBirthInput value={dob} onChange={setDob} invalid={Boolean(problem)} />
            </fieldset>
          )}

          {step === "sex" && (
            <fieldset>
              <legend className="label text-2xl">{t("onboarding.sexQ")}</legend>
              <div role="radiogroup" className="flex flex-col gap-3">
                {SEXES.map((s) => (
                  <ChoiceButton key={s} role="radio" selected={sex === s} onClick={() => setSex(s)} emoji={SEX_EMOJI[s]}>
                    {t(`sexes.${s}`)}
                  </ChoiceButton>
                ))}
              </div>
            </fieldset>
          )}

          {step === "conditions" && (
            <>
              <label htmlFor="cond" className="label text-2xl">{t("onboarding.conditionsQ")}</label>
              <ListInput id="cond" value={conditions} onChange={setConditions} hint={t("onboarding.conditionsHint")} />
              {conditions.length === 0 && later(() => setConditions([]))}
            </>
          )}

          {step === "history" && (
            <>
              <label htmlFor="hist" className="label text-2xl">{t("onboarding.pastHistoryQ")}</label>
              <ListInput id="hist" value={history} onChange={setHistory} hint={t("onboarding.pastHistoryHint")} />
              {history.length === 0 && later(() => setHistory([]))}
            </>
          )}

          {step === "medications" && (
            <>
              <label htmlFor="meds" className="label text-2xl">{t("onboarding.medicationsQ")}</label>
              <ListInput id="meds" value={medications} onChange={setMedications} hint={t("onboarding.medicationsHint")} />
              {medications.length === 0 && later(() => setMedications([]))}
            </>
          )}

          {step === "allergies" && (
            <>
              <label htmlFor="all" className="label text-2xl">{t("onboarding.allergiesQ")}</label>
              <ListInput id="all" value={allergies} onChange={setAllergies} hint={t("onboarding.allergiesHint")} />
              {allergies.length === 0 && later(() => setAllergies([]))}
            </>
          )}

          {step === "emergency" && (
            <>
              <h2 className="text-2xl font-bold">{t("onboarding.emergencyQ")}</h2>
              <div>
                <label htmlFor="ecn" className="label">{t("onboarding.emergencyName")}</label>
                <input id="ecn" className="field" value={ecName} onChange={(e) => setEcName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ecp" className="label">{t("onboarding.emergencyPhone")}</label>
                <input id="ecp" className="field" type="tel" autoComplete="tel" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
              </div>
              <div>
                <label htmlFor="en" className="label">{t("onboarding.emergencyNumberQ")}</label>
                <p id="en-hint" className="mb-2 text-lg text-muted">{t("onboarding.emergencyNumberHint")}</p>
                <input id="en" className="field" inputMode="numeric" aria-describedby="en-hint" value={emergencyNumber} onChange={(e) => setEmergencyNumber(e.target.value.replace(/[^\d]/g, "").slice(0, 6))} />
              </div>
            </>
          )}

          {step === "share" && (
            <>
              <h2 className="text-2xl font-bold">{t("onboarding.shareQ")}</h2>
              <div role="radiogroup" className="flex flex-col gap-3">
                <ChoiceButton role="radio" selected={share === true} onClick={() => setShare(true)} emoji="👍">
                  {t("onboarding.shareYes")}
                </ChoiceButton>
                <ChoiceButton role="radio" selected={share === false} onClick={() => setShare(false)} emoji="⏳">
                  {t("common.notNow")}
                </ChoiceButton>
              </div>
              {share && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="fn" className="label">{t("onboarding.familyName")}</label>
                    <input id="fn" className="field" value={fName} onChange={(e) => setFName(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="fr" className="label">{t("onboarding.familyRelationship")}</label>
                    <input id="fr" className="field" value={fRel} onChange={(e) => setFRel(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="fp" className="label">{t("onboarding.familyPhone")}</label>
                    <input id="fp" className="field" type="tel" value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
                  </div>
                </div>
              )}
              {error ? <ErrorState error={error} /> : null}
            </>
          )}

          {step === "reports" && (
            <>
              <h1 className="text-3xl font-bold">{t("onboarding.reportsTitle")}</h1>
              <p className="text-lg text-muted">{t("onboarding.reportsHint")}</p>
              {reportsAdded > 0 && (
                <p className="flex items-center gap-2 rounded-2xl bg-ok-soft p-4 text-lg font-semibold">
                  <CheckCircle2 className="h-6 w-6 text-ok" aria-hidden />
                  {t(reportsAdded === 1 ? "onboarding.reportsAdded" : "onboarding.reportsAddedPlural", { count: reportsAdded })}
                </p>
              )}
              {/* New key per upload resets the uploader for "add another" */}
              <DocumentUploader
                key={uploaderKey}
                onUploaded={(r) => {
                  setReportsAdded((n) => n + 1);
                  setUploaderKey((k) => k + 1);
                  // Start reading the report in the background; the summary will be ready later.
                  api(`/api/records/${r.id}/extract`, { method: "POST" }).catch(() => {});
                }}
              />
              <Button size="lg" variant={reportsAdded ? "primary" : "secondary"} full onClick={() => (invite ? go("done") : router.replace("/parent"))}>
                {reportsAdded ? t("onboarding.reportsDone") : t("common.skip")}
              </Button>
            </>
          )}

          {step === "done" && invite && (
            <div className="card flex flex-col gap-4 p-6 text-center">
              <p aria-hidden className="text-5xl">🎉</p>
              <h1 className="text-3xl font-bold">{t("onboarding.allSet")}</h1>
              <div className="rounded-2xl bg-calm-soft p-4">
                <p className="text-lg font-semibold">{t("privacy.inviteCode")}</p>
                <p className="my-1 font-mono text-4xl font-bold tracking-[0.3em]">{invite}</p>
                <p className="text-lg">{t("privacy.inviteInstructions", { name: fName })}</p>
              </div>
              <Button size="lg" full onClick={() => router.replace("/parent")}>
                {t("common.done")}
              </Button>
            </div>
          )}
        </div>

        {problem && <InlineError>{problem}</InlineError>}

        {FORM_STEPS.includes(step) && (
          <div className="mt-8 flex gap-3">
            {step !== "name" && (
              <Button variant="secondary" size="lg" onClick={back} icon={<ArrowLeft className="h-6 w-6" aria-hidden />}>
                {t("common.back")}
              </Button>
            )}
            {step === "share" ? (
              <Button size="lg" full disabled={share === null} loading={busy} loadingText={t("onboarding.finishing")} onClick={() => finish(Boolean(share))}>
                {t("onboarding.finish")}
              </Button>
            ) : (
              <Button size="lg" full onClick={next} icon={<ArrowRight className="h-6 w-6" aria-hidden />}>
                {t("common.next")}
              </Button>
            )}
          </div>
        )}
      </main>
    </>
  );
}
