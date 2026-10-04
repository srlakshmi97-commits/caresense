import { test } from "node:test";
import assert from "node:assert/strict";
import { dueDoses, shouldNotify } from "./reminders";
import type { Medication, MedicationLog } from "../types";

const med = (id: string, times: string[], extra: Partial<Medication> = {}): Medication => ({
  id, patient_id: "p", name: id, purpose: null, dosage: "1 tablet", frequency: "", times, instructions: null,
  prescriber: null, start_date: null, end_date: null, important: false, active: true, created_at: "", ...extra,
});
const log = (medication_id: string, time: string, status: MedicationLog["status"] = "taken"): MedicationLog => ({
  id: medication_id + time, patient_id: "p", medication_id, scheduled_date: "2026-10-04", scheduled_time: time, status, logged_at: "",
});

test("a dose becomes due at its time and stays due until it is marked", () => {
  const meds = [med("metformin", ["08:00", "20:00"]), med("amlodipine", ["08:00"])];
  assert.deepEqual(dueDoses(meds, [], "2026-10-04", "07:59").map((d) => d.medication.id), []);
  assert.deepEqual(dueDoses(meds, [], "2026-10-04", "08:00").map((d) => d.medication.id), ["metformin", "amlodipine"]);
  const afterOne = dueDoses(meds, [log("metformin", "08:00")], "2026-10-04", "08:30");
  assert.deepEqual(afterOne.map((d) => d.medication.id), ["amlodipine"]);
  assert.equal(afterOne[0].minutesLate, 30);
});

test("skipped / not-sure also clear the reminder (she answered it)", () => {
  const meds = [med("a", ["08:00"])];
  assert.equal(dueDoses(meds, [log("a", "08:00", "skipped")], "2026-10-04", "09:00").length, 0);
  assert.equal(dueDoses(meds, [log("a", "08:00", "unsure")], "2026-10-04", "09:00").length, 0);
});

test("stopped, not-yet-started and finished medicines never remind", () => {
  const d = "2026-10-04";
  assert.equal(dueDoses([med("a", ["08:00"], { active: false })], [], d, "09:00").length, 0);
  assert.equal(dueDoses([med("a", ["08:00"], { start_date: "2026-10-05" })], [], d, "09:00").length, 0);
  assert.equal(dueDoses([med("a", ["08:00"], { end_date: "2026-10-03" })], [], d, "09:00").length, 0);
  assert.equal(dueDoses([med("a", [])], [], d, "09:00").length, 0);
});

test("notifications: first at dose time, one more after 30 minutes, then stop", () => {
  const dose = { medication: med("a", ["08:00"]), time: "08:00", minutesLate: 0 };
  const t0 = 1_000_000_000;
  assert.equal(shouldNotify(dose, undefined, t0), true);
  assert.equal(shouldNotify(dose, { count: 1, last: t0 }, t0 + 10 * 60000), false);
  assert.equal(shouldNotify(dose, { count: 1, last: t0 }, t0 + 30 * 60000), true);
  assert.equal(shouldNotify(dose, { count: 2, last: t0 }, t0 + 120 * 60000), false);
});

test("no notification for a dose that is already hours late", () => {
  const dose = { medication: med("a", ["08:00"]), time: "08:00", minutesLate: 300 };
  assert.equal(shouldNotify(dose, undefined, Date.now()), false);
});
