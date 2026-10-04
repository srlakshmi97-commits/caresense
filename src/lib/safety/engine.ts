// CareSense deterministic safety engine.
//
// Runs BEFORE any AI call and after every pain entry. It uses fixed,
// reviewable rules — never an LLM — so its behaviour is predictable and
// testable. It deliberately errs on the side of escalation: a false alarm
// costs a phone call; a missed emergency can cost a life.
//
// It does NOT diagnose. It only decides "show the urgent-care warning or not".

import type { BodyRegion, PainEpisode, Symptom } from "../types";

export type SafetyRuleId =
  | "chest_pain"
  | "breathing"
  | "fainting"
  | "severe_abdominal"
  | "persistent_vomiting"
  | "confusion"
  | "severe_weakness"
  | "bleeding"
  | "neuro"
  | "allergy"
  | "jaundice_fever"
  | "very_severe_pain"
  | "abdominal_with_fever_or_vomiting"
  | "head_with_dizziness_or_vomiting"
  | "self_harm";

export interface SafetyResult {
  urgent: boolean;
  /** "crisis" = self-harm language; UI shows supportive crisis copy. */
  kind: "none" | "medical" | "crisis";
  rules: SafetyRuleId[];
}

const NONE: SafetyResult = { urgent: false, kind: "none", rules: [] };

// ── Free-text rules (chat messages, notes) ──────────────────────────────
// Patterns are matched against lower-cased text with punctuation collapsed.
interface TextRule {
  id: SafetyRuleId;
  patterns: RegExp[];
}

const W = "(?:\\w+\\s+){0,3}"; // up to three filler words between terms

const TEXT_RULES: TextRule[] = [
  {
    id: "chest_pain",
    patterns: [
      new RegExp(`chest\\s+${W}(pain|pains|pressure|tightness|tight|hurts?|hurting|ache|aching|heavy|heaviness|squeez)`),
      new RegExp(`(pain|pressure|tightness|ache|heaviness)\\s+${W}(in|on|across)\\s+(my\\s+|the\\s+)?chest`),
      /heart attack/,
    ],
  },
  {
    id: "breathing",
    patterns: [
      /(can'?t|cannot|can not|unable to|hard to|difficult to|struggling to|trouble|difficulty|problem)\s+(\w+\s+){0,2}breath/,
      /short(ness)? of breath/,
      /breathing (difficulty|problem|trouble)/,
      /breathless/,
      /gasping/,
      /not able to breathe/,
    ],
  },
  {
    id: "fainting",
    patterns: [/\bfaint(ed|ing)?\b/, /passed out/, /black(ed)? out/, /lost consciousness/, /\bunconscious\b/, /\bcollapsed?\b/],
  },
  {
    id: "severe_abdominal",
    patterns: [
      new RegExp(`(severe|terrible|unbearable|worst|very bad|extreme|excruciating|intense|horrible)\\s+${W}(abdominal|abdomen|stomach|belly|tummy)\\s*(pain|ache)?`),
      new RegExp(`(abdominal|abdomen|stomach|belly|tummy)\\s+(pain|ache)\\s+${W}(severe|unbearable|worst|very bad|extreme|excruciating|intense)`),
    ],
  },
  {
    id: "persistent_vomiting",
    patterns: [
      /(keep|keeps|kept|can'?t stop|cannot stop|non ?stop|continuous(ly)?|persistent|repeated(ly)?|constant(ly)?)\s+(\w+\s+){0,1}(vomit|throwing up|being sick)/,
      /(vomit(ing|ed)?|threw up|throwing up)\s+(\w+\s+){0,3}(all day|all night|many times|again and again|repeatedly|\d+ times|several times|since (yesterday|morning|last night))/,
      /can'?t keep (anything|food|water|fluids) down/,
    ],
  },
  {
    id: "confusion",
    patterns: [/\bconfus(ed|ion)\b/, /disoriented/, /not making sense/, /can'?t think (clearly|straight)/, /don'?t know where i am/],
  },
  {
    id: "severe_weakness",
    patterns: [
      /(severe|extreme|very|really) weak/,
      /too weak to/,
      /(can'?t|cannot|unable to) (stand up|get up|get out of bed|walk|move my)/,
    ],
  },
  {
    id: "bleeding",
    patterns: [
      /blood\s+(\w+\s+){0,2}(vomit|stool|stools|poo|poop|motion|urine|pee|sick)/,
      /(vomit(ing|ed)?|threw up|throwing up|coughing|coughed|cough)\s+(up\s+)?(\w+\s+){0,1}blood/,
      /bloody (stool|vomit|poo|diarrh)/,
      /black(,| and)? (tarry )?(stool|poo|motion)/,
      /tarry stool/,
    ],
  },
  {
    id: "neuro",
    patterns: [
      /face (is )?(droop|drooping|dropped)/,
      /slurred speech|speech is slurred|slurring/,
      /(can'?t|cannot|unable to) (speak|talk) (properly|clearly|normally)|(trouble|difficulty) (speaking|talking)/,
      /numb(ness)?\s+(\w+\s+){0,2}(one side|left side|right side|arm|leg|face)/,
      /sudden (weakness|numbness|confusion|trouble)/,
      /(worst|sudden|severe|thunderclap) headache/,
      /(lost|losing|loss of|sudden) (vision|sight)|(sudden(ly)?|can'?t) see (anything|properly)/,
      /seizure|convulsion/,
    ],
  },
  {
    id: "allergy",
    patterns: [
      /(throat|tongue|lips?|face|mouth)\s+(\w+\s+){0,2}(swell|swelling|swollen|closing)/,
      /swollen (throat|tongue|lips?|face)/,
      /anaphyla/,
      /allergic reaction/,
      /hives\s+(\w+\s+){0,4}(breath|swell)/,
    ],
  },
  {
    id: "jaundice_fever",
    patterns: [
      /(yellow (eyes|skin)|jaundice|eyes (are|look|turned) yellow|skin (is|looks|turned) yellow)(.{0,60})(fever|chills|temperature)/,
      /(fever|chills|temperature)(.{0,60})(yellow (eyes|skin)|jaundice|eyes (are|look|turned) yellow|skin (is|looks|turned) yellow)/,
    ],
  },
  {
    id: "self_harm",
    patterns: [/kill myself/, /end my life/, /suicid/, /want to die/, /want to hurt myself/, /harm myself/, /no reason to live/],
  },
];

// Negations immediately before a match ("no chest pain", "not dizzy")
// suppress it. Kept deliberately narrow so real symptoms are not missed.
const NEGATION = /(\bno|\bnot|\bnever|\bwithout|\bdon'?t have|\bdo not have|\bdidn'?t have|\bnor)\s+(any\s+)?$/;

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkText(input: string): SafetyResult {
  const text = normalise(input);
  if (!text) return NONE;
  const rules: SafetyRuleId[] = [];
  for (const rule of TEXT_RULES) {
    for (const pattern of rule.patterns) {
      const re = new RegExp(pattern.source, "g");
      let m: RegExpExecArray | null;
      let hit = false;
      while ((m = re.exec(text))) {
        const before = text.slice(Math.max(0, m.index - 25), m.index);
        if (!NEGATION.test(before)) {
          hit = true;
          break;
        }
        if (m[0].length === 0) re.lastIndex++;
      }
      if (hit) {
        rules.push(rule.id);
        break;
      }
    }
  }
  return toResult(rules);
}

// ── Structured pain-episode rules ───────────────────────────────────────
type EpisodeInput = Pick<PainEpisode, "locations" | "severity_score" | "symptoms"> & {
  notes?: string | null;
  other_location?: string | null;
};

const ABDOMEN: BodyRegion[] = ["upper_abdomen", "lower_abdomen", "right_side", "left_side"];

export function checkPainEpisode(ep: EpisodeInput): SafetyResult {
  const rules = new Set<SafetyRuleId>();
  const has = (s: Symptom) => ep.symptoms.includes(s);
  const at = (r: BodyRegion) => ep.locations.includes(r);
  const score = ep.severity_score;

  if (at("chest") && score >= 5) rules.add("chest_pain");
  if (at("chest") && (has("breathing_difficulty") || has("dizziness"))) rules.add("chest_pain");
  if (has("breathing_difficulty")) rules.add("breathing");
  if (score >= 9) rules.add("very_severe_pain");
  if (ep.locations.some((l) => ABDOMEN.includes(l)) && score >= 7 && (has("fever") || has("chills") || has("vomiting"))) {
    rules.add("abdominal_with_fever_or_vomiting");
  }
  // Fever + chills with right-sided / upper abdominal pain can signal a
  // complication in people with gallstones — escalate from moderate pain.
  if ((at("upper_abdomen") || at("right_side")) && score >= 5 && has("fever") && has("chills")) {
    rules.add("abdominal_with_fever_or_vomiting");
  }
  if (at("head") && score >= 7 && (has("dizziness") || has("vomiting"))) rules.add("head_with_dizziness_or_vomiting");
  if (has("weakness") && score >= 9) rules.add("severe_weakness");

  // Free-text parts of the entry go through the text rules too.
  const extra = [ep.notes, ep.other_location].filter(Boolean).join(". ");
  if (extra) checkText(extra).rules.forEach((r) => rules.add(r));

  return toResult([...rules]);
}

function toResult(rules: SafetyRuleId[]): SafetyResult {
  if (rules.length === 0) return NONE;
  const kind = rules.every((r) => r === "self_harm") ? "crisis" : "medical";
  return { urgent: true, kind, rules };
}

// ── Medication-change guard ─────────────────────────────────────────────
// Questions about stopping / changing / skipping prescribed medicines get a
// fixed answer pointing to the prescriber. The AI is never asked.
const MED_CHANGE: RegExp[] = [
  /(can|should|may|could) i (stop|quit|skip|reduce|increase|double|halve|cut|change|lower|raise|take less|take more|take extra|take half)/,
  /(stop|quit|skip|reduce|increase|double|halve|cut down|change|lower|raise) (taking |the |my )?(\w+ ){0,2}(medicine|medication|tablet|pill|dose|dosage|insulin|drug|prescription)/,
  /(is it ok|is it okay|is it safe|okay|ok) to (stop|skip|quit|reduce|increase|double|change)/,
  /(how much|how many|what dose|which dose) (\w+ ){0,2}should i (take|have|use|inject)/,
  /take (two|2|double|extra|more|less|half)( \w+)? (tablet|tablets|pills?|dose|doses)/,
  /(stop|skip|quit) (taking )?(my )?(metformin|amlodipine|telmisartan|atorvastatin|ursodiol|insulin|aspirin|\w+pril|\w+sartan|\w+olol|\w+statin|\w+pine)/,
];

export function isMedicationChangeQuestion(input: string): boolean {
  const text = normalise(input);
  return MED_CHANGE.some((re) => re.test(text));
}
