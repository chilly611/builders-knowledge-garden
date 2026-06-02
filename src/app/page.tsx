import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Mono } from "next/font/google";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import HomeClient from "@/components/marketing/HomeClient";

/* ═══════════════════════════════════════════════════════════════════
   BUILDER'S KNOWLEDGE GARDEN — PUBLIC HOMEPAGE ("/")
   Server shell: loads scoped marketing fonts, fetches the live capability
   counts, and renders the client marketing page (HomeClient).

   2026-06-01 rebuild. See docs/session-log.md for the full decision log
   (seal, lanes, lifecycle, type-stack, pricing, "system of record").
   ═══════════════════════════════════════════════════════════════════ */

// Marketing fonts — scoped to this page only. The canonical BKG stack
// (Archivo + EB Garamond + JetBrains Mono) is wired globally in layout.tsx.
// The homepage brief asked for Cormorant Garamond + Space Mono; rather than
// re-point the global tokens (which would shift every BKG surface toward the
// Orchids treatment), we load them here and apply them via scoped CSS vars.
// FLAGGED divergence — see session log.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

// Page-level metadata overrides the layout default ("…— The AI COO for
// Construction"). The homepage leads with the GC-clarity value, not the
// AI-COO framing. NOTE: the global default in src/app/layout.tsx still reads
// "AI COO" for other routes — flagged in the session log for a follow-up.
export const metadata: Metadata = {
  title: {
    absolute: "Builder's Knowledge Garden — run the whole build from one place",
  },
  description:
    "Budget, schedule, sequencing, codes, and contracts in one adaptive place for general contractors. California-first code coverage, a cited knowledge engine, and a copilot that speaks plain language.",
  openGraph: {
    title: "Builder's Knowledge Garden",
    description:
      "One adaptive place to run the whole build — budget, schedule, sequencing, codes, and contracts.",
    images: [{ url: "/og/og-light.png", width: 1200, height: 630, alt: "Builder's Knowledge Garden" }],
    type: "website",
  },
};

// ISR — refresh the live counts hourly. The page is otherwise static.
export const revalidate = 3600;

// Verified live 2026-06-01: 2,256 published knowledge entities, 44
// jurisdictions (California-first). We query Supabase the same way
// /api/v1/mcp does (the public, RLS-safe capability counts). If Supabase
// isn't configured (local dev) or the query fails, we fall back to the
// verified numbers — NEVER 0. This is the root-cause fix for the old
// SSR-0 counters that rendered "$0T / 0 / 0 / 0".
const FALLBACK = { entities: 2256, jurisdictions: 44 } as const;

async function getCapabilityStats(): Promise<{ entities: number; jurisdictions: number }> {
  if (!isSupabaseConfigured()) return FALLBACK;
  try {
    const [entitiesRes, jurisdictionsRes] = await Promise.all([
      supabase.from("knowledge_entities").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("jurisdictions").select("*", { count: "exact", head: true }),
    ]);
    return {
      // `|| FALLBACK` guards against a null/0 count (e.g. RLS) so the public
      // page never advertises zero.
      entities: entitiesRes.count || FALLBACK.entities,
      jurisdictions: jurisdictionsRes.count || FALLBACK.jurisdictions,
    };
  } catch {
    return FALLBACK;
  }
}

export default async function Home() {
  const { entities, jurisdictions } = await getCapabilityStats();
  return (
    <div className={`${cormorant.variable} ${spaceMono.variable}`}>
      <HomeClient entities={entities} jurisdictions={jurisdictions} />
    </div>
  );
}
