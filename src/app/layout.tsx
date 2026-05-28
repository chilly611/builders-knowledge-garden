import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Black, EB_Garamond, Pinyon_Script, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
// 2026-05-27: Knowledge Gardens design tokens FIRST, before globals.css.
// tokens.css is the canonical source — herbarium palette + type stack.
// globals.css now only contains the alias :root block + legacy overrides.
import "../styles/tokens.css";
import "./globals.css";
import Providers from "@/components/Providers";
import GlobalChromeGate from "@/components/GlobalChromeGate";
import { GamificationProvider } from "@/components/GamificationProvider";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

// 2026-05-27: Editorial + script + mono per the design system. tokens.css
// declares these CSS variables; next/font/google overrides them at the
// html element with proper Next-optimized font assets (preload, FOUT, etc.).
const ebGaramond = EB_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
  display: "swap",
});

const pinyonScript = Pinyon_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Builder's Knowledge Garden — The AI COO for Construction",
    template: "%s — Builder's Knowledge Garden",
  },
  description: "The operating system for construction. Every phase from dream to delivery, all in one platform.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://builders.theknowledgegardens.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo/b_icon_192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/logo/b_icon_512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Builder's Knowledge Garden",
    description: "The operating system for construction. Every phase from dream to delivery, all in one platform.",
    // 2026-05-28: asset sync — was `/og/og-root.png` which was 404 (file never
    // existed). Replaced with the canonical light OG card copied from the
    // Knowledge Gardens Design System (assets/logo/og-light.png →
    // public/og/og-light.png). Dark variant is available at /og/og-dark.png
    // for surfaces that need it. See docs/asset-manifest.md.
    images: [
      { url: "/og/og-light.png", width: 1200, height: 630, alt: "Builder's Knowledge Garden" },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Builder's Knowledge Garden",
    description: "The operating system for construction.",
    images: ["/og/og-light.png"],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Builder's KG" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // COCKPIT-PERSONALIZATION (2026-05-22): read the `bkg-lane` cookie on
  // the server so we can stamp `data-diy-cockpit` on <body> BEFORE the
  // page paints. Previous pattern flipped the attribute in a useEffect
  // inside DiyCockpitOverlay, which produced a visible flash of the pro
  // picker while the client hydrated. Reading the cookie here (with a
  // safe 'gc' default when absent) collapses the gap to zero. The
  // middleware (src/middleware.ts) keeps the cookie under our control on
  // every /killerapp request; cookie value is client-writable, so the
  // attribute is UI hint only — never an authorization gate.
  const cookieStore = await cookies();
  const lane = cookieStore.get('bkg-lane')?.value ?? 'gc';
  const isDiy = lane === 'diy';

  return (
    <html
      lang="en"
      className={`${archivo.variable} ${archivoBlack.variable} ${ebGaramond.variable} ${pinyonScript.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        {/* DIY-overlay hide rule — server-rendered so it applies before
            DiyCockpitOverlay hydrates. Was previously emitted by the
            overlay's own <style> block, which only existed AFTER client
            hydration → caused the pro picker to flash. Server-rendered
            <style> is honoured by Next 16's RSC streamer. */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              'body[data-diy-cockpit="1"] [data-diy-hide-picker="1"]{display:none!important;}',
          }}
        />
      </head>
      <body
        className="min-h-screen"
        data-diy-cockpit={isDiy ? '1' : '0'}
        style={{ background: "var(--bg)", color: "var(--fg)", fontFamily: "var(--font-archivo), 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <Providers>
          <GamificationProvider>
            {children}
            {/* Ever-present chrome: journey + budget are merged into the
                ProjectCompass mounted inside /killerapp/layout.tsx (via
                GlobalJourneyMapHeader), so nothing budget-shaped lives in
                the root layout anymore. AI fab (bottom-right above
                CompassBloom) and CompassBloom (bottom-right corner)
                remain. Order matters for z-index layering when they
                animate. GlobalChromeGate hides these on /intro and inside
                the /intro Act 4 iframe (?hideShell=1) so the cinematic
                frame isn't cluttered. */}
            <GlobalChromeGate />
          </GamificationProvider>
        </Providers>
      </body>
    </html>
  );
}
