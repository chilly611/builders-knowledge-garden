"use client";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";
const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });

export default function InspireDreamPage() {
  return (
    <>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a0f05 0%, #1e1208 50%, #0f0a05 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: "4rem", marginBottom: 24 }}>◈</div>
        <h1 className={cinzel.className} style={{
          fontSize: "clamp(1.5rem, 4vw, 2.4rem)", color: "#D85A30", marginBottom: 12,
        }}>Show Me Inspiration</h1>
        <p className={outfit.className} style={{
          color: "rgba(255,255,255,0.5)", fontSize: "1rem",
          maxWidth: 440, lineHeight: 1.6, marginBottom: 32, fontWeight: 300,
        }}>Upload 1–20 photos or paste URLs. AI analyzes style, materials, layout, and connects everything to the knowledge engine.</p>
        <div style={{
          padding: "16px 28px", borderRadius: 14,
          background: "rgba(216,90,48,0.08)", border: "1px solid rgba(216,90,48,0.2)",
          color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: 32,
        }} className={outfit.className}>Coming in Chunk 3 — multi-photo upload + URL paste + Claude Vision analysis</div>
        <Link href="/dream" style={{
          color: "#D85A30", textDecoration: "none", fontSize: "0.85rem",
          letterSpacing: "0.1em", opacity: 0.7,
        }} className={outfit.className}>← Back to Dream Machine</Link>
      </div>
      <CopilotPanel />
    </>
  );
}
