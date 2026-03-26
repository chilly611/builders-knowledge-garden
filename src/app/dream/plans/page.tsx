"use client";
import Link from "next/link";
import { Cinzel, Outfit } from "next/font/google";
import CopilotPanel from "@/components/CopilotPanel";
const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "700"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });

export default function PlansDreamPage() {
  return (
    <>
      <div style={{
        minHeight: "100vh",
        background: "#fff",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: "4rem", marginBottom: 24 }}>⊞</div>
        <h1 className={cinzel.className} style={{
          fontSize: "clamp(1.5rem, 4vw, 2.4rem)", color: "#9C7832", marginBottom: 12,
        }}>I Have Plans</h1>
        <p className={outfit.className} style={{
          color: "#777", fontSize: "1rem",
          maxWidth: 440, lineHeight: 1.6, marginBottom: 32, fontWeight: 300,
        }}>Upload DWG, PDF, SketchUp, or photos of existing plans. The platform enriches them with codes, costs, materials, and scheduling intelligence.</p>
        <div style={{
          padding: "16px 28px", borderRadius: 14,
          background: "rgba(156,120,50,0.08)", border: "1px solid rgba(156,120,50,0.2)",
          color: "#555", fontSize: "0.85rem", marginBottom: 32,
        }} className={outfit.className}>Coming in Chunk 7 — Professional plan upload + knowledge enrichment</div>
        <Link href="/dream" style={{
          color: "#9C7832", textDecoration: "none", fontSize: "0.85rem",
          letterSpacing: "0.1em", opacity: 0.7,
        }} className={outfit.className}>← Back to Dream Machine</Link>
      </div>
      <CopilotPanel />
    </>
  );
}
