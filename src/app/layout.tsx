import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

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
  manifest: undefined,
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Builder's KG" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
