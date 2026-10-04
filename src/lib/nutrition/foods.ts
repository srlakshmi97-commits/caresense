// Food catalogue for the minimal-typing food tracker.
//
// Protein values are rough household-portion ESTIMATES (grams) for typical
// home cooking, based on common Indian food-composition references. They are
// informational only and always labelled as estimates in the UI.
//
// `names` lets people search in any supported language or romanised spelling
// ("sadam", "சாதம்", "chawal", "అన్నం" all find rice).

export const PORTIONS = [
  "half_bowl",
  "bowl",
  "two_bowls",
  "small_plate",
  "plate",
  "piece",
  "two_pieces",
  "glass",
  "cup",
  "handful",
  "two_handfuls",
] as const;
export type Portion = (typeof PORTIONS)[number];

export interface FoodQuantity {
  key: string;
  /** Countable foods: "3" idli. Otherwise a named portion. */
  count?: number;
  portion?: Portion;
  protein_g: number;
}

export interface Food {
  key: string;
  emoji: string;
  common: boolean;
  names: string[];
  quantities: FoodQuantity[];
}

const n = (count: number, perItem: number): FoodQuantity => ({ key: String(count), count, protein_g: Math.round(count * perItem * 10) / 10 });
const p = (portion: Portion, protein_g: number): FoodQuantity => ({ key: portion, portion, protein_g });

export const FOODS: Food[] = [
  { key: "rice", emoji: "🍚", common: true, names: ["rice", "sadam", "saadham", "chawal", "annam", "choru", "anna", "சாதம்", "அரிசி", "चावल", "అన్నం", "ചോറ്", "ಅನ್ನ"], quantities: [p("half_bowl", 2), p("bowl", 4), p("two_bowls", 8)] },
  { key: "idli", emoji: "⚪", common: true, names: ["idli", "idly", "இட்லி", "इडली", "ఇడ్లీ", "ഇഡ്ഡലി", "ಇಡ್ಲಿ"], quantities: [n(1, 2), n(2, 2), n(3, 2), n(4, 2)] },
  { key: "dosa", emoji: "🫓", common: true, names: ["dosa", "dosai", "தோசை", "डोसा", "దోశ", "ദോശ", "ದೋಸೆ"], quantities: [n(1, 3), n(2, 3), n(3, 3)] },
  { key: "chapati", emoji: "🫓", common: true, names: ["chapati", "chapathi", "roti", "phulka", "சப்பாத்தி", "रोटी", "चपाती", "చపాతీ", "ചപ്പാത്തി", "ಚಪಾತಿ"], quantities: [n(1, 3), n(2, 3), n(3, 3), n(4, 3)] },
  { key: "sambar", emoji: "🍲", common: true, names: ["sambar", "sambhar", "சாம்பார்", "सांभर", "సాంబార్", "సాంబారు", "സാമ്പാർ", "ಸಾಂಬಾರ್"], quantities: [p("half_bowl", 3), p("bowl", 6)] },
  { key: "dal", emoji: "🥣", common: true, names: ["dal", "dhal", "paruppu", "pappu", "parippu", "bele", "பருப்பு", "दाल", "పప్పు", "പരിപ്പ്", "ಬೇಳೆ"], quantities: [p("half_bowl", 4), p("bowl", 8), p("two_bowls", 16)] },
  { key: "curd", emoji: "🥣", common: true, names: ["curd", "thayir", "dahi", "yogurt", "perugu", "mosaru", "thairu", "தயிர்", "दही", "పెరుగు", "തൈര്", "ಮೊಸರು"], quantities: [p("half_bowl", 3), p("bowl", 6)] },
  { key: "milk", emoji: "🥛", common: true, names: ["milk", "paal", "doodh", "palu", "haalu", "பால்", "दूध", "పాలు", "പാൽ", "ಹಾಲು"], quantities: [p("cup", 5), p("glass", 7)] },
  { key: "egg", emoji: "🥚", common: true, names: ["egg", "muttai", "anda", "guddu", "motte", "mutta", "முட்டை", "अंडा", "గుడ్డు", "മുട്ട", "ಮೊಟ್ಟೆ"], quantities: [n(1, 6), n(2, 6)] },
  { key: "vegetables", emoji: "🥦", common: true, names: ["vegetables", "vegetable", "kaikari", "sabzi", "sabji", "காய்கறி", "सब्जी", "కూరగాయలు", "പച്ചക്കറി", "ತರಕಾರಿ"], quantities: [p("half_bowl", 1), p("bowl", 2), p("two_bowls", 4)] },
  { key: "fruit", emoji: "🍎", common: true, names: ["fruit", "fruits", "pazham", "phal", "pandu", "hannu", "பழம்", "फल", "పండు", "ಹಣ್ಣು"], quantities: [p("piece", 1), p("bowl", 2)] },
  { key: "tea", emoji: "☕", common: true, names: ["tea", "coffee", "chai", "kaapi", "kapi", "டீ", "காபி", "चाय", "कॉफी", "టీ", "కాఫీ", "ചായ", "കാപ്പി", "ಟೀ", "ಕಾಫಿ"], quantities: [p("cup", 2)] },
  { key: "rasam", emoji: "🍵", common: false, names: ["rasam", "saaru", "charu", "ரசம்", "रसम", "రసం", "చారు", "രസം", "ಸಾರು"], quantities: [p("cup", 2), p("bowl", 2)] },
  { key: "koottu", emoji: "🥘", common: false, names: ["koottu", "kootu", "kootu curry", "கூட்டு", "కూటు", "കൂട്ടുകറി", "ಕೂಟು"], quantities: [p("half_bowl", 3), p("bowl", 5)] },
  { key: "poriyal", emoji: "🥗", common: false, names: ["poriyal", "thoran", "palya", "vepudu", "bhaji", "stir fry", "பொரியல்", "भाजी", "వేపుడు", "തോരൻ", "ಪಲ್ಯ"], quantities: [p("half_bowl", 1), p("bowl", 2)] },
  { key: "upma", emoji: "🍛", common: false, names: ["upma", "uppuma", "uppittu", "உப்புமா", "उपमा", "ఉప్మా", "ഉപ്പുമാവ്", "ಉಪ್ಪಿಟ್ಟು"], quantities: [p("bowl", 5), p("two_bowls", 10)] },
  { key: "pongal", emoji: "🍛", common: false, names: ["pongal", "ven pongal", "khara pongal", "பொங்கல்", "पोंगल", "పొంగలి", "പൊങ്കൽ", "ಪೊಂಗಲ್"], quantities: [p("bowl", 7), p("two_bowls", 14)] },
  { key: "curd_rice", emoji: "🍚", common: false, names: ["curd rice", "thayir sadam", "thayir saadham", "mosaranna", "dahi chawal", "தயிர் சாதம்", "दही चावल", "పెరుగు అన్నం", "തൈര് സാദം", "ಮೊಸರನ್ನ"], quantities: [p("bowl", 6), p("two_bowls", 12)] },
  { key: "poori", emoji: "🫓", common: false, names: ["poori", "puri", "பூரி", "पूरी", "పూరీ", "പൂരി", "ಪೂರಿ"], quantities: [n(2, 2), n(3, 2), n(4, 2)] },
  { key: "paratha", emoji: "🫓", common: false, names: ["paratha", "parotta", "porotta", "பரோட்டா", "पराठा", "పరాటా", "പൊറോട്ട", "ಪರೋಟ"], quantities: [n(1, 4), n(2, 4)] },
  { key: "biryani", emoji: "🍛", common: false, names: ["biryani", "biriyani", "பிரியாணி", "बिरयानी", "బిర్యానీ", "ബിരിയാണി", "ಬಿರಿಯಾನಿ"], quantities: [p("small_plate", 7), p("plate", 12)] },
  { key: "paneer", emoji: "🧀", common: false, names: ["paneer", "பனீர்", "पनीर", "పనీర్", "പനീർ", "ಪನೀರ್"], quantities: [p("half_bowl", 9), p("bowl", 16)] },
  { key: "rajma", emoji: "🫘", common: false, names: ["rajma", "kidney beans", "राजमा"], quantities: [p("half_bowl", 4), p("bowl", 8)] },
  { key: "chole", emoji: "🫘", common: false, names: ["chole", "chana", "channa", "chickpeas", "sundal", "kadala", "kadale", "சுண்டல்", "கொண்டைக்கடலை", "छोले", "चना", "శనగలు", "കടല", "ಕಡಲೆ"], quantities: [p("half_bowl", 5), p("bowl", 10)] },
  { key: "sprouts", emoji: "🌱", common: false, names: ["sprouts", "sprouted", "mulaikattiya", "முளைகட்டிய", "अंकुरित", "మొలకలు", "മുളപ്പിച്ച", "ಮೊಳಕೆ"], quantities: [p("half_bowl", 4), p("bowl", 7)] },
  { key: "chicken", emoji: "🍗", common: false, names: ["chicken", "kozhi", "murgi", "murga", "kodi", "koli", "கோழி", "சிக்கன்", "चिकन", "मुर्गा", "చికెన్", "కోడి", "ചിക്കൻ", "കോഴി", "ಕೋಳಿ", "ಚಿಕನ್"], quantities: [p("small_plate", 15), p("bowl", 25)] },
  { key: "fish", emoji: "🐟", common: false, names: ["fish", "meen", "machli", "chepa", "meenu", "மீன்", "मछली", "చేప", "മീൻ", "ಮೀನು"], quantities: [p("piece", 12), p("two_pieces", 22)] },
  { key: "nuts", emoji: "🥜", common: false, names: ["nuts", "groundnut", "peanuts", "almonds", "kadalai", "verkadalai", "badam", "moongphali", "கடலை", "வேர்க்கடலை", "बादाम", "मूंगफली", "వేరుశెనగ", "കപ്പലണ്ടി", "ಕಡಲೆಕಾಯಿ"], quantities: [p("handful", 5), p("two_handfuls", 10)] },
  { key: "bread", emoji: "🍞", common: false, names: ["bread", "rotti", "ரொட்டி", "ब्रेड", "బ్రెడ్", "ബ്രെഡ്", "ಬ್ರೆಡ್"], quantities: [n(1, 3), n(2, 3), n(3, 3)] },
  { key: "buttermilk", emoji: "🥛", common: false, names: ["buttermilk", "mor", "moru", "chaas", "chhach", "majjiga", "majjige", "மோர்", "छाछ", "मट्ठा", "మజ్జిగ", "മോര്", "ಮಜ್ಜಿಗೆ"], quantities: [p("glass", 3)] },
  { key: "ragi", emoji: "🟤", common: false, names: ["ragi", "kezhvaragu", "finger millet", "ragi mudde", "ragi kali", "களி", "கேழ்வரகு", "रागी", "రాగి", "റാഗി", "ರಾಗಿ", "ಮುದ್ದೆ"], quantities: [p("piece", 5), p("two_pieces", 10)] },
  { key: "banana", emoji: "🍌", common: false, names: ["banana", "vazhaipazham", "kela", "arati", "baale", "வாழைப்பழம்", "केला", "అరటి", "ഏത്തപ്പഴം", "ಬಾಳೆಹಣ್ಣು"], quantities: [n(1, 1), n(2, 1)] },
];

export const CUSTOM_FOOD_KEY = "custom";
export const AI_FOOD_KEY = "ai";
/** Portions offered for a dish we don't have in the catalogue. */
export const GENERIC_PORTIONS: Portion[] = ["half_bowl", "bowl", "two_bowls", "piece", "two_pieces", "glass", "plate"];

export function findFood(key: string): Food | undefined {
  return FOODS.find((f) => f.key === key);
}

export function estimateProtein(foodKey: string, quantityKey: string): number | null {
  const food = findFood(foodKey);
  const qty = food?.quantities.find((x) => x.key === quantityKey);
  return qty ? qty.protein_g : null;
}

const norm = (s: string) => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\p{M} ]/gu, "").replace(/\s+/g, " ").trim();

/**
 * Finds catalogue foods mentioned in free text, in any language.
 * "cabbage koottu" → koottu; "சாதம் சாம்பார்" → rice, sambar.
 */
export function searchFoods(query: string, limit = 5): Food[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const scored: { food: Food; score: number }[] = [];
  for (const food of FOODS) {
    let best = 0;
    for (const name of food.names) {
      const nm = norm(name);
      // Whole-word matches beat matches inside a longer word
      // (Tamil "முட்டைகோஸ்" = cabbage contains "முட்டை" = egg).
      const padded = ` ${q} `;
      if (q === nm) best = Math.max(best, 200);
      else if (padded.includes(` ${nm} `)) best = Math.max(best, 100 + nm.length);
      else if (nm.length >= 3 && q.includes(nm)) best = Math.max(best, 50 + nm.length);
      else if (q.length >= 3 && nm.startsWith(q)) best = Math.max(best, 40);
    }
    if (best) scored.push({ food, score: best });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.food);
}

/** Sum of known estimates; `unknown` counts items with no estimate. */
export function sumProtein(items: { protein_g: number | null }[]): { grams: number; unknown: number } {
  let grams = 0;
  let unknown = 0;
  for (const it of items) {
    if (it.protein_g == null) unknown++;
    else grams += it.protein_g;
  }
  return { grams: Math.round(grams * 10) / 10, unknown };
}

/** Default meal type for a clock hour (patient-local). */
export function mealTypeForHour(hour: number): "breakfast" | "lunch" | "snack" | "dinner" {
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snack";
  return "dinner";
}
