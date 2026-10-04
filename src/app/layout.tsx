import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Atkinson_Hyperlegible, Noto_Sans_Devanagari, Noto_Sans_Kannada, Noto_Sans_Malayalam, Noto_Sans_Tamil, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/client";
import { LOCALE_COOKIE, LOCALES, normaliseLocale, translate } from "@/lib/i18n";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ToastProvider } from "@/components/Toast";

// Atkinson Hyperlegible (designed for low vision) for Latin text, with
// Noto Sans for Indian scripts. Browsers pick the font that has the glyph.
const latin = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-latin", display: "swap" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "700"], variable: "--font-ta", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "700"], variable: "--font-hi", display: "swap" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], weight: ["400", "700"], variable: "--font-te", display: "swap" });
const malayalam = Noto_Sans_Malayalam({ subsets: ["malayalam"], weight: ["400", "700"], variable: "--font-ml", display: "swap" });
const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], weight: ["400", "700"], variable: "--font-kn", display: "swap" });

const SHARE_TEXT = "A health companion for elderly parents, and the family who live far away. Pain, meals, medicines and reports in 6 languages.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  title: "CareSense",
  description: translate("en", "app.tagline"),
  // Preview card shown when the link is shared (LinkedIn, WhatsApp, etc.)
  openGraph: {
    title: "CareSense – Health Companion App",
    description: SHARE_TEXT,
    type: "website",
    siteName: "CareSense",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CareSense" }],
  },
  twitter: { card: "summary_large_image", title: "CareSense – Health Companion App", description: SHARE_TEXT, images: ["/og.png"] },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1E6E5A",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  const locale = normaliseLocale(raw);
  const fonts = [latin, tamil, deva, telugu, malayalam, kannada].map((f) => f.variable).join(" ");
  return (
    <html lang={LOCALES[locale].intl} className={fonts}>
      <body className="min-h-screen font-sans">
        <I18nProvider locale={locale} chosen={Boolean(raw && raw in LOCALES)}>
          <ToastProvider>
            <a href="#main" className="sr-only-focusable fixed left-2 top-2 z-50 rounded-lg bg-ink px-4 py-2 text-white">
              {translate(locale, "app.skipToContent")}
            </a>
            <OfflineBanner />
            <div id="main">{children}</div>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
