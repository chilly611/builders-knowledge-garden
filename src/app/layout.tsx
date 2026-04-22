import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Black } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import CompassBloom from "@/components/CompassBloom";
import GlobalAiFab from "@/components/GlobalAiFab";
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
    images: [{ url: "/og/og-root.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Builder's Knowledge Garden",
    description: "The operating system for construction.",
    images: ["/og/og-root.png"],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Builder's KG" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoBlack.variable}`}>
      <body className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)", fontFamily: "var(--font-archivo), 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        <Providers>
          <GamificationProvider>
            {children}
            {/* Ever-present chrome: journey + budget are merged into the
                ProjectCompass mounted inside /killerapp/layout.tsx (via
                GlobalJourneyMapHeader), so nothing budget-shaped lives in
                the root layout anymore. AI fab (bottom-right above
                CompassBloom) and CompassBloom (bottom-right corner)
                remain. Order matters for z-index layering when they
                animate. */}
            <CompassBloom />
            <GlobalAiFab />
          </GamificationProvider>
        </Providers>
      </body>
    </html>
  );
}
