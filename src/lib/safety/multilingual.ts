// Red-flag phrases in Indian languages (native script + common romanised
// spellings). Deterministic substring matching — deliberately broad, no
// negation handling: in these languages we prefer a false alarm to a miss.
//
// ⚠ These lists MUST be reviewed and extended by native-speaking clinicians
// before launch. See README → "Multilingual safety".
//
// A second layer (ai/translate.ts) translates non-English messages to English
// and runs the English rules as well; this list works even when AI is down.

import type { SafetyRuleId } from "./engine";

type PhraseList = Partial<Record<SafetyRuleId, string[]>>;

const PHRASES: PhraseList = {
  chest_pain: [
    // Tamil
    "நெஞ்சு வலி", "நெஞ்சுவலி", "நெஞ்சில் வலி", "மார்பு வலி", "மார்பு அழுத்தம்", "நெஞ்சு அடைப்பு", "நெஞ்சு பாரம்",
    "nenju vali", "nenjuvali", "nenju valikuthu", "nenju valikkuthu", "marbu vali",
    // Hindi
    "सीने में दर्द", "छाती में दर्द", "सीने में दबाव", "छाती में जकड़न", "दिल का दौरा",
    "seene me dard", "seene mein dard", "sine me dard", "chhati me dard", "chati me dard", "dil ka daura",
    // Telugu
    "ఛాతీ నొప్పి", "ఛాతి నొప్పి", "ఛాతిలో నొప్పి", "గుండె నొప్పి", "chathi noppi", "gunde noppi",
    // Malayalam
    "നെഞ്ചുവേദന", "നെഞ്ചു വേദന", "നെഞ്ചിൽ വേദന", "nenju vedana", "nenjuvedana",
    // Kannada
    "ಎದೆ ನೋವು", "ಎದೆನೋವು", "ede novu",
  ],
  breathing: [
    "மூச்சு திணறல்", "மூச்சுத் திணறல்", "மூச்சு விட முடியவில்லை", "மூச்சு வாங்குது", "மூச்சு வாங்குகிறது",
    "moochu thinaral", "mochu thinaral", "moochu vida mudiyala", "moochu vangudhu",
    "सांस लेने में तकलीफ", "सांस नहीं आ रही", "सांस फूल", "दम घुट", "saans lene me takleef", "saans nahi aa rahi", "saans phool", "sans phool",
    "ఊపిరి ఆడటం లేదు", "శ్వాస తీసుకోవడం కష్టం", "ఆయాసం", "oopiri aadatam ledu", "aayasam",
    "ശ്വാസം മുട്ടൽ", "ശ്വാസതടസ്സം", "ശ്വാസം കിട്ടുന്നില്ല", "shwasam muttal", "swasam muttal",
    "ಉಸಿರಾಟದ ತೊಂದರೆ", "ಉಸಿರು ಕಟ್ಟುತ್ತಿದೆ", "ಉಸಿರಾಡಲು ಕಷ್ಟ", "usiru kattide",
  ],
  fainting: [
    "மயங்கி விழுந்", "மயக்கம் போட்டு", "மயக்கமாகி விழு", "சுயநினைவு இழந்", "mayangi vizhunth", "mayakkam pottu",
    "बेहोश", "चक्कर खाकर गिर", "behosh",
    "స్పృహ తప్పి", "సొమ్మసిల్లి", "sommasilli",
    "ബോധം കെട്ട", "ബോധക്ഷയം", "തലകറങ്ങി വീണ", "bodham kett",
    "ಪ್ರಜ್ಞೆ ತಪ್ಪಿ", "ಮೂರ್ಛೆ", "prajne tappi",
  ],
  bleeding: [
    "ரத்த வாந்தி", "இரத்த வாந்தி", "வாந்தியில் ரத்தம்", "மலத்தில் ரத்தம்", "மலத்தில் இரத்தம்", "கருப்பு மலம்", "ratha vanthi", "malathil ratham",
    "खून की उल्टी", "उल्टी में खून", "मल में खून", "पाखाने में खून", "काला मल", "khoon ki ulti", "ulti me khoon", "potty me khoon", "latrine me khoon",
    "రక్తపు వాంతి", "వాంతిలో రక్తం", "మలంలో రక్తం", "raktham vanthi",
    "രക്തം ഛർദ്ദി", "ചോര ഛർദ്ദി", "മലത്തിൽ രക്തം", "മലത്തിൽ ചോര", "chora chardi",
    "ರಕ್ತ ವಾಂತಿ", "ಮಲದಲ್ಲಿ ರಕ್ತ", "raktha vanthi",
  ],
  persistent_vomiting: [
    "தொடர்ந்து வாந்தி", "நிற்காமல் வாந்தி", "வாந்தி நிற்கவில்லை", "thodarnthu vanthi", "vanthi nikkala",
    "लगातार उल्टी", "उल्टी रुक नहीं", "बार बार उल्टी", "lagatar ulti", "baar baar ulti",
    "వాంతులు ఆగడం లేదు", "పదే పదే వాంతులు", "vanthulu aagadam ledu",
    "നിർത്താതെ ഛർദ്ദി", "തുടർച്ചയായി ഛർദ്ദി",
    "ನಿಲ್ಲದ ವಾಂತಿ", "ಪದೇ ಪದೇ ವಾಂತಿ",
  ],
  severe_abdominal: [
    "கடுமையான வயிற்று வலி", "தாங்க முடியாத வயிற்று வலி", "பயங்கர வயிற்று வலி", "vayiru vali thaanga mudiyala",
    "तेज़ पेट दर्द", "तेज पेट दर्द", "पेट में बहुत तेज दर्द", "असहनीय पेट दर्द", "pet me bahut dard", "pet me tez dard",
    "తీవ్రమైన కడుపు నొప్పి", "భరించలేని కడుపు నొప్పి",
    "കഠിനമായ വയറുവേദന", "സഹിക്കാൻ പറ്റാത്ത വയറുവേദന",
    "ತೀವ್ರ ಹೊಟ್ಟೆ ನೋವು", "ಸಹಿಸಲಾಗದ ಹೊಟ್ಟೆ ನೋವು",
  ],
  confusion: ["நினைவு தடுமாற", "என்ன நடக்கிறது என்று தெரியவில்லை", "होश में नहीं", "గందరగోళంగా ఉంది", "ആശയക്കുഴപ്പം", "ಗೊಂದಲವಾಗುತ್ತಿದೆ"],
  severe_weakness: [
    "எழுந்திருக்க முடியவில்லை", "நடக்க முடியவில்லை", "ezhunthirikka mudiyala", "nadakka mudiyala",
    "उठ नहीं पा", "चल नहीं पा", "uth nahi pa", "chal nahi pa",
    "లేవలేకపోతున్నా", "నడవలేకపోతున్నా",
    "എഴുന്നേൽക്കാൻ പറ്റുന്നില്ല", "നടക്കാൻ പറ്റുന്നില്ല",
    "ಏಳಲು ಆಗುತ್ತಿಲ್ಲ", "ನಡೆಯಲು ಆಗುತ್ತಿಲ್ಲ",
  ],
  neuro: [
    "வாய் கோணல்", "முகம் கோணி", "பேச்சு குழறு", "ஒரு பக்கம் செயலிழ", "பக்கவாதம்", "vaai konal", "pakkavatham",
    "मुंह टेढ़ा", "लकवा", "बोलने में दिक्कत", "जुबान लड़खड़ा", "lakwa", "munh tedha",
    "పక్షవాతం", "మూతి వంకర", "మాట తడబడ", "pakshavatham",
    "പക്ഷാഘാതം", "മുഖം കോടി", "സംസാരം കുഴഞ്ഞ",
    "ಪಾರ್ಶ್ವವಾಯು", "ಬಾಯಿ ಸೊಟ್ಟ", "ಮಾತು ತೊದಲ",
  ],
  allergy: [
    "தொண்டை வீக்கம்", "நாக்கு வீங்", "உதடு வீங்", "முகம் வீங்",
    "गले में सूजन", "जीभ सूज", "होंठ सूज", "चेहरा सूज",
    "గొంతు వాపు", "నాలుక వాపు", "పెదవులు వాపు",
    "തൊണ്ട വീങ്ങ", "നാവ് വീങ്ങ", "ചുണ്ട് വീങ്ങ",
    "ಗಂಟಲು ಊತ", "ನಾಲಿಗೆ ಊದ", "ತುಟಿ ಊದ",
  ],
  self_harm: [
    "தற்கொலை", "சாக வேண்டும்", "உயிரை மாய்த்து", "aatmahatya", "atmahatya",
    "आत्महत्या", "मरना चाहता", "मरना चाहती", "जान दे दूं", "marna chahti", "marna chahta",
    "ఆత్మహత్య", "చచ్చిపోవాలని",
    "ആത്മഹത്യ", "മരിക്കണം",
    "ಆತ್ಮಹತ್ಯೆ", "ಸಾಯಬೇಕು",
  ],
};

// Jaundice + fever is a combination rule.
const JAUNDICE = ["மஞ்சள் காமாலை", "கண் மஞ்சள்", "पीलिया", "आंखें पीली", "కామెర్లు", "కళ్ళు పసుపు", "മഞ്ഞപ്പിത്തം", "കണ്ണ് മഞ്ഞ", "ಕಾಮಾಲೆ", "ಕಣ್ಣು ಹಳದಿ", "manjal kamalai", "piliya", "peeliya"];
const FEVER = ["காய்ச்சல்", "ஜுரம்", "बुखार", "జ్వరం", "പനി", "ಜ್ವರ", "kaichal", "kaaichal", "bukhar", "jwaram", "jwara", "pani"];

// Medication-change intent: an action word AND a medicine word.
const MED_WORDS = [
  "மாத்திரை", "மருந்து", "ஊசி", "दवा", "दवाई", "गोली", "इंसुलिन", "మందు", "మాత్ర", "టాబ్లెట్", "മരുന്ന്", "ഗുളിക", "ಔಷಧ", "ಮಾತ್ರೆ",
  "maathirai", "mathirai", "marunthu", "dawai", "dawa", "davai", "goli", "mandu", "gulika", "maatre", "tablet", "insulin",
];
const MED_ACTIONS = [
  "நிறுத்த", "குறைக்க", "அதிகரிக்க", "இரண்டு மாத்திரை", "தவிர்க்க", "விட்டுவிட", "போடாமல்",
  "बंद कर", "छोड़ दूं", "छोड़ सकत", "कम कर", "बढ़ा", "दो गोली", "न लूं", "नहीं लूं",
  "ఆపేయ", "ఆపవచ్చా", "తగ్గించ", "పెంచ", "మానేయ",
  "നിർത്ത", "കുറയ്ക്ക", "കൂട്ട", "ഒഴിവാക്ക",
  "ನಿಲ್ಲಿಸ", "ಕಡಿಮೆ ಮಾಡ", "ಹೆಚ್ಚಿಸ", "ಬಿಡಬಹುದಾ",
  "niruthalama", "niruthalaama", "nirutha", "band kar", "chhod", "chod du", "kam kar", "badha", "aapeya", "nirthanam",
];

function norm(s: string) {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ");
}

// Indian scripts add suffixes after a word's final "virama" (vowel-killer):
// காய்ச்சல் + உம் → காய்ச்சலும். Dropping a phrase's trailing virama lets the
// stem match every suffixed form.
const TRAILING_VIRAMA = /[्்్್്]$/;
const phrase = (p: string) => norm(p).trim().replace(TRAILING_VIRAMA, "");

export function checkMultilingual(input: string): SafetyRuleId[] {
  const text = norm(input);
  if (!text.trim()) return [];
  const hits: SafetyRuleId[] = [];
  for (const [rule, phrases] of Object.entries(PHRASES) as [SafetyRuleId, string[]][]) {
    if (phrases.some((p) => text.includes(phrase(p)))) hits.push(rule);
  }
  if (JAUNDICE.some((p) => text.includes(phrase(p))) && FEVER.some((p) => text.includes(phrase(p)))) hits.push("jaundice_fever");
  return hits;
}

export function isMedicationChangeMultilingual(input: string): boolean {
  const text = norm(input);
  return MED_WORDS.some((w) => text.includes(phrase(w))) && MED_ACTIONS.some((a) => text.includes(phrase(a)));
}
