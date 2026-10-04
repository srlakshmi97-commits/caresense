"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { api, useApi } from "@/lib/client/api";
import { SEXES, type Patient, type Sex } from "@/lib/types";
import { Button } from "@/components/Button";
import { ChoiceButton } from "@/components/ChoiceButton";
import { DateOfBirthInput, isRealDate } from "@/components/DateOfBirthInput";
import { ListInput } from "@/components/ListInput";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, InlineError, Loading } from "@/components/States";
import { useToast } from "@/components/Toast";

export default function ProfilePage() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ patient: Patient }>("/api/patient");
  const [f, setF] = useState<Record<string, string>>({});
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [conditions, setConditions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dobProblem, setDobProblem] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);

  useEffect(() => {
    if (!data) return;
    const p = data.patient;
    setF({
      name: p.name,
      emergency_contact_name: p.emergency_contact_name ?? "",
      emergency_contact_phone: p.emergency_contact_phone ?? "",
      emergency_number: p.emergency_number,
      protein_goal_g: p.protein_goal_g ? String(p.protein_goal_g) : "",
      protein_goal_set_by: p.protein_goal_set_by ?? "",
    });
    setDob(p.date_of_birth ?? "");
    setSex(p.sex);
    setConditions(p.conditions);
    setHistory(p.past_history ?? []);
    setAllergies(p.allergies);
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <main className="page"><ErrorState error={error} onRetry={reload} /></main>;

  const input = (k: string, label: string, type = "text") => (
    <div>
      <label htmlFor={k} className="label">{label}</label>
      <input id={k} type={type} className="field" value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  const save = async () => {
    if (dob && !isRealDate(dob)) return setDobProblem(true);
    setDobProblem(false);
    setBusy(true);
    setSaveError(null);
    try {
      await api("/api/patient", {
        method: "PATCH",
        json: {
          ...f,
          date_of_birth: dob || null,
          sex,
          protein_goal_g: f.protein_goal_g ? Number(f.protein_goal_g) : null,
          conditions,
          past_history: history,
          allergies,
        },
      });
      toast(t("health.profileSaved"));
      router.push("/parent/health");
    } catch (e) {
      setSaveError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <PageHeader title={t("health.profileTitle")} back="/parent/health" />
      <div className="flex flex-col gap-5">
        {input("name", t("onboarding.nameQ"))}
        <fieldset>
          <legend className="label">{t("onboarding.dobQ")}</legend>
          <DateOfBirthInput value={dob} onChange={setDob} invalid={dobProblem} />
          {dobProblem && <InlineError>{t("onboarding.dobInvalid")}</InlineError>}
        </fieldset>
        <fieldset>
          <legend className="label">{t("onboarding.sexQ")}</legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SEXES.map((s) => (
              <ChoiceButton key={s} role="radio" selected={sex === s} onClick={() => setSex(s)}>
                {t(`sexes.${s}`)}
              </ChoiceButton>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="cond" className="label">{t("health.conditions")}</label>
          <ListInput id="cond" value={conditions} onChange={setConditions} />
        </div>
        <div>
          <label htmlFor="hist" className="label">{t("health.pastHistory")}</label>
          <ListInput id="hist" value={history} onChange={setHistory} hint={t("onboarding.pastHistoryHint")} />
        </div>
        <div>
          <label htmlFor="all" className="label">{t("health.allergies")}</label>
          <ListInput id="all" value={allergies} onChange={setAllergies} />
        </div>
        <h2 className="mt-2 text-2xl font-bold">{t("onboarding.emergencyQ")}</h2>
        {input("emergency_contact_name", t("onboarding.emergencyName"))}
        {input("emergency_contact_phone", t("onboarding.emergencyPhone"), "tel")}
        {input("emergency_number", t("onboarding.emergencyNumberQ"))}
        <h2 className="mt-2 text-2xl font-bold">{t("food.proteinTitle")}</h2>
        {input("protein_goal_g", t("food.goalLabel"), "number")}
        {input("protein_goal_set_by", t("food.goalSetBy"))}
        <p className="text-base text-muted">{t("food.proteinDisclaimer")}</p>
        {saveError ? <ErrorState error={saveError} /> : null}
        <Button size="lg" full loading={busy} onClick={save}>
          {t("common.save")}
        </Button>
      </div>
    </main>
  );
}
