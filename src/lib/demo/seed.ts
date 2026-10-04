// FICTIONAL demo data. "Lakshmi Raman" is not a real person; every report,
// clinician, clinic, and phone number below is invented. Phone numbers use
// the reserved fictional 555-01xx range. Dates are relative to "now" so the
// demo always looks current.

import type { FileStore } from "../db/store";
import type {
  AuditEntry,
  FamilyLink,
  Meal,
  MedicalRecord,
  Medication,
  MedicationLog,
  Notification,
  PainEpisode,
  Patient,
  Profile,
  RecordExtraction,
  SafetyAlert,
  Tables,
  TimelineEvent,
} from "../types";
import { SEVERITY_SCORE } from "../types";
import { estimateProtein, findFood } from "../nutrition/foods";
import { checkPainEpisode } from "../safety/engine";
import { newId } from "../util";
import { t, type MessageKey } from "../i18n";
import { textPdf, type PdfLine } from "./pdf";

export const DEMO_PARENT_ID = "00000000-0000-4000-a000-000000000001";
export const DEMO_FAMILY_ID = "00000000-0000-4000-a000-000000000002";
const PATIENT_ID = "00000000-0000-4000-b000-000000000001";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const longDate = (d: Date) => `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

function dayAt(daysAgo: number, h = 0, m = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d;
}

type Db = { [N in keyof Tables]: Tables[N][] };

const SEED_MUSCLE: Partial<Record<string, string>> = {
  upper_abdomen: "c.upper_abs",
  lower_abdomen: "c.lower_abs",
  back: "c.lower_back",
  right_side: "r.oblique",
  head: "c.head",
};

export async function buildDemoData(files: FileStore): Promise<Partial<Db>> {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();

  // ── people ───────────────────────────────────────────────────────────
  const profiles: Profile[] = [
    { id: DEMO_PARENT_ID, role: "parent", display_name: "Lakshmi", phone: null, created_at: iso(dayAt(90)) },
    { id: DEMO_FAMILY_ID, role: "family", display_name: "Priya", phone: "+1 206 555 0147", created_at: iso(dayAt(90)) },
  ];

  const patient: Patient = {
    id: PATIENT_ID,
    owner_id: DEMO_PARENT_ID,
    name: "Lakshmi Raman",
    date_of_birth: "1958-03-14",
    sex: "female",
    preferred_language: "en",
    emergency_contact_name: "Priya (daughter)",
    emergency_contact_phone: "+1 206 555 0147",
    emergency_number: "112",
    conditions: ["Hypertension (high blood pressure)", "Type 2 diabetes", "Gallstones"],
    past_history: ["Cataract operation, right eye (2019)", "Hospital stay for dengue fever (2021)"],
    allergies: ["Sulfa medicines (rash)"],
    protein_goal_g: 50,
    protein_goal_set_by: "Dr. Meena Krishnan (fictional)",
    onboarded: true,
    created_at: iso(dayAt(90)),
  };

  const link: FamilyLink = {
    id: newId(),
    patient_id: PATIENT_ID,
    family_profile_id: DEMO_FAMILY_ID,
    family_name: "Priya",
    family_phone: "+1 206 555 0147",
    relationship: "Daughter (Seattle)",
    invite_code: "PRIYA7",
    status: "active",
    permissions: { symptoms: true, meals: true, medications: true, records: true, timeline: true, alerts: true },
    alert_prefs: { pain: true, medication: true, emergency: true, new_report: true },
    created_at: iso(dayAt(89)),
    revoked_at: null,
  };

  // ── medicines ────────────────────────────────────────────────────────
  const gpName = "Dr. Meena Krishnan";
  const giName = "Dr. Arjun Rao";
  const rxDate = dayAt(200);
  const giVisit = dayAt(1, 11, 30);

  const med = (m: Partial<Medication> & Pick<Medication, "name" | "dosage" | "frequency" | "times">): Medication => ({
    id: newId(),
    patient_id: PATIENT_ID,
    purpose: null,
    instructions: null,
    prescriber: gpName,
    start_date: ymd(rxDate),
    end_date: null,
    important: false,
    active: true,
    created_at: iso(rxDate),
    ...m,
  });
  const meds: Medication[] = [
    med({ name: "Amlodipine", purpose: "Blood pressure", dosage: "5 mg, 1 tablet", frequency: "Once a day", times: ["08:00"], instructions: "In the morning", important: true }),
    med({ name: "Metformin", purpose: "Diabetes", dosage: "500 mg, 1 tablet", frequency: "Twice a day", times: ["08:00", "20:00"], instructions: "After food", important: true }),
    med({ name: "Atorvastatin", purpose: "Cholesterol", dosage: "10 mg, 1 tablet", frequency: "Once a day", times: ["21:00"], instructions: "At night" }),
    med({ name: "Pantoprazole", purpose: "Stomach acid", dosage: "40 mg, 1 tablet", frequency: "Once a day", times: ["07:30"], instructions: "30 minutes before breakfast", prescriber: giName, start_date: ymd(giVisit), created_at: iso(giVisit) }),
  ];

  // ── medicine logs (last 14 days) ────────────────────────────────────
  const logs: MedicationLog[] = [];
  const skipPattern: Record<string, "skipped" | "unsure"> = { "3|20:00": "skipped", "6|21:00": "unsure", "9|08:00": "skipped", "11|21:00": "skipped" };
  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    for (const m of meds) {
      if (m.start_date && ymd(dayAt(daysAgo)) < m.start_date) continue;
      for (const time of m.times) {
        const [h, mi] = time.split(":").map(Number);
        const when = dayAt(daysAgo, h, mi + 10);
        if (when > now) continue;
        if (daysAgo === 0 && h >= 12) continue; // leave today's later doses for the user
        if (daysAgo === 5 && time === "21:00") continue; // not marked at all
        const status = skipPattern[`${daysAgo}|${time}`] ?? "taken";
        logs.push({ id: newId(), patient_id: PATIENT_ID, medication_id: m.id, scheduled_date: ymd(dayAt(daysAgo)), scheduled_time: time, status, logged_at: iso(when) });
      }
    }
  }

  // ── pain episodes ────────────────────────────────────────────────────
  type EpSeed = [daysAgo: number, h: number, m: number, mins: number | null, level: PainEpisode["severity_level"], loc: PainEpisode["locations"], trig: PainEpisode["triggers"], sym: PainEpisode["symptoms"]];
  const epSeeds: EpSeed[] = [
    [27, 21, 10, 40, "moderate", ["upper_abdomen"], ["ate_food"], ["nausea"]],
    [23, 20, 45, 55, "moderate", ["upper_abdomen", "right_side"], ["ate_food"], ["none"]],
    [19, 13, 30, 25, "mild", ["back"], ["woke_up"], ["none"]],
    [15, 21, 0, 70, "strong", ["upper_abdomen", "back"], ["ate_food"], ["nausea"]],
    [11, 22, 15, 95, "strong", ["upper_abdomen", "back"], ["ate_food"], ["nausea", "vomiting"]],
    [8, 20, 30, 50, "moderate", ["upper_abdomen"], ["ate_food"], ["nausea"]],
    [6, 7, 0, 20, "mild", ["head"], ["woke_up"], ["none"]],
    [4, 21, 20, 80, "strong", ["upper_abdomen", "back"], ["ate_food"], ["nausea"]],
    [2, 20, 50, 60, "moderate", ["upper_abdomen", "right_side"], ["ate_food"], ["nausea"]],
    [1, 6, 30, 150, "strong", ["upper_abdomen", "back"], ["woke_up"], ["nausea", "weakness"]],
    [0, 8, 15, 80, "strong", ["upper_abdomen", "back"], ["ate_food"], ["nausea"]],
  ];
  const episodes: PainEpisode[] = [];
  const alerts: SafetyAlert[] = [];
  const notifications: Notification[] = [];
  for (const [daysAgo, h, m, mins, level, locations, triggers, symptoms] of epSeeds) {
    const start = dayAt(daysAgo, h, m);
    if (start > now) continue;
    const end = mins != null ? new Date(start.getTime() + mins * 60000) : null;
    const ended = end && end <= now ? end : null;
    const ep: PainEpisode = {
      id: newId(),
      patient_id: PATIENT_ID,
      locations,
      muscles: locations.map((l) => SEED_MUSCLE[l]).filter((m): m is string => Boolean(m)),
      other_location: null,
      severity_level: level,
      severity_score: SEVERITY_SCORE[level],
      started_at: iso(start),
      ongoing: !ended,
      ended_at: ended ? iso(ended) : null,
      triggers,
      trigger_other: null,
      symptoms,
      notes: null,
      safety_rules: [],
      created_at: iso(start),
      updated_at: iso(start),
    };
    const safety = checkPainEpisode(ep);
    ep.safety_rules = safety.rules;
    episodes.push(ep);
    if (safety.urgent) {
      alerts.push({ id: newId(), patient_id: PATIENT_ID, source: "pain", rules: safety.rules, pain_episode_id: ep.id, created_at: ep.created_at });
      notifications.push({
        id: newId(),
        patient_id: PATIENT_ID,
        family_link_id: link.id,
        kind: "emergency",
        title: "Safety alert",
        body: "Lakshmi logged symptoms that may need urgent medical attention. Please check in now.",
        params: { name: "Lakshmi" },
        read: true,
        created_at: ep.created_at,
      });
    }
  }

  // ── meals (previous 6 days) ─────────────────────────────────────────
  const meals: Meal[] = [];
  const menu: Record<Meal["meal_type"], [string, string][][]> = {
    breakfast: [[["idli", "3"], ["sambar", "half_bowl"]], [["dosa", "2"], ["tea", "cup"]], [["pongal", "bowl"], ["milk", "glass"]]],
    lunch: [[["rice", "bowl"], ["sambar", "bowl"], ["poriyal", "half_bowl"], ["curd", "half_bowl"]], [["chapati", "2"], ["dal", "bowl"], ["curd", "bowl"]], [["rice", "bowl"], ["fish", "piece"], ["rasam", "cup"]]],
    snack: [[["fruit", "piece"], ["tea", "cup"]], [["chole", "half_bowl"]]],
    dinner: [[["chapati", "2"], ["koottu", "bowl"]], [["idli", "2"], ["sambar", "half_bowl"]], [["curd_rice", "bowl"], ["egg", "1"]]],
  };
  const mealHours: Record<Meal["meal_type"], number> = { breakfast: 8, lunch: 13, snack: 16, dinner: 20 };
  for (let daysAgo = 6; daysAgo >= 1; daysAgo--) {
    for (const type of ["breakfast", "lunch", "snack", "dinner"] as const) {
      if (type === "snack" && daysAgo % 2 === 0) continue;
      const options = menu[type];
      const choice = options[daysAgo % options.length];
      const items = choice.map(([key, qty]) => ({
        food_key: key,
        label: findFood(key) ? t(`foods.${key}` as MessageKey) : key,
        quantity: qty,
        protein_g: estimateProtein(key, qty),
        protein_source: "catalog" as const,
      }));
      const when = dayAt(daysAgo, mealHours[type], 15);
      meals.push({
        id: newId(),
        patient_id: PATIENT_ID,
        meal_type: type,
        eaten_at: iso(when),
        items,
        notes: null,
        protein_est_g: items.reduce((s, i) => s + (i.protein_g ?? 0), 0),
        created_at: iso(when),
      });
    }
  }

  // ── medical records (fictional documents) ───────────────────────────
  const records: MedicalRecord[] = [];
  const extractions: RecordExtraction[] = [];
  const timeline: TimelineEvent[] = [];

  async function addRecord(opts: {
    title: string;
    category: MedicalRecord["category"];
    date: Date;
    fileName: string;
    lines: PdfLine[];
    summary: string;
    documentType: string;
    findings: { text: string; quote: string }[];
    events: { type: TimelineEvent["type"]; title: string; detail: string | null; quote: string }[];
  }) {
    const id = newId();
    const filePath = `${PATIENT_ID}/${id}/${opts.fileName}`;
    const pdf = textPdf(opts.lines);
    await files.put(filePath, pdf, "application/pdf");
    const text = opts.lines.map((l) => l.text).join("\n");
    for (const f of [...opts.findings, ...opts.events]) {
      if (!text.includes(f.quote)) throw new Error(`demo seed quote not in document: ${f.quote}`);
    }
    records.push({
      id,
      patient_id: PATIENT_ID,
      title: opts.title,
      category: opts.category,
      record_date: ymd(opts.date),
      uploaded_by: DEMO_PARENT_ID,
      uploaded_by_name: "Lakshmi",
      file_path: filePath,
      file_name: opts.fileName,
      mime_type: "application/pdf",
      size_bytes: pdf.length,
      extraction_status: "done",
      created_at: iso(opts.date),
    });
    extractions.push({
      id: newId(),
      record_id: id,
      patient_id: PATIENT_ID,
      document_type: opts.documentType,
      document_date: ymd(opts.date),
      summary: opts.summary,
      findings: opts.findings.map((f) => ({ text: f.text, source_quote: f.quote })),
      events: opts.events.map((e) => ({ date: ymd(opts.date), type: e.type, title: e.title, detail: e.detail, source_quote: e.quote })),
      unclear_parts: [],
      extracted_text: text,
      model: "demo-seed (hand-written, fictional)",
      created_at: iso(opts.date),
    });
    for (const e of opts.events) {
      timeline.push({
        id: newId(),
        patient_id: PATIENT_ID,
        event_date: ymd(opts.date),
        type: e.type,
        title: e.title,
        detail: e.detail,
        source: "record",
        source_record_id: id,
        source_quote: e.quote,
        created_at: iso(opts.date),
      });
    }
  }

  const H = (text: string): PdfLine => ({ text, bold: true, size: 15 });
  const B = (text: string): PdfLine => ({ text, bold: true });
  const L = (text: string): PdfLine => ({ text });
  const DEMO = L("*** FICTIONAL DEMO DOCUMENT - NOT A REAL PATIENT ***");

  await addRecord({
    title: "Prescription - General Physician",
    category: "prescription",
    date: rxDate,
    fileName: "prescription.pdf",
    documentType: "Prescription",
    lines: [
      DEMO,
      H("Greenleaf Family Clinic (fictional)"),
      L(`${gpName}, MBBS, MD (General Medicine)`),
      L(`Date: ${longDate(rxDate)}`),
      L("Patient: Lakshmi Raman    Age: 67    Sex: F"),
      L(""),
      B("Diagnosis"),
      L("1. Essential hypertension"),
      L("2. Type 2 diabetes mellitus"),
      L(""),
      B("Rx"),
      L("1. Tab Amlodipine 5 mg - 1 tablet once daily in the morning"),
      L("2. Tab Metformin 500 mg - 1 tablet twice daily after food"),
      L("3. Tab Atorvastatin 10 mg - 1 tablet at night"),
      L(""),
      B("Advice"),
      L("Low salt diet. Walk 30 minutes daily. Check blood sugar every week."),
      L("Review after 3 months with HbA1c and lipid profile."),
    ],
    summary:
      "This is a prescription from your general physician. It lists two conditions — high blood pressure and type 2 diabetes — and three medicines: Amlodipine, Metformin and Atorvastatin.",
    findings: [
      { text: "Diagnoses written: essential hypertension (high blood pressure) and type 2 diabetes.", quote: "1. Essential hypertension" },
      { text: "Amlodipine 5 mg, one tablet every morning.", quote: "Tab Amlodipine 5 mg - 1 tablet once daily in the morning" },
      { text: "Metformin 500 mg, one tablet twice a day after food.", quote: "Tab Metformin 500 mg - 1 tablet twice daily after food" },
      { text: "Atorvastatin 10 mg, one tablet at night.", quote: "Tab Atorvastatin 10 mg - 1 tablet at night" },
      { text: "Advice: low salt diet and a 30-minute daily walk.", quote: "Low salt diet. Walk 30 minutes daily." },
    ],
    events: [
      { type: "visit", title: "General physician visit", detail: "Hypertension and type 2 diabetes noted. Amlodipine, Metformin and Atorvastatin prescribed.", quote: "Review after 3 months with HbA1c and lipid profile." },
    ],
  });

  const bloodDate = dayAt(60, 9);
  await addRecord({
    title: "Blood test - HbA1c and lipids",
    category: "blood_test",
    date: bloodDate,
    fileName: "blood-test.pdf",
    documentType: "Laboratory report",
    lines: [
      DEMO,
      H("Sunrise Diagnostics (fictional)"),
      L(`Patient: Lakshmi Raman   Age/Sex: 68/F   Collected: ${longDate(bloodDate)}`),
      L(`Referred by: ${gpName}`),
      L(""),
      B("Test                          Result      Reference range"),
      L("HbA1c                         7.4 %       4.0 - 5.6 %"),
      L("Fasting blood glucose         142 mg/dL   70 - 100 mg/dL"),
      L("Total cholesterol             176 mg/dL   below 200 mg/dL"),
      L("LDL cholesterol               98 mg/dL    below 100 mg/dL"),
      L("Creatinine                    0.9 mg/dL   0.5 - 1.1 mg/dL"),
      L(""),
      L("Values outside the reference range are reviewed by the referring doctor."),
    ],
    summary:
      "This blood test report shows an HbA1c of 7.4% and a fasting blood sugar of 142 mg/dL, both above the lab's reference range. Cholesterol and creatinine are within the listed ranges.",
    findings: [
      { text: "HbA1c 7.4% (the lab's reference range is 4.0–5.6%).", quote: "HbA1c                         7.4 %       4.0 - 5.6 %" },
      { text: "Fasting blood sugar 142 mg/dL (reference 70–100).", quote: "Fasting blood glucose         142 mg/dL   70 - 100 mg/dL" },
      { text: "LDL cholesterol 98 mg/dL (reference below 100).", quote: "LDL cholesterol               98 mg/dL    below 100 mg/dL" },
      { text: "Creatinine 0.9 mg/dL (within reference range).", quote: "Creatinine                    0.9 mg/dL   0.5 - 1.1 mg/dL" },
    ],
    events: [{ type: "lab_test", title: "Blood test (HbA1c, cholesterol)", detail: "HbA1c 7.4%. Fasting blood sugar 142 mg/dL.", quote: "HbA1c                         7.4 %       4.0 - 5.6 %" }],
  });

  const usgDate = dayAt(44, 10);
  await addRecord({
    title: "Abdominal ultrasound",
    category: "ultrasound",
    date: usgDate,
    fileName: "ultrasound-abdomen.pdf",
    documentType: "Ultrasound report",
    lines: [
      DEMO,
      H("Lotus Imaging Centre (fictional)"),
      B("ULTRASOUND - WHOLE ABDOMEN"),
      L(`Patient: Lakshmi Raman   Age/Sex: 68/F   Date: ${longDate(usgDate)}`),
      L(`Referred by: ${gpName}    Indication: upper abdominal pain after meals`),
      L(""),
      B("Findings"),
      L("Liver: Normal in size (13.2 cm). Mildly increased echogenicity - grade I fatty infiltration."),
      L("Gallbladder: Well distended. Multiple calculi seen in the lumen, the largest measuring"),
      L("approximately 14.9 mm. Wall thickness 3 mm. No pericholecystic fluid."),
      L("Common bile duct: 5 mm, not dilated."),
      L("Pancreas: Visualised parts appear normal."),
      L("Kidneys: Both kidneys normal in size and echotexture. No calculi."),
      L(""),
      B("Impression"),
      L("1. Cholelithiasis - multiple gallbladder calculi, largest approx 14.9 mm."),
      L("2. Grade I fatty liver."),
      L("Suggested clinical correlation."),
      L("Dr. S. Iyer, Radiologist (fictional)"),
    ],
    summary:
      "Your ultrasound report describes multiple gallstones. The largest documented stone was approximately 14.9 mm. The report also mentions a mild (grade I) fatty liver. The gallbladder wall and the bile duct are described as not thickened or widened.",
    findings: [
      { text: "Multiple gallstones in the gallbladder; the largest is about 14.9 mm.", quote: "1. Cholelithiasis - multiple gallbladder calculi, largest approx 14.9 mm." },
      { text: "Gallbladder wall thickness 3 mm, with no fluid around the gallbladder.", quote: "Wall thickness 3 mm. No pericholecystic fluid." },
      { text: "The common bile duct measures 5 mm and is not widened.", quote: "Common bile duct: 5 mm, not dilated." },
      { text: "Mild (grade I) fatty liver.", quote: "2. Grade I fatty liver." },
      { text: "Kidneys look normal, with no stones.", quote: "Kidneys: Both kidneys normal in size and echotexture. No calculi." },
    ],
    events: [
      { type: "imaging", title: "Abdominal ultrasound", detail: "Multiple gallstones. Largest documented stone: 14.9 mm. Grade I fatty liver.", quote: "1. Cholelithiasis - multiple gallbladder calculi, largest approx 14.9 mm." },
    ],
  });

  await addRecord({
    title: "Gastroenterology visit note",
    category: "doctor_note",
    date: giVisit,
    fileName: "gastro-visit.pdf",
    documentType: "Doctor's consultation note",
    lines: [
      DEMO,
      H("City Digestive Care (fictional)"),
      L(`${giName}, MD, DM (Gastroenterology)`),
      L(`Date: ${longDate(giVisit)}`),
      L("Patient: Lakshmi Raman   68/F"),
      L(""),
      B("Complaints"),
      L("Recurrent upper abdominal pain radiating to the back for 4 weeks, mostly after evening"),
      L("meals. Severe episode this morning lasting about 2.5 hours with nausea. No fever reported."),
      L(""),
      B("Background"),
      L("Hypertension, type 2 diabetes. Ultrasound shows multiple gallstones (largest 14.9 mm)."),
      L(""),
      B("Plan"),
      L("1. Admission advised for evaluation and pain control."),
      L("2. Blood tests ordered: liver function tests, serum lipase, complete blood count."),
      L("3. Surgical opinion for cholecystectomy to be discussed after evaluation."),
      L("4. Tab Pantoprazole 40 mg once daily before breakfast."),
      L("5. Return immediately if fever, yellowing of eyes, or persistent vomiting."),
    ],
    summary:
      "This note is from your gastroenterology visit. It records repeated upper abdominal pain going to the back, a severe episode that morning, and the known gallstones. The doctor advised hospital admission for evaluation, ordered blood tests, started Pantoprazole, and wrote that surgery (removing the gallbladder) would be discussed after evaluation.",
    findings: [
      { text: "Upper abdominal pain going to the back for 4 weeks, mostly after evening meals.", quote: "Recurrent upper abdominal pain radiating to the back for 4 weeks, mostly after evening" },
      { text: "Admission was advised for evaluation and pain control.", quote: "1. Admission advised for evaluation and pain control." },
      { text: "Blood tests ordered: liver tests, lipase and blood count.", quote: "2. Blood tests ordered: liver function tests, serum lipase, complete blood count." },
      { text: "Surgery to remove the gallbladder (cholecystectomy) to be discussed after evaluation.", quote: "3. Surgical opinion for cholecystectomy to be discussed after evaluation." },
      { text: "New medicine: Pantoprazole 40 mg before breakfast.", quote: "4. Tab Pantoprazole 40 mg once daily before breakfast." },
      { text: "Warning signs to return for: fever, yellow eyes, or vomiting that keeps happening.", quote: "5. Return immediately if fever, yellowing of eyes, or persistent vomiting." },
    ],
    events: [
      { type: "visit", title: "Gastroenterology visit", detail: "Severe abdominal pain. Admission advised.", quote: "1. Admission advised for evaluation and pain control." },
      { type: "medication", title: "Pantoprazole started", detail: "40 mg once daily before breakfast.", quote: "4. Tab Pantoprazole 40 mg once daily before breakfast." },
    ],
  });

  const audit: AuditEntry[] = [
    { id: newId(), patient_id: PATIENT_ID, actor_id: DEMO_FAMILY_ID, actor_name: "Priya", action: "family_joined", detail: null, created_at: iso(dayAt(89)) },
    { id: newId(), patient_id: PATIENT_ID, actor_id: DEMO_FAMILY_ID, actor_name: "Priya", action: "family_viewed_dashboard", detail: null, created_at: iso(dayAt(1, 19)) },
  ];
  notifications.push({
    id: newId(),
    patient_id: PATIENT_ID,
    family_link_id: link.id,
    kind: "new_report",
    title: "New medical report",
    body: "Lakshmi added a new report: Gastroenterology visit note.",
    params: { name: "Lakshmi", title: "Gastroenterology visit note" },
    read: false,
    created_at: iso(giVisit),
  });

  return {
    profiles,
    patients: [patient],
    family_links: [link],
    medications: meds,
    medication_logs: logs,
    pain_episodes: episodes,
    meals,
    medical_records: records,
    record_extractions: extractions,
    timeline_events: timeline,
    safety_alerts: alerts,
    notifications,
    audit_log: audit,
  };
}
