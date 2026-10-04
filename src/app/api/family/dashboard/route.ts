import { HttpError, route } from "@/lib/api";
import { audit, requireFamilyAccess } from "@/lib/access";
import { scheduledOn } from "@/lib/services/medications";
import { buildTimeline } from "@/lib/services/timeline";
import { firstName } from "@/lib/services/notify";
import { isIso } from "@/lib/util";
import { ageFrom, type NotificationKind, type PermissionKey } from "@/lib/types";

const RANGE_DAYS = { today: 1, d7: 7, d30: 30, all: 180 } as const;
type Range = keyof typeof RANGE_DAYS;

const NOTIFICATION_PERMISSION: Record<NotificationKind, PermissionKey> = {
  pain: "symptoms",
  medication: "medications",
  emergency: "alerts",
  new_report: "records",
};

// Family dashboard. Every section is included ONLY if the parent currently
// shares it; hidden sections are returned as null so the UI can say "Not shared".
export const GET = route(async (req, ctx) => {
  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId");
  if (!patientId) throw new HttpError(400, "bad_request");
  const { patient, link } = await requireFamilyAccess(ctx, patientId);
  const perms = link.permissions;

  const range = (url.searchParams.get("range") as Range) in RANGE_DAYS ? (url.searchParams.get("range") as Range) : "d7";
  let tz = url.searchParams.get("tz") || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const fromParam = url.searchParams.get("from");
  const from = range === "all" ? undefined : isIso(fromParam) ? fromParam : undefined;

  const localDate = (iso: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
  const localTime = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const today = localDate(new Date());
  const nowTime = localTime(new Date());

  // Day buckets (patient-view time zone of the viewer).
  const days: string[] = [];
  const nDays = RANGE_DAYS[range];
  for (let i = nDays - 1; i >= 0; i--) days.push(localDate(new Date(Date.now() - i * 86400000)));
  const firstDay = from ? localDate(from) : days[0];

  const out: Record<string, unknown> = {
    patient: { id: patient.id, name: patient.name, firstName: firstName(patient), age: ageFrom(patient.date_of_birth), conditions: perms.timeline ? patient.conditions : null },
    link: { relationship: link.relationship, permissions: perms },
    range,
    today,
    days: days.filter((d) => d >= firstDay),
  };

  const rangeOpt = <C extends string>(column: C) => (from ? { column, from } : undefined);
  let lastActivity: string | null = null;
  const bump = (iso: string | undefined) => {
    if (iso && (!lastActivity || iso > lastActivity)) lastActivity = iso;
  };

  if (perms.symptoms) {
    const eps = await ctx.store.list("pain_episodes", { patient_id: patient.id }, { orderBy: "started_at", ascending: false, range: rangeOpt("started_at") });
    const daily = new Map<string, { count: number; max: number }>();
    for (const e of eps) {
      const d = localDate(e.started_at);
      const cur = daily.get(d) ?? { count: 0, max: 0 };
      daily.set(d, { count: cur.count + 1, max: Math.max(cur.max, e.severity_score) });
    }
    bump(eps[0]?.created_at);
    out.symptoms = {
      count: eps.length,
      flaggedCount: eps.filter((e) => e.safety_rules.length > 0).length,
      episodes: eps.slice(0, 25),
      daily: (out.days as string[]).map((d) => ({ date: d, count: daily.get(d)?.count ?? 0, max: daily.get(d)?.max ?? null })),
    };
  } else out.symptoms = null;

  if (perms.meals) {
    const meals = await ctx.store.list("meals", { patient_id: patient.id }, { orderBy: "eaten_at", ascending: false, range: rangeOpt("eaten_at") });
    bump(meals[0]?.created_at);
    out.meals = { count: meals.length, recent: meals.slice(0, 12) };
  } else out.meals = null;

  if (perms.medications) {
    const [meds, logs] = await Promise.all([
      ctx.store.list("medications", { patient_id: patient.id, active: true }),
      ctx.store.list("medication_logs", { patient_id: patient.id }, { range: { column: "scheduled_date", from: firstDay } }),
    ]);
    const daily = [];
    let taken = 0, skipped = 0, unsure = 0, scheduled = 0;
    for (const d of out.days as string[]) {
      let dayScheduled = 0, dayTaken = 0;
      for (const m of meds.filter((m) => scheduledOn(m, d))) {
        for (const time of m.times) {
          if (d === today && time > nowTime) continue; // not due yet
          dayScheduled++;
          const log = logs.find((l) => l.medication_id === m.id && l.scheduled_date === d && l.scheduled_time === time);
          if (log?.status === "taken") dayTaken++;
          if (log?.status === "skipped") skipped++;
          if (log?.status === "unsure") unsure++;
        }
      }
      scheduled += dayScheduled;
      taken += dayTaken;
      daily.push({ date: d, taken: dayTaken, scheduled: dayScheduled });
    }
    const latestLog = logs.reduce<string | undefined>((a, l) => (!a || l.logged_at > a ? l.logged_at : a), undefined);
    bump(latestLog);
    out.medications = {
      meds: meds.map((m) => ({ id: m.id, name: m.name, purpose: m.purpose, dosage: m.dosage, times: m.times, instructions: m.instructions, important: m.important })),
      taken,
      skipped,
      unsure,
      missing: scheduled - taken - skipped - unsure,
      scheduled,
      daily,
    };
  } else out.medications = null;

  if (perms.records) {
    const records = await ctx.store.list("medical_records", { patient_id: patient.id }, { orderBy: "created_at", ascending: false });
    const inRange = from ? records.filter((r) => r.created_at >= from) : records;
    out.records = {
      newCount: inRange.length,
      recent: records.slice(0, 8).map((r) => ({ id: r.id, title: r.title, category: r.category, record_date: r.record_date, created_at: r.created_at, uploaded_by_name: r.uploaded_by_name })),
    };
  } else out.records = null;

  if (perms.alerts) {
    const alerts = await ctx.store.list("safety_alerts", { patient_id: patient.id }, { orderBy: "created_at", ascending: false, range: rangeOpt("created_at") });
    out.attention = { count: alerts.length, alerts: alerts.slice(0, 10).map((a) => ({ id: a.id, created_at: a.created_at, rules: a.rules, source: a.source })) };
  } else out.attention = null;

  if (perms.timeline) {
    const items = await buildTimeline(ctx.store, patient.id, { records: perms.records, symptoms: perms.symptoms, medications: perms.medications, from });
    out.timeline = items.slice(0, 40);
  } else out.timeline = null;

  const notes = await ctx.store.list("notifications", { family_link_id: link.id }, { orderBy: "created_at", ascending: false, limit: 30 });
  out.notifications = notes.filter((n) => perms[NOTIFICATION_PERMISSION[n.kind]]);
  out.lastActivity = lastActivity;

  // Audit views, at most once per 30 minutes per viewer (range changes don't spam the log).
  const [lastView] = await ctx.store.list(
    "audit_log",
    { patient_id: patient.id, actor_id: ctx.profile!.id, action: "family_viewed_dashboard" },
    { orderBy: "created_at", ascending: false, limit: 1 },
  );
  if (!lastView || Date.now() - Date.parse(lastView.created_at) > 30 * 60000) {
    await audit(ctx, patient.id, "family_viewed_dashboard");
  }
  return out;
});
