import { cookies } from "next/headers";
import { route } from "@/lib/api";
import { requireParent } from "@/lib/access";
import { LOCALE_COOKIE, normaliseLocale, tFor } from "@/lib/i18n";
import { isDateOnly } from "@/lib/util";

// Calendar file (.ics) with a daily alarm for every medicine time.
// The phone's own calendar rings even when CareSense is closed or offline.
// Times are "floating" (no time zone), so 8:00 means 8:00 wherever she is.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const fold = (line: string) => line.replace(/(.{70})/g, "$1\r\n ").replace(/\r\n $/, "");

export const GET = route(async (req, ctx) => {
  const { patient } = await requireParent(ctx);
  const t = tFor(normaliseLocale((await cookies()).get(LOCALE_COOKIE)?.value ?? patient.preferred_language));
  const dateParam = new URL(req.url).searchParams.get("date");
  const today = isDateOnly(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);
  const compact = (d: string) => d.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const meds = await ctx.store.list("medications", { patient_id: patient.id, active: true });
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CareSense//Medicine reminders//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:CareSense"];
  for (const m of meds) {
    if (m.end_date && m.end_date < today) continue;
    const start = m.start_date && m.start_date > today ? m.start_date : today;
    for (const time of m.times) {
      const hhmm = time.replace(":", "");
      const title = `💊 ${m.name}${m.dosage ? ` ${m.dosage}` : ""}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${m.id}-${hhmm}@caresense`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${compact(start)}T${hhmm}00`,
        "DURATION:PT10M",
        `RRULE:FREQ=DAILY${m.end_date ? `;UNTIL=${compact(m.end_date)}T235959` : ""}`,
        fold(`SUMMARY:${esc(title)}`),
        fold(`DESCRIPTION:${esc([t("reminders.dueTitle"), m.instructions, m.purpose].filter(Boolean).join(" · "))}`),
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:PT0M",
        fold(`DESCRIPTION:${esc(title)}`),
        "END:VALARM",
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="caresense-medicines.ics"',
      "Cache-Control": "private, no-store",
    },
  });
});
