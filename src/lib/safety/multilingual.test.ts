import { test } from "node:test";
import assert from "node:assert/strict";
import { screenMessage, looksLikeGibberish } from "./screen";

const urgent = (s: string, english?: string) => screenMessage(s, english).safety;

test("red flags in Indian languages escalate without AI", () => {
  const cases: [string, string][] = [
    ["எனக்கு நெஞ்சு வலி இருக்கு", "chest_pain"],
    ["nenju valikuthu", "chest_pain"],
    ["மூச்சு திணறல் அதிகமா இருக்கு", "breathing"],
    ["அம்மா மயங்கி விழுந்துட்டாங்க", "fainting"],
    ["ரத்த வாந்தி வந்தது", "bleeding"],
    ["मुझे सीने में दर्द है", "chest_pain"],
    ["seene me dard ho raha hai", "chest_pain"],
    ["सांस लेने में तकलीफ हो रही है", "breathing"],
    ["खून की उल्टी हुई", "bleeding"],
    ["ఛాతీ నొప్పి గా ఉంది", "chest_pain"],
    ["നെഞ്ചുവേദന ഉണ്ട്", "chest_pain"],
    ["ಎದೆ ನೋವು ಇದೆ", "chest_pain"],
    ["மஞ்சள் காமாலை மாதிரி கண் மஞ்சளா இருக்கு, காய்ச்சலும் இருக்கு", "jaundice_fever"],
    ["मैं आत्महत्या के बारे में सोच रही हूँ", "self_harm"],
  ];
  for (const [text, rule] of cases) {
    const r = urgent(text);
    assert.ok(r.urgent, `expected urgent: ${text}`);
    assert.ok(r.rules.includes(rule as never), `expected ${rule} for ${text}, got ${r.rules}`);
  }
});

test("English translation of a message is also screened", () => {
  // e.g. a phrasing not in the phrase list, translated by the AI layer
  const r = urgent("அம்மாவுக்கு பேச முடியல, ஒரு கை தூக்க முடியல", "Mother can't speak properly and can't lift one arm, sudden weakness");
  assert.ok(r.urgent);
});

test("ordinary Indian-language questions do not escalate", () => {
  for (const text of ["என் மருந்துகள் என்ன?", "மதியம் சாப்பிட்டேன்", "मेरी रिपोर्ट का क्या मतलब है?", "ఈ రోజు బాగున్నాను", "sugar test report enna solluthu"]) {
    assert.equal(urgent(text).urgent, false, text);
  }
});

test("medicine-change questions in Indian languages go to the prescriber", () => {
  for (const q of ["இந்த மாத்திரையை நிறுத்தலாமா?", "maathirai niruthalama", "क्या मैं यह दवा बंद कर दूं?", "ఈ మందు ఆపేయవచ్చా?", "ഈ മരുന്ന് നിർത്താമോ?", "ಈ ಮಾತ್ರೆ ನಿಲ್ಲಿಸಬಹುದಾ?"]) {
    assert.ok(screenMessage(q).medChange, q);
  }
  assert.equal(screenMessage("என் மருந்துகள் என்ன?").medChange, false);
});

test("gibberish detection", () => {
  assert.ok(looksLikeGibberish("nvgfbhj"));
  assert.ok(looksLikeGibberish("sdfg hjkl"));
  assert.equal(looksLikeGibberish("nenju vali"), false);
  assert.equal(looksLikeGibberish("What medicines am I taking?"), false);
  assert.equal(looksLikeGibberish("நெஞ்சு"), false);
});
