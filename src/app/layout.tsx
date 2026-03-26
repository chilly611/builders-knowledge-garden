import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import CompassNav from "@/components/CompassNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <Providers>
          {children}
          <CompassNav />
        </Providers>
      </body>
    </html>
  );
}
