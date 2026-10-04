"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarPlus } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { localDate } from "@/lib/client/format";
import { buttonClass } from "./Button";
import { notificationSupport, remindersEnabled, setRemindersEnabled } from "./ReminderManager";
import { Toggle } from "./Toggle";

/** "Remind me on this phone" switch + "add to my phone calendar" button. */
export function ReminderSettings() {
  const t = useT();
  const [on, setOn] = useState(false);
  const [support, setSupport] = useState<"ok" | "blocked" | "unsupported">("ok");

  useEffect(() => {
    setOn(remindersEnabled());
    setSupport(notificationSupport());
  }, []);

  const change = async (next: boolean) => {
    const result = await setRemindersEnabled(next);
    setOn(result);
    setSupport(notificationSupport());
  };

  return (
    <section aria-labelledby="rem" className="card mt-5 p-5">
      <h2 id="rem" className="flex items-center gap-2 text-xl font-bold">
        <BellRing className="h-6 w-6 text-brand" aria-hidden />
        {t("reminders.title")}
      </h2>

      {support === "unsupported" ? (
        <p className="mt-2 text-lg text-muted">{t("reminders.unsupported")}</p>
      ) : (
        <>
          <div className="mt-2">
            <Toggle label={t("reminders.enable")} checked={on} onChange={change} />
          </div>
          {support === "blocked" ? (
            <p role="alert" className="mt-1 rounded-xl bg-warn-soft p-3 text-lg">{t("reminders.blocked")}</p>
          ) : (
            on && <p className="mt-1 text-base text-muted">{t("reminders.enabledNote")}</p>
          )}
        </>
      )}

      {/* A real download: the phone opens it in its Calendar app. */}
      <a href={`/api/medications/calendar?date=${localDate()}`} download="caresense-medicines.ics" className={`${buttonClass("secondary", "lg", true)} mt-4`}>
        <CalendarPlus className="h-6 w-6" aria-hidden />
        <span>{t("reminders.calendar")}</span>
      </a>
      <p className="mt-2 text-base text-muted">{t("reminders.calendarNote")}</p>
    </section>
  );
}
