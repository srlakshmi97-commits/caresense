import { test } from "node:test";
import assert from "node:assert/strict";
import { groundAnswer, groundExtraction, looksLikeMedInstruction } from "./grounding";

const ULTRASOUND = {
  id: "rec-usg",
  title: "Abdominal ultrasound",
  text: [
    "Gallbladder: Well distended. Multiple calculi seen in the lumen, the largest measuring",
    "approximately 14.9 mm. Wall thickness 3 mm. No pericholecystic fluid.",
    "Common bile duct: 5 mm, not dilated.",
    "1. Cholelithiasis - multiple gallbladder calculi, largest approx 14.9 mm.",
    "2. Grade I fatty liver.",
  ].join("\n"),
};

test("Journey 4: documented claims survive only when quoted from the real report", () => {
  const r = groundAnswer(
    {
      insufficient_information: false,
      escalate: false,
      sections: [
        { kind: "documented", text: "Your report says there are several gallstones; the largest is about 14.9 mm.", record_id: "rec-usg", quote: "largest approx 14.9 mm" },
        // invented value — quote not in the document → must be dropped
        { kind: "documented", text: "Your report says your gallbladder wall is 6 mm thick.", record_id: "rec-usg", quote: "Wall thickness 6 mm" },
        // cites a document that doesn't exist → dropped
        { kind: "documented", text: "Your CT scan shows inflammation.", record_id: "rec-ct", quote: "inflammation" },
        // quote across a line break still matches after whitespace normalisation
        { kind: "documented", text: "The report measured the largest stone.", record_id: "rec-usg", quote: "the largest measuring approximately 14.9 mm" },
        { kind: "general", text: "In general, gallstones are hard deposits that form in the gallbladder.", record_id: null, quote: null },
        { kind: "suggestion", text: "You may want to ask your doctor whether the stones need treatment.", record_id: null, quote: null },
      ],
    },
    [ULTRASOUND],
  );
  assert.equal(r.insufficient, false);
  assert.deepEqual(r.sections.map((s) => s.kind), ["documented", "documented", "general", "suggestion"]);
  assert.ok(r.sections.every((s) => !s.text.includes("6 mm") && !s.text.includes("CT")));
  assert.equal(r.sections[0].record_title, "Abdominal ultrasound");
});

test("Journey 8: model says it lacks information → insufficient, no sections shown", () => {
  const r = groundAnswer(
    { insufficient_information: true, escalate: false, sections: [{ kind: "general", text: "Maybe it is fine.", record_id: null, quote: null }] },
    [ULTRASOUND],
  );
  assert.equal(r.insufficient, true);
  assert.equal(r.sections.length, 0);
});

test("Journey 8: if every claim is ungrounded, the answer becomes insufficient", () => {
  const r = groundAnswer(
    { insufficient_information: false, escalate: false, sections: [{ kind: "documented", text: "Your potassium was 5.9.", record_id: "rec-usg", quote: "Potassium 5.9" }] },
    [ULTRASOUND],
  );
  assert.equal(r.insufficient, true);
});

test("medication instructions from the model are removed", () => {
  assert.ok(looksLikeMedInstruction("You can stop taking metformin when your sugar is normal."));
  assert.ok(looksLikeMedInstruction("You should double the dose tonight."));
  assert.equal(looksLikeMedInstruction("Please do not stop taking any medicine before talking to your doctor."), false);
  const r = groundAnswer(
    {
      insufficient_information: false,
      escalate: false,
      sections: [
        { kind: "general", text: "You should reduce your dose of amlodipine.", record_id: null, quote: null },
        { kind: "suggestion", text: "You may want to ask your doctor about your blood pressure medicine.", record_id: null, quote: null },
      ],
    },
    [],
  );
  assert.equal(r.sections.length, 1);
  assert.equal(r.sections[0].kind, "suggestion");
});

test("extraction: ungrounded findings and undated events are discarded", () => {
  const g = groundExtraction(
    ULTRASOUND.text,
    [
      { text: "Largest stone 14.9 mm", source_quote: "largest approx 14.9 mm" },
      { text: "Stone 20 mm", source_quote: "largest approx 20 mm" },
    ],
    [
      { date: "2026-08-12", source_quote: "2. Grade I fatty liver." },
      { date: null, source_quote: "2. Grade I fatty liver." },
      { date: "12 Aug", source_quote: "2. Grade I fatty liver." },
      { date: "2026-08-12", source_quote: "Liver abscess" },
    ],
  );
  assert.equal(g.findings.length, 1);
  assert.equal(g.events.length, 1);
});
