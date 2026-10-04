# CareSense: Plan for the App Store and Play Store

Status: **plan only**. Nothing in this document has been built yet. The app runs today as a web app that can be installed on a phone (a PWA). This plan covers turning it into store apps once your mom has tested it.

## 0. Before the stores: go live on the web (about 1–2 weeks)

The store apps will be a native wrapper around the same code, and they need a live server. Do these first:

1. **Supabase project in India.** Choose the **Mumbai (ap-south-1)** region. Run `supabase/schema.sql`, then test every journey with real accounts. This code path has been written but not yet run against a live project.
2. **Deploy to Vercel** (or any Node host). Use a custom domain, e.g. `app.caresense.in`.
3. **Anthropic API key.** Turn on AI and test the report summaries, dish lookup and chat in all six languages.
4. **Beta with your mom.** On Android, open the site in Chrome, then ⋮ → *Add to Home screen*. It then runs like an app. Collect her feedback for 2–4 weeks.

## 1. Wrapping approach: Capacitor (recommended)

[Capacitor](https://capacitorjs.com) puts this same web app inside a real Android/iOS app. It also gives the app access to native phone features, which the web version can't reach.

| Feature | Why it's needed | Capacitor plugin |
|---|---|---|
| Push notifications | Family alerts on the daughter's phone, even when the app is closed | `@capacitor/push-notifications` (FCM + APNs) |
| Medicine reminders | "Time for Metformin" at 8 PM, even offline | `@capacitor/local-notifications` |
| Speech recognition | Browser speech input **does not work** inside iOS/Android app views | `@capacitor-community/speech-recognition` (supports ta-IN, hi-IN, …) |
| Camera | Better photo capture of reports | `@capacitor/camera` |
| Biometric lock | Face/fingerprint unlock for health data | `@capgo/capacitor-native-biometric` |

These native features also matter for Apple review. Apple rejects apps that are "just a website" (guideline 4.2, minimum functionality). Reminders, push notifications and speech input clearly clear that bar.

**Build requirements**

- **Android:** Android Studio on Windows works.
- **iOS:** needs a **Mac with Xcode**, or a cloud build service such as Codemagic or Ionic Appflow.
- **Developer accounts:**
  - Apple Developer Program: **$99/year**
  - Google Play Console: **$25, one time**

## 2. Store rules for health apps

### Apple App Store

- **1.4.1 Medical:** the app must not claim to diagnose or treat. The existing wording ("not a doctor, cannot diagnose") and the safety design help here. The listing text must be equally careful.
- **5.1.1 Data collection:**
  - A privacy policy URL is required.
  - **In-app account deletion is required.** ⚠ This isn't built yet.
- **5.1.3 Health data:** health data can't be used for advertising and can't be stored in iCloud.
- **App Privacy "nutrition label":** declare the health, contact and user-content data the app collects.

### Google Play

- **Health apps declaration** in Play Console.
- **Data safety section:** covers what the app collects, whether data is encrypted in transit, and deletion.
- **Account deletion:** required both in-app **and** through a web link.
- **Privacy policy URL.**

## 3. Law and regulation

- **India: Digital Personal Data Protection Act 2023 and the DPDP Rules.**
  - Clear consent notice in the user's language (the app's localisation already supports this).
  - Rights to access, correct and erase data.
  - A named grievance officer.
  - Breach notification.
  - Store data in India (Supabase Mumbai region).
- **Medical-device rules:** apps that only record and organise information, and that explain reports without diagnosing, are usually treated as wellness/record-keeping apps. The AI explanations sit close to the line, so **get a short regulatory opinion** before launch:
  - India: CDSCO's software-as-a-medical-device rules
  - USA: FDA
  - Europe: EU MDR
- **USA users:** HIPAA usually doesn't apply to a direct-to-consumer app, but the **FTC Health Breach Notification Rule** does.
- **AI provider:** review Anthropic's commercial terms, data-processing agreement and data-retention options for health data. Tell users that AI processes their reports.

## 4. Must-do before launch (not built yet)

- [ ] **Account deletion and data export**, in-app and through a web link
- [ ] Privacy policy and terms, in all six languages
- [ ] **Native-speaker review of every translation**, and **clinician review** of the safety wording and the Indian-language red-flag phrase lists (`src/lib/safety/multilingual.ts`)
- [ ] Medicine reminders (local notifications)
- [ ] Push notifications for family alerts (today they are in-app only)
- [ ] Native speech recognition plugin
- [ ] Biometric/PIN app lock
- [ ] Security review / penetration test; confirm RLS policies with a second account
- [ ] Crash reporting that **never sends health data** (e.g. Sentry with scrubbing)
- [ ] Support email or phone, and an in-app "Report a problem" option
- [ ] Store listing screenshots and text in each language

## 5. Rough timeline

| Phase | Time |
|---|---|
| Go live on web + beta with your mom | 2–4 weeks |
| Must-do list above | 3–5 weeks |
| Capacitor wrapper + native plugins | 2–3 weeks |
| Store review (Google ~1 week, Apple 1–3 weeks; health apps often get questions) | 1–3 weeks |
