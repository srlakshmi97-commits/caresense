// Domain types. Field names match the Postgres columns in supabase/schema.sql
// so the same rows flow through both the demo store and Supabase.

export type Role = "parent" | "family";

export interface Profile {
  id: string;
  role: Role;
  display_name: string;
  phone: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  owner_id: string;
  name: string;
  date_of_birth: string | null; // YYYY-MM-DD; age is always computed from this
  sex: Sex | null;
  preferred_language: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_number: string;
  conditions: string[];
  /** Past medical history: operations, hospital stays, past illnesses (free text, user-entered). */
  past_history: string[];
  allergies: string[];
  protein_goal_g: number | null;
  protein_goal_set_by: string | null;
  onboarded: boolean;
  created_at: string;
}

export const SEXES = ["female", "male", "other"] as const;
export type Sex = (typeof SEXES)[number];

/** Whole years between a YYYY-MM-DD birth date and today. */
export function ageFrom(dob: string | null | undefined, now = new Date()): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age >= 0 && age < 130 ? age : null;
}

export const PERMISSION_KEYS = ["symptoms", "meals", "medications", "records", "timeline", "alerts"] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type Permissions = Record<PermissionKey, boolean>;

export const ALERT_KEYS = ["pain", "medication", "emergency", "new_report"] as const;
export type AlertKey = (typeof ALERT_KEYS)[number];
export type AlertPrefs = Record<AlertKey, boolean>;

export type LinkStatus = "pending" | "active" | "revoked";

export interface FamilyLink {
  id: string;
  patient_id: string;
  family_profile_id: string | null;
  family_name: string;
  family_phone: string | null;
  relationship: string;
  invite_code: string;
  status: LinkStatus;
  permissions: Permissions;
  alert_prefs: AlertPrefs;
  created_at: string;
  revoked_at: string | null;
}

// Coarse body areas. Used by the safety engine and as the accessible list.
// Specific muscles (lib/body/muscles.ts) always map onto one of these.
export const BODY_REGIONS = [
  "head",
  "neck",
  "shoulders",
  "chest",
  "upper_abdomen",
  "lower_abdomen",
  "right_side",
  "left_side",
  "upper_back",
  "back",
  "arms",
  "hands",
  "hips",
  "legs",
  "knees",
  "feet",
  "other",
] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];

export const SEVERITY_LEVELS = ["none", "mild", "moderate", "strong", "very_strong"] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];
/** Numeric 0–10 score stored alongside the friendly level. */
export const SEVERITY_SCORE: Record<SeverityLevel, number> = {
  none: 0,
  mild: 2,
  moderate: 5,
  strong: 7,
  very_strong: 9,
};

export const PAIN_TRIGGERS = ["ate_food", "took_medicine", "exercised", "woke_up", "nothing", "other"] as const;
export type PainTrigger = (typeof PAIN_TRIGGERS)[number];

export const SYMPTOMS = [
  "nausea",
  "vomiting",
  "fever",
  "chills",
  "dizziness",
  "breathing_difficulty",
  "weakness",
  "diarrhea",
  "constipation",
  "none",
] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export interface PainEpisode {
  id: string;
  patient_id: string;
  locations: BodyRegion[];
  /** Specific muscles tapped on the muscle map, e.g. "r.deltoid" (see lib/body/muscles.ts). */
  muscles: string[];
  other_location: string | null;
  severity_level: SeverityLevel;
  severity_score: number;
  started_at: string;
  ongoing: boolean;
  ended_at: string | null;
  triggers: PainTrigger[];
  trigger_other: string | null;
  symptoms: Symptom[];
  notes: string | null;
  safety_rules: string[];
  created_at: string;
  updated_at: string;
}

export const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface MealItem {
  food_key: string; // catalog key, "ai" (AI-recognised dish) or "custom"
  label: string; // display label (what the user called it)
  quantity: string; // portion key (catalog key, or "half_bowl" / "bowl" / "two_bowls" / "piece"…)
  quantity_label?: string | null; // human portion text when not a catalog portion
  protein_g: number | null; // estimate; null when unknown
  protein_source?: "catalog" | "ai" | null;
  ingredients?: string[]; // AI-identified typical ingredients (informational)
}

export interface Meal {
  id: string;
  patient_id: string;
  meal_type: MealType;
  eaten_at: string;
  items: MealItem[];
  notes: string | null;
  protein_est_g: number | null;
  created_at: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  purpose: string | null;
  dosage: string;
  frequency: string;
  times: string[]; // "HH:MM" 24h
  instructions: string | null;
  prescriber: string | null;
  start_date: string | null;
  end_date: string | null;
  important: boolean;
  active: boolean;
  created_at: string;
}

export const MED_STATUSES = ["taken", "skipped", "unsure"] as const;
export type MedStatus = (typeof MED_STATUSES)[number];

export interface MedicationLog {
  id: string;
  patient_id: string;
  medication_id: string;
  scheduled_date: string; // YYYY-MM-DD (patient-local)
  scheduled_time: string; // HH:MM
  status: MedStatus;
  logged_at: string;
}

export const RECORD_CATEGORIES = [
  "blood_test",
  "ultrasound",
  "ct_mri",
  "prescription",
  "discharge_summary",
  "doctor_note",
  "surgery",
  "other",
] as const;
export type RecordCategory = (typeof RECORD_CATEGORIES)[number];

export type ExtractionStatus = "pending" | "done" | "unreadable" | "unavailable";

export interface MedicalRecord {
  id: string;
  patient_id: string;
  title: string;
  category: RecordCategory;
  record_date: string | null;
  uploaded_by: string;
  uploaded_by_name: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  extraction_status: ExtractionStatus;
  created_at: string;
}

export interface SourcedFact {
  text: string;
  source_quote: string;
}

export const TIMELINE_TYPES = [
  "diagnosis",
  "visit",
  "lab_test",
  "imaging",
  "medication",
  "admission",
  "surgery",
  "symptom",
  "other",
] as const;
export type TimelineType = (typeof TIMELINE_TYPES)[number];

export interface ExtractedEvent {
  date: string; // YYYY-MM-DD, only when the document states it
  type: TimelineType;
  title: string;
  detail: string | null;
  source_quote: string;
}

export interface RecordExtraction {
  id: string;
  record_id: string;
  patient_id: string;
  document_type: string | null;
  document_date: string | null;
  summary: string;
  findings: SourcedFact[];
  events: ExtractedEvent[];
  unclear_parts: string[];
  extracted_text: string;
  model: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  patient_id: string;
  event_date: string; // YYYY-MM-DD
  type: TimelineType;
  title: string;
  detail: string | null;
  source: "record" | "manual";
  source_record_id: string | null;
  source_quote: string | null;
  created_at: string;
}

export interface SafetyAlert {
  id: string;
  patient_id: string;
  source: "pain" | "chat";
  rules: string[];
  pain_episode_id: string | null;
  created_at: string;
}

export type NotificationKind = "pain" | "medication" | "emergency" | "new_report";

export interface Notification {
  id: string;
  patient_id: string;
  family_link_id: string;
  kind: NotificationKind;
  /** English fallback text; the app renders `kind` + `params` in the reader's own language. */
  title: string;
  body: string;
  params: Record<string, string>;
  read: boolean;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  patient_id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface CheckIn {
  id: string;
  patient_id: string;
  check_date: string; // YYYY-MM-DD patient-local
  feeling: "fine";
  created_at: string;
}

/** Row map used by the storage layer. */
export interface Tables {
  profiles: Profile;
  check_ins: CheckIn;
  patients: Patient;
  family_links: FamilyLink;
  pain_episodes: PainEpisode;
  meals: Meal;
  medications: Medication;
  medication_logs: MedicationLog;
  medical_records: MedicalRecord;
  record_extractions: RecordExtraction;
  timeline_events: TimelineEvent;
  safety_alerts: SafetyAlert;
  notifications: Notification;
  audit_log: AuditEntry;
}
export type TableName = keyof Tables;
