"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, InlineError } from "@/components/States";
import { useToast } from "@/components/Toast";

export default function JoinPage() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setBad(false);
    setError(null);
    try {
      const { patientId } = await api<{ patientId: string }>("/api/family/join", { method: "POST", json: { code, name } });
      toast(t("family.joined"));
      router.replace(`/family?patient=${patientId}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "bad_request") setBad(true);
      else setError(err);
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <PageHeader title={t("family.joinTitle")} subtitle={t("family.joinIntro")} back="/family" />
      <form onSubmit={join} className="card flex flex-col gap-5 p-5">
        <div>
          <label htmlFor="yname" className="label">{t("login.yourName")}</label>
          <input id="yname" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="code" className="label">{t("family.joinCode")}</label>
          <input
            id="code"
            className="field font-mono text-2xl uppercase tracking-[0.3em]"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            aria-invalid={bad}
          />
          {bad && <InlineError>{t("family.joinBad")}</InlineError>}
        </div>
        {error ? <ErrorState error={error} /> : null}
        <Button type="submit" size="lg" full loading={busy} disabled={code.length < 4}>
          {t("family.joinButton")}
        </Button>
      </form>
    </main>
  );
}
