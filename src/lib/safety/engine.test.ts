import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPainEpisode, checkText, isMedicationChangeQuestion } from "./engine";

const urgent = (s: string) => checkText(s).urgent;

test("red-flag phrases escalate", () => {
  const cases: [string, string][] = [
    ["I have chest pain since morning", "chest_pain"],
    ["there is a lot of pressure in my chest", "chest_pain"],
    ["I can't breathe properly", "breathing"],
    ["feeling short of breath when I walk", "breathing"],
    ["I fainted in the bathroom", "fainting"],
    ["My father passed out", "fainting"],
    ["severe stomach pain, worst ever", "severe_abdominal"],
    ["I keep vomiting", "persistent_vomiting"],
    ["vomited 5 times since morning", "persistent_vomiting"],
    ["I feel confused and dizzy", "confusion"],
    ["I am too weak to get up", "severe_weakness"],
    ["I saw blood in my stool", "bleeding"],
    ["I was vomiting blood", "bleeding"],
    ["my face is drooping and speech is slurred", "neuro"],
    ["sudden severe headache", "neuro"],
    ["my throat is swelling after the tablet", "allergy"],
    ["my eyes are yellow and I have a fever", "jaundice_fever"],
    ["I want to end my life", "self_harm"],
  ];
  for (const [text, rule] of cases) {
    const r = checkText(text);
    assert.ok(r.urgent, `expected urgent for: ${text}`);
    assert.ok(r.rules.includes(rule as never), `expected ${rule} for: ${text} (got ${r.rules})`);
  }
});

test("ordinary questions do not escalate", () => {
  for (const text of [
    "What does my ultrasound report mean?",
    "What medicines am I taking?",
    "When was my last episode of pain?",
    "Can you explain this medical term: gallstones?",
    "I have no chest pain today",
    "I did not faint",
    "What should I ask my doctor?",
    "I can't stand this bitter tablet taste",
    "Does this food fit my diet? What are the benefits of dal?",
    "I can't see the report clearly on my screen",
  ]) {
    assert.equal(urgent(text), false, `unexpected escalation for: ${text}`);
  }
});

test("self-harm alone is classified as crisis", () => {
  assert.equal(checkText("I want to die").kind, "crisis");
  assert.equal(checkText("chest pain and I want to die").kind, "medical");
});

test("pain episodes: Journey 5 — severe abdominal pain with fever and vomiting", () => {
  const r = checkPainEpisode({ locations: ["upper_abdomen", "back"], severity_score: 9, symptoms: ["fever", "vomiting"] });
  assert.ok(r.urgent);
  assert.ok(r.rules.includes("abdominal_with_fever_or_vomiting"));
  assert.ok(r.rules.includes("very_severe_pain"));
});

test("pain episodes: chest pain moderate or above escalates", () => {
  assert.ok(checkPainEpisode({ locations: ["chest"], severity_score: 5, symptoms: [] }).urgent);
  assert.ok(checkPainEpisode({ locations: ["chest"], severity_score: 2, symptoms: ["dizziness"] }).urgent);
});

test("pain episodes: moderate abdominal pain without red flags does not escalate", () => {
  const r = checkPainEpisode({ locations: ["upper_abdomen"], severity_score: 5, symptoms: ["nausea"] });
  assert.equal(r.urgent, false);
});

test("pain episodes: fever + chills with right-sided pain escalates", () => {
  assert.ok(checkPainEpisode({ locations: ["right_side"], severity_score: 5, symptoms: ["fever", "chills"] }).urgent);
});

test("pain episodes: notes go through text rules", () => {
  assert.ok(checkPainEpisode({ locations: ["back"], severity_score: 2, symptoms: [], notes: "saw blood in vomit" }).urgent);
});

test("medication-change guard", () => {
  for (const q of [
    "Can I stop this medicine?",
    "Should I stop taking metformin?",
    "is it ok to skip my blood pressure tablet today",
    "Can I double the dose?",
    "how much insulin should I take",
  ]) {
    assert.ok(isMedicationChangeQuestion(q), q);
  }
  for (const q of ["What medicines am I taking?", "What is amlodipine for?", "When do I take my evening tablet?"]) {
    assert.equal(isMedicationChangeQuestion(q), false, q);
  }
});
