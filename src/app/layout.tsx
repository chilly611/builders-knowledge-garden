import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Black } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import CompassBloom from "@/components/CompassBloom";
import GlobalAiFab from "@/components/GlobalAiFab";
import GlobalBudgetWidget from "@/components/GlobalBudgetWidget";
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
  title: "Builder's Knowledge Garden — The AI COO for Construction",
  description: "The operating system for the $17 trillion global construction economy. DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW.",
  icons: {
    icon: [
      { url: "/logo/favicon.ico", sizes: "any" },
      { url: "/logo/b_icon_192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/logo/b_icon_512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/logo/b_icon_192x192.png",
  },
  openGraph: {
    title: "Builder's Knowledge Garden",
    description: "The AI COO for the $17T global construction economy. DREAM → DESIGN → PLAN → BUILD → DELIVER → GROW.",
    images: [{ url: "/logo/og_image_dark.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Builder's Knowledge Garden",
    description: "The AI COO for the $17T global construction economy.",
    images: ["/logo/og_image_dark.png"],
  },
  manifest: undefined,
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
            {/* Ever-present chrome: budget (top-right pill), journey map
                (lives in /killerapp/layout.tsx so it only shows inside the
                killer app), AI fab (bottom-right above CompassBloom),
                Compass (bottom-right corner). Order matters for z-index
                layering when they animate. */}
            <GlobalBudgetWidget />
            <CompassBloom />
            <GlobalAiFab />
          </GamificationProvider>
        </Providers>
      </body>
    </html>
  );
}
