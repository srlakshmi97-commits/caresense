"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Check, Clock } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { api } from "@/lib/client/api";
import { fmtClock, localDate } from "@/lib/client/format";
import { dueDoses, shouldNotify, type DueDose, type NudgeState } from "@/lib/client/reminders";
import type { Medication, MedicationLog } from "@/lib/types";
import { Button } from "./Button";
import { useToast } from "./Toast";

// Per-phone preferences (not health data): stored in the browser only.
const PREF_KEY = "cs_reminders_on";
const SNOOZE_KEY = "cs_reminders_snooze";
const nudgeKey = (date: string) => `cs_reminders_${date}`;

export function remindersEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) === "1" && typeof Notification !== "undefined" && Notification.permission === "granted";
  } catch {
    return false;
  }
}

export function notificationSupport(): "ok" | "blocked" | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission === "denied" ? "blocked" : "ok";
}

/** Turns phone reminders on (asks the browser for permission) or off. */
export async function setRemindersEnabled(on: boolean): Promise<boolean> {
  if (!on) {
    localStorage.setItem(PREF_KEY, "0");
    return false;
  }
  if (notificationSupport() !== "ok") return false;
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  const ok = permission === "granted";
  localStorage.setItem(PREF_KEY, ok ? "1" : "0");
  window.dispatchEvent(new Event("cs:refresh"));
  return ok;
}

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/**
 * Runs on every parent screen. Shows a banner when a medicine is due and,
 * if she switched reminders on, a phone notification with a "Taken" button.
 * Works while CareSense is open or in the background; the calendar export
 * covers the app-closed case until server push is available.
 */
export function ReminderManager() {
  const t = useT();
  const toast = useToast();
  const [due, setDue] = useState<DueDose[]>([]);
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const data = useRef<{ meds: Medication[]; logs: MedicationLog[]; date: string } | null>(null);

  const load = useCallback(async () => {
    const date = localDate();
    try {
      const res = await api<{ medications: Medication[]; logs: MedicationLog[] }>(`/api/medications?date=${date}`);
      data.current = { meds: res.medications, logs: res.logs, date };
    } catch {
      /* not signed in yet / offline: try again on the next tick */
    }
  }, []);

  const notify = useCallback(
    async (dose: DueDose, date: string) => {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(t("reminders.dueTitle"), {
          body: t("reminders.dueItem", { name: dose.medication.name, dosage: dose.medication.dosage, time: fmtClock(dose.time) }),
          tag: `med-${dose.medication.id}-${dose.time}`, // replaces the earlier nudge for the same dose
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          requireInteraction: true,
          data: { medication_id: dose.medication.id, date, time: dose.time },
          actions: [{ action: "taken", title: t("reminders.taken") }],
        } as NotificationOptions);
      } catch {
        /* the in-app banner still shows */
      }
    },
    [t],
  );

  const tick = useCallback(() => {
    const d = data.current;
    if (!d) return;
    if (d.date !== localDate()) {
      load(); // a new day started
      return;
    }
    const list = dueDoses(d.meds, d.logs, d.date, nowHHMM());
    setDue(list);
    if (!remindersEnabled()) return;
    let state: Record<string, NudgeState> = {};
    try {
      state = JSON.parse(localStorage.getItem(nudgeKey(d.date)) || "{}");
    } catch {
      state = {};
    }
    let changed = false;
    for (const dose of list) {
      const key = `${dose.medication.id}|${dose.time}`;
      if (shouldNotify(dose, state[key], Date.now())) {
        notify(dose, d.date);
        state[key] = { count: (state[key]?.count ?? 0) + 1, last: Date.now() };
        changed = true;
      }
    }
    if (changed) localStorage.setItem(nudgeKey(d.date), JSON.stringify(state));
  }, [load, notify]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    try {
      setSnoozedUntil(Number(localStorage.getItem(SNOOZE_KEY) || 0));
    } catch {
      /* ignore */
    }
    let alive = true;
    const refresh = async () => {
      await load();
      if (alive) tick();
    };
    refresh();
    const fast = setInterval(tick, 30_000);
    const slow = setInterval(refresh, 5 * 60_000);
    const onRefresh = () => refresh();
    const onMessage = (e: MessageEvent) => e.data?.type === "cs:refresh" && window.dispatchEvent(new Event("cs:refresh"));
    window.addEventListener("cs:refresh", onRefresh);
    window.addEventListener("focus", onRefresh);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      alive = false;
      clearInterval(fast);
      clearInterval(slow);
      window.removeEventListener("cs:refresh", onRefresh);
      window.removeEventListener("focus", onRefresh);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [load, tick]);

  const markTaken = async (dose: DueDose) => {
    const d = data.current;
    if (!d) return;
    const key = `${dose.medication.id}|${dose.time}`;
    setBusy(key);
    try {
      await api("/api/medications/log", { method: "POST", json: { medication_id: dose.medication.id, date: d.date, time: dose.time, status: "taken" } });
      toast(`${dose.medication.name}: ${t("meds.taken")}`);
      // Clear the phone notification for this dose, then refresh every screen.
      const reg = await navigator.serviceWorker?.getRegistration();
      (await reg?.getNotifications({ tag: `med-${dose.medication.id}-${dose.time}` }))?.forEach((n) => n.close());
      window.dispatchEvent(new Event("cs:refresh"));
    } catch {
      /* banner stays so she can try again */
    } finally {
      setBusy(null);
    }
  };

  const snooze = () => {
    const until = Date.now() + 30 * 60_000;
    setSnoozedUntil(until);
    try {
      localStorage.setItem(SNOOZE_KEY, String(until));
    } catch {
      /* ignore */
    }
  };

  if (due.length === 0 || Date.now() < snoozedUntil) return null;

  return (
    <section role="alert" aria-labelledby="due-title" className="border-b-2 border-warn/40 bg-warn-soft">
      <div className="mx-auto w-full max-w-xl px-4 py-4 sm:px-6">
        <h2 id="due-title" className="flex items-center gap-2 text-xl font-bold">
          <BellRing className="h-6 w-6 text-warn" aria-hidden />
          {t("reminders.dueTitle")}
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {due.slice(0, 3).map((dose) => {
            const key = `${dose.medication.id}|${dose.time}`;
            return (
              <li key={key} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{dose.medication.name}</p>
                  <p className="text-base text-muted">
                    {[dose.medication.dosage, fmtClock(dose.time), dose.medication.instructions].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button loading={busy === key} onClick={() => markTaken(dose)} icon={<Check className="h-5 w-5" aria-hidden />}>
                  {t("reminders.taken")}
                </Button>
              </li>
            );
          })}
        </ul>
        <Button variant="ghost" className="mt-2" onClick={snooze} icon={<Clock className="h-5 w-5" aria-hidden />}>
          {t("reminders.later")}
        </Button>
      </div>
    </section>
  );
}
