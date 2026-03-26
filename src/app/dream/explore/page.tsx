"use client";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";
const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });

export default function ExploreDreamPage() {
  return (
    <>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a0f05 0%, #1e1208 50%, #0f0a05 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: "4rem", marginBottom: 24 }}>⬡</div>
        <h1 className={cinzel.className} style={{
          fontSize: "clamp(1.5rem, 4vw, 2.4rem)", color: "#E07B3A", marginBottom: 12,
        }}>Surprise Me</h1>
        <p className={outfit.className} style={{
          color: "rgba(255,255,255,0.5)", fontSize: "1rem",
          maxWidth: 440, lineHeight: 1.6, marginBottom: 32, fontWeight: 300,
        }}>Answer 5 quick preference questions and AI generates 6–8 visual concepts tailored to your taste, budget, and location.</p>
        <div style={{
          padding: "16px 28px", borderRadius: 14,
          background: "rgba(224,123,58,0.08)", border: "1px solid rgba(224,123,58,0.2)",
          color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: 32,
        }} className={outfit.className}>Coming in Chunk 5 — AI preference quiz + concept generation</div>
        <Link href="/dream" style={{
          color: "#E07B3A", textDecoration: "none", fontSize: "0.85rem",
          letterSpacing: "0.1em", opacity: 0.7,
        }} className={outfit.className}>← Back to Dream Machine</Link>
      </div>
      <CopilotPanel />
    </>
  );
}
