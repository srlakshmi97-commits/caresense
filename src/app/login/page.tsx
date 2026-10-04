"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { api, ApiError } from "@/lib/client/api";
import { homeFor, type Me } from "@/lib/client/me";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, InlineError, Loading } from "@/components/States";

function LoginInner() {
  const t = useT();
  const router = useRouter();
  const role = useSearchParams().get("role") === "family" ? "family" : "parent";
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<Me>("/api/me").then(setMe).catch(setError);
  }, []);

  const go = async () => {
    const next = await api<Me>("/api/me");
    router.replace(homeFor(next) ?? "/");
  };

  const demo = async (account: string) => {
    setBusy(account);
    setError(null);
    try {
      await api("/api/auth/demo", { method: "POST", json: { account } });
      await go();
    } catch (e) {
      setError(e);
      setBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("form");
    setError(null);
    setMsg(null);
    try {
      const res = await api<{ needsConfirmation?: boolean }>("/api/auth/login", { method: "POST", json: { email, password, mode, role, name } });
      if (res.needsConfirmation) {
        setMsg(t("login.checkEmail"));
        setMode("signin");
        setBusy(null);
        return;
      }
      await go();
    } catch (err) {
      setBusy(null);
      if (err instanceof ApiError && err.field === "credentials") setMsg(t("login.badCredentials"));
      else setError(err);
    }
  };

  if (!me && !error) return <Loading />;

  return (
    <main className="page">
      <PageHeader back="/" title={role === "parent" ? t("login.parentTitle") : t("login.familyTitle")} />

      {me?.mode === "demo" ? (
        <section className="card p-5" aria-labelledby="demo-title">
          <h2 id="demo-title" className="text-2xl font-bold">
            {t("login.demoTitle")}
          </h2>
          <p className="mt-2 text-lg text-muted">{t("login.demoIntro")}</p>
          <div className="mt-5 flex flex-col gap-3">
            {role === "parent" ? (
              <>
                <Button size="lg" full loading={busy === "lakshmi"} onClick={() => demo("lakshmi")}>
                  {t("login.demoParent")}
                </Button>
                <Button size="lg" variant="secondary" full loading={busy === "new-parent"} onClick={() => demo("new-parent")}>
                  {t("login.demoNewParent")}
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" full loading={busy === "priya"} onClick={() => demo("priya")}>
                  {t("login.demoFamily")}
                </Button>
                <Button size="lg" variant="secondary" full loading={busy === "new-family"} onClick={() => demo("new-family")}>
                  {t("login.demoNewFamily")}
                </Button>
              </>
            )}
          </div>
        </section>
      ) : me ? (
        <form onSubmit={submit} className="card flex flex-col gap-5 p-5">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="label">
                {t("login.yourName")}
              </label>
              <input id="name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <label htmlFor="email" className="label">
              {t("login.email")}
            </label>
            <input id="email" type="email" required className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="label">
              {t("login.password")}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="field"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {msg && <InlineError>{msg}</InlineError>}
          <Button type="submit" size="lg" full loading={busy === "form"}>
            {mode === "signin" ? t("login.signIn") : t("login.createAccount")}
          </Button>
          <Button variant="ghost" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? t("login.switchToCreate") : t("login.switchToSignIn")}
          </Button>
        </form>
      ) : null}

      {error ? <div className="mt-4"><ErrorState error={error} /></div> : null}
      <p className="mt-8 text-base text-muted">{t("app.notADoctor")}</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginInner />
    </Suspense>
  );
}
