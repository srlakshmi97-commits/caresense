"use client";

import { useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api, useApi } from "@/lib/client/api";
import { fmtDay, fmtTime } from "@/lib/client/format";
import type { AuditEntry, FamilyLink } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";
import { Button } from "@/components/Button";
import { FamilyMemberCard } from "@/components/FamilyMemberCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, InlineError, Loading } from "@/components/States";

export default function PrivacyPage() {
  const t = useT();
  const { data, error, loading, reload, setData } = useApi<{ links: FamilyLink[]; audit: AuditEntry[] }>("/api/family/links");
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState("");
  const [rel, setRel] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const [inviteError, setInviteError] = useState<unknown>(null);

  const invite = async () => {
    if (!name.trim()) return setProblem(true);
    setProblem(false);
    setBusy(true);
    setInviteError(null);
    try {
      const { link } = await api<{ link: FamilyLink }>("/api/family/links", { method: "POST", json: { name, relationship: rel, phone } });
      setData((d) => d && { ...d, links: [...d.links, link] });
      setInviting(false);
      setName("");
      setRel("");
      setPhone("");
    } catch (e) {
      setInviteError(e);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Loading />;
  if (error || !data) return <main className="page"><ErrorState error={error} onRetry={reload} /></main>;

  const visible = data.links.filter((l, i, all) => l.status !== "revoked" || !all.some((o) => o.status !== "revoked" && o.family_name === l.family_name));

  return (
    <main className="page">
      <PageHeader title={t("privacy.title")} subtitle={t("privacy.intro")} back="/parent/health" />

      <section aria-labelledby="fam">
        <h2 id="fam" className="mb-3 text-2xl font-bold">{t("privacy.familyMembers")}</h2>
        {visible.length === 0 ? (
          <EmptyState icon="👨‍👩‍👧">{t("privacy.noFamily")}</EmptyState>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((l) => (
              <FamilyMemberCard key={l.id} link={l} onChange={(u) => setData((d) => d && { ...d, links: d.links.map((x) => (x.id === u.id ? u : x)) })} />
            ))}
          </div>
        )}

        {inviting ? (
          <div className="card mt-4 flex flex-col gap-4 p-5">
            <h3 className="text-2xl font-bold">{t("privacy.invite")}</h3>
            <div>
              <label htmlFor="iname" className="label">{t("privacy.inviteName")}</label>
              <input id="iname" className="field" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={problem} />
              {problem && <InlineError>{t("errors.incomplete")}</InlineError>}
            </div>
            <div>
              <label htmlFor="irel" className="label">{t("privacy.inviteRelationship")}</label>
              <input id="irel" className="field" value={rel} onChange={(e) => setRel(e.target.value)} />
            </div>
            <div>
              <label htmlFor="iphone" className="label">{t("privacy.invitePhone")}</label>
              <input id="iphone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {inviteError ? <ErrorState error={inviteError} /> : null}
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button size="lg" full loading={busy} onClick={invite}>{t("privacy.inviteCreate")}</Button>
              <Button size="lg" variant="secondary" full onClick={() => setInviting(false)}>{t("common.cancel")}</Button>
            </div>
          </div>
        ) : (
          <Button size="lg" variant="secondary" full className="mt-4" onClick={() => setInviting(true)} icon={<UserPlus className="h-6 w-6" aria-hidden />}>
            {t("privacy.invite")}
          </Button>
        )}
      </section>

      <section aria-labelledby="hist" className="card mt-8 p-5">
        <h2 id="hist" className="text-2xl font-bold">{t("privacy.accessHistory")}</h2>
        {data.audit.length === 0 ? (
          <p className="mt-2 text-lg text-muted">{t("privacy.accessHistoryEmpty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {data.audit.map((a) => (
              <li key={a.id} className="py-3">
                <p className="text-lg">
                  {t(`audit.${a.action}` as MessageKey, { actor: a.actor_name || "—" })}
                  {a.detail && a.action !== "family_joined" ? `: ${a.detail}` : ""}
                </p>
                <p className="text-base text-muted">
                  {fmtDay(a.created_at)} · {fmtTime(a.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-soft p-4 text-lg">
        <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-brand" aria-hidden />
        {t("privacy.dataNote")}
      </p>
    </main>
  );
}
