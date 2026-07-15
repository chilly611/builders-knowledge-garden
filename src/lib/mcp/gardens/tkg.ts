/**
 * RKG — Toxicology Knowledge Garden tools.
 *
 * Reads the toxicology corpus (substances, regulatory_limits, classifications,
 * health effects, source documents, EWG contaminants) through the app's anon
 * Supabase client and returns interpreted, cited answers.
 *
 *   is_substance_restricted   — regulatory limits + hazard classifications, cited
 *   non_toxic_alternatives_for — lower-hazard peers within a shared classification
 *   citation_for_claim        — corroborating toxicology evidence for a claim
 *
 * Honesty rules:
 *   - Absence of a limit is reported as "no restriction on record", never as a
 *     safety claim.
 *   - "Alternatives" are a CORPUS HAZARD COMPARISON within a shared
 *     classification, explicitly NOT a functional substitution recommendation.
 *     If the corpus can't support a comparison, we say so.
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { interpret, notCovered, toToolResult, type Citation } from "../citations";
import type { ToolCallResult } from "../jsonrpc";

const GARDEN = "tkg";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function truncate(s: string, n = 200): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function corpusUnavailable(tool: string): ToolCallResult {
  return toToolResult(
    notCovered({
      garden: GARDEN,
      tool,
      answer: "The toxicology corpus is not reachable right now. No determination is made.",
      reason: "corpus_unavailable",
    }),
  );
}

interface SubstanceRow {
  id: string;
  name: string;
  cas_number: string | null;
  description: string | null;
}
interface RegLimitRow {
  agency: string | null;
  limit_type: string | null;
  limit_value: number | null;
  limit_unit: string | null;
  effective_date: string | null;
  source_url: string | null;
  notes: string | null;
}
interface ClassRow {
  name: string | null;
  classification_type: string | null;
  description: string | null;
}
interface HealthEffectRow {
  name: string | null;
  evidence_level: string | null;
  evidence_source: string | null;
}
interface SourceDocRow {
  source_name: string | null;
  source_url: string | null;
  document_type: string | null;
}
interface EwgRow {
  name: string;
  detail_url: string | null;
  legal_limit: string | null;
  ewg_guideline: string | null;
  cancer_class: string | null;
  is_pfas: boolean | null;
  is_pesticide: boolean | null;
  description: string | null;
}

// ─── data access (all best-effort; never throw) ───

async function resolveSubstance(q: string): Promise<SubstanceRow | null> {
  if (!q) return null;
  const like = `%${q}%`;
  // 1) direct name / CAS / IUPAC
  const direct = await supabase
    .from("substances")
    .select("id, name, cas_number, description")
    .or(`name.ilike.${like},cas_number.eq.${q},iupac_name.ilike.${like}`)
    .limit(8);
  const rows = (direct.data as SubstanceRow[] | null) ?? [];
  if (rows.length > 0) {
    const exact = rows.find((r) => r.name?.toLowerCase() === q.toLowerCase() || r.cas_number === q);
    return exact ?? rows[0];
  }
  // 2) alias lookup
  const alias = await supabase
    .from("substance_aliases")
    .select("substance_id")
    .ilike("alias", like)
    .limit(1);
  const aliasRows = (alias.data as { substance_id: string }[] | null) ?? [];
  if (aliasRows.length > 0) {
    const sub = await supabase
      .from("substances")
      .select("id, name, cas_number, description")
      .eq("id", aliasRows[0].substance_id)
      .limit(1);
    const s = (sub.data as SubstanceRow[] | null) ?? [];
    if (s.length > 0) return s[0];
  }
  return null;
}

async function getRegLimits(substanceId: string): Promise<RegLimitRow[]> {
  const { data } = await supabase
    .from("regulatory_limits")
    .select("agency, limit_type, limit_value, limit_unit, effective_date, source_url, notes")
    .eq("substance_id", substanceId);
  return (data as RegLimitRow[] | null) ?? [];
}

async function getClassifications(substanceId: string): Promise<ClassRow[]> {
  const { data } = await supabase
    .from("substance_classifications")
    .select("classifications(name, classification_type, description)")
    .eq("substance_id", substanceId);
  const rows = (data as { classifications: ClassRow | ClassRow[] | null }[] | null) ?? [];
  return rows
    .flatMap((r) => (Array.isArray(r.classifications) ? r.classifications : r.classifications ? [r.classifications] : []))
    .filter(Boolean);
}

async function getHealthEffects(substanceId: string): Promise<HealthEffectRow[]> {
  const { data } = await supabase
    .from("substance_health_effects")
    .select("evidence_level, evidence_source, health_effects(name)")
    .eq("substance_id", substanceId);
  const rows =
    (data as { evidence_level: string | null; evidence_source: string | null; health_effects: { name: string } | { name: string }[] | null }[] | null) ??
    [];
  return rows.map((r) => {
    const he = Array.isArray(r.health_effects) ? r.health_effects[0] : r.health_effects;
    return { name: he?.name ?? null, evidence_level: r.evidence_level, evidence_source: r.evidence_source };
  });
}

async function getSourceDocs(substanceId: string): Promise<SourceDocRow[]> {
  const { data } = await supabase
    .from("substance_sources")
    .select("source_documents(source_name, source_url, document_type)")
    .eq("substance_id", substanceId)
    .limit(10);
  const rows = (data as { source_documents: SourceDocRow | SourceDocRow[] | null }[] | null) ?? [];
  return rows
    .flatMap((r) => (Array.isArray(r.source_documents) ? r.source_documents : r.source_documents ? [r.source_documents] : []))
    .filter(Boolean);
}

async function getEwgRow(name: string): Promise<EwgRow | null> {
  const { data } = await supabase
    .from("ewg_contaminants")
    .select("name, detail_url, legal_limit, ewg_guideline, cancer_class, is_pfas, is_pesticide, description")
    .ilike("name", `%${name}%`)
    .limit(1);
  const rows = (data as EwgRow[] | null) ?? [];
  return rows[0] ?? null;
}

function isCarcinogenClass(c: ClassRow): boolean {
  const hay = `${c.name ?? ""} ${c.classification_type ?? ""}`.toLowerCase();
  return hay.includes("carcinog");
}

// ─── is_substance_restricted ───
async function isSubstanceRestricted(args: Record<string, unknown>): Promise<ToolCallResult> {
  if (!isSupabaseConfigured()) return corpusUnavailable("is_substance_restricted");
  const query = str(args.substance);
  if (!query) {
    return toToolResult(
      notCovered({ garden: GARDEN, tool: "is_substance_restricted", answer: "A substance is required.", reason: "missing_substance" }),
    );
  }

  const sub = await resolveSubstance(query);
  const ewg = await getEwgRow(sub?.name ?? query);

  if (!sub && !ewg) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "is_substance_restricted",
        answer: `"${query}" was not found in the toxicology corpus. No determination is made — absence here is not a safety claim.`,
        reason: "substance_not_found",
      }),
    );
  }

  const name = sub?.name ?? ewg?.name ?? query;
  const [limits, classes] = sub ? await Promise.all([getRegLimits(sub.id), getClassifications(sub.id)]) : [[], []];

  const citations: Citation[] = [];
  for (const l of limits) {
    const value = l.limit_value != null ? `${l.limit_value}${l.limit_unit ? " " + l.limit_unit : ""}` : null;
    citations.push({
      label: `${l.agency ?? "Regulatory"} ${l.limit_type ?? "limit"} — ${name}`,
      source: l.agency ?? "regulatory_limits",
      agency: l.agency ?? null,
      url: l.source_url,
      verifiedAt: l.effective_date,
      detail: [value, l.notes].filter(Boolean).join(" · ") || null,
    });
  }
  for (const c of classes) {
    citations.push({
      label: `Classification: ${c.name ?? c.classification_type ?? "unknown"}`,
      source: "classifications",
      detail: c.description ? truncate(c.description, 140) : c.classification_type,
    });
  }
  if (ewg) {
    const ewgDetail = [
      ewg.legal_limit ? `legal limit ${ewg.legal_limit}` : null,
      ewg.ewg_guideline ? `EWG guideline ${ewg.ewg_guideline}` : null,
      ewg.cancer_class ? `cancer class ${ewg.cancer_class}` : null,
      ewg.is_pfas ? "PFAS" : null,
      ewg.is_pesticide ? "pesticide" : null,
    ]
      .filter(Boolean)
      .join("; ");
    citations.push({
      label: `EWG Tap Water Database — ${ewg.name}`,
      source: "EWG",
      agency: "EWG",
      url: ewg.detail_url,
      detail: ewgDetail || (ewg.description ? truncate(ewg.description, 140) : null),
    });
  }

  const carcinogen = classes.some(isCarcinogenClass) || !!ewg?.cancer_class;
  const restricted = limits.length > 0 || carcinogen || !!ewg?.legal_limit;

  if (!restricted && citations.length === 0) {
    return toToolResult(
      interpret({
        garden: GARDEN,
        tool: "is_substance_restricted",
        answer:
          `${name} is in the corpus, but no regulatory limit or hazard classification is on record. ` +
          `This is NOT a determination that it is safe or unregulated — it means this garden has no ` +
          `restriction data for it.`,
        citations: [],
        verdict: "uncovered",
        coverage: { covered: true, reason: "no_restriction_data" },
      }),
    );
  }

  // Headline only the reliable signals (limits, carcinogen class). The EWG
  // is_pfas boolean is noisy in this corpus, so it stays in the cited EWG
  // detail for the agent to weigh — never as a headline assertion.
  const summaryBits: string[] = [];
  if (limits.length) summaryBits.push(`${limits.length} regulatory limit${limits.length === 1 ? "" : "s"}`);
  if (carcinogen) summaryBits.push("a cancer/carcinogen classification");
  if (ewg?.legal_limit) summaryBits.push(`an EWG-recorded legal limit (${ewg.legal_limit})`);
  const answer =
    `Yes — ${name} is regulated/restricted in the corpus: ${summaryBits.join(", ")}. ` +
    `See citations for each agency limit and classification. Confirm the limit that applies to your ` +
    `jurisdiction and medium (e.g. drinking water vs. air).`;

  return toToolResult(
    interpret({ garden: GARDEN, tool: "is_substance_restricted", answer, citations, coverage: { covered: true } }),
  );
}

// ─── non_toxic_alternatives_for ───
async function nonToxicAlternativesFor(args: Record<string, unknown>): Promise<ToolCallResult> {
  if (!isSupabaseConfigured()) return corpusUnavailable("non_toxic_alternatives_for");
  const query = str(args.substance);
  const limit = Math.min(num(args.limit) ?? 5, 10);
  if (!query) {
    return toToolResult(
      notCovered({ garden: GARDEN, tool: "non_toxic_alternatives_for", answer: "A substance (or use) is required.", reason: "missing_substance" }),
    );
  }

  const target = await resolveSubstance(query);
  if (!target) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "non_toxic_alternatives_for",
        answer: `"${query}" was not found in the toxicology corpus, so no cited comparison can be made.`,
        reason: "substance_not_found",
      }),
    );
  }

  // Target's classifications (shared "family" signal) + its own hazard profile.
  const targetClassRows = await supabase
    .from("substance_classifications")
    .select("classification_id, classifications(name)")
    .eq("substance_id", target.id);
  const targetClassData =
    (targetClassRows.data as { classification_id: string; classifications: { name: string } | { name: string }[] | null }[] | null) ?? [];
  const classIds = targetClassData.map((r) => r.classification_id);
  const classNameById = new Map<string, string>();
  for (const r of targetClassData) {
    const c = Array.isArray(r.classifications) ? r.classifications[0] : r.classifications;
    if (c?.name) classNameById.set(r.classification_id, c.name);
  }

  if (classIds.length === 0) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "non_toxic_alternatives_for",
        answer:
          `${target.name} has no classification on record, so the corpus can't ground a like-for-like ` +
          `hazard comparison. Curated functional substitutes are not yet in this garden.`,
        reason: "no_classification",
      }),
    );
  }

  const targetLimits = await getRegLimits(target.id);
  const targetClasses = await getClassifications(target.id);
  const targetHazard = targetLimits.length + (targetClasses.some(isCarcinogenClass) ? 3 : 0);

  // Peers that share at least one classification.
  const peerRows = await supabase
    .from("substance_classifications")
    .select("substance_id, classification_id, substances(id, name)")
    .in("classification_id", classIds)
    .neq("substance_id", target.id)
    .limit(200);
  const peerData =
    (peerRows.data as { substance_id: string; classification_id: string; substances: { id: string; name: string } | { id: string; name: string }[] | null }[] | null) ??
    [];

  // Unique peers + which shared classification.
  const peers = new Map<string, { name: string; sharedClassId: string }>();
  for (const r of peerData) {
    const s = Array.isArray(r.substances) ? r.substances[0] : r.substances;
    if (s?.id && !peers.has(s.id)) peers.set(s.id, { name: s.name, sharedClassId: r.classification_id });
  }

  // Score each peer's hazard; keep only those strictly lower-hazard than target.
  const scored: { id: string; name: string; sharedClass: string; hazard: number; limitCount: number; carcinogen: boolean }[] = [];
  for (const [id, p] of peers) {
    const [pl, pc] = await Promise.all([getRegLimits(id), getClassifications(id)]);
    const carcinogen = pc.some(isCarcinogenClass);
    const hazard = pl.length + (carcinogen ? 3 : 0);
    if (hazard < targetHazard) {
      scored.push({ id, name: p.name, sharedClass: classNameById.get(p.sharedClassId) ?? "shared classification", hazard, limitCount: pl.length, carcinogen });
    }
    if (scored.length >= 40) break; // bound the fan-out
  }
  scored.sort((a, b) => a.hazard - b.hazard);
  const picks = scored.slice(0, limit);

  if (picks.length === 0) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "non_toxic_alternatives_for",
        answer:
          `Within the classifications shared by ${target.name}, the corpus contains no substance with a ` +
          `materially lower hazard profile on record. No lower-hazard alternative is asserted.`,
        reason: "no_lower_hazard_peer",
      }),
    );
  }

  const citations: Citation[] = picks.map((p) => ({
    label: p.name,
    source: "substances",
    detail:
      `shares classification "${p.sharedClass}"; ` +
      `${p.limitCount} regulatory limit${p.limitCount === 1 ? "" : "s"} on record` +
      `${p.carcinogen ? "; carcinogen-classified" : "; no carcinogen classification on record"}`,
    verification: p.carcinogen ? "lower-hazard-but-not-clean" : "lower-hazard-in-corpus",
  }));

  const answer =
    `Lower-hazard substances than ${target.name} within its shared classification(s): ` +
    `${picks.map((p) => p.name).join(", ")}. ` +
    `This is a CORPUS HAZARD COMPARISON (fewer regulatory limits / no carcinogen classification), ` +
    `NOT a functional substitution recommendation — verify that any candidate actually performs the ` +
    `same role and is appropriate for your use before switching.`;

  return toToolResult(
    interpret({
      garden: GARDEN,
      tool: "non_toxic_alternatives_for",
      answer,
      citations,
      // It's a comparison, not a corroborated safety claim — cap at "single".
      verdict: "single",
      coverage: { covered: true },
    }),
  );
}

// ─── citation_for_claim ───
async function citationForClaim(args: Record<string, unknown>): Promise<ToolCallResult> {
  if (!isSupabaseConfigured()) return corpusUnavailable("citation_for_claim");
  const claim = str(args.claim);
  const substanceQ = str(args.substance);
  if (!claim) {
    return toToolResult(
      notCovered({ garden: GARDEN, tool: "citation_for_claim", answer: "A claim to verify is required.", reason: "missing_claim" }),
    );
  }

  const sub = substanceQ ? await resolveSubstance(substanceQ) : null;
  const citations: Citation[] = [];
  const claimLower = claim.toLowerCase();

  if (sub) {
    const [limits, effects, docs] = await Promise.all([getRegLimits(sub.id), getHealthEffects(sub.id), getSourceDocs(sub.id)]);
    // Health effects whose name is mentioned in the claim corroborate it directly.
    for (const e of effects) {
      if (e.name && claimLower.includes(e.name.toLowerCase().split(" ")[0])) {
        citations.push({
          label: `${sub.name} → ${e.name}`,
          source: e.evidence_source || "substance_health_effects",
          verification: e.evidence_level,
          detail: `evidence level: ${e.evidence_level ?? "n/a"}`,
        });
      }
    }
    for (const l of limits) {
      citations.push({
        label: `${l.agency ?? "Regulatory"} limit — ${sub.name}`,
        source: l.agency ?? "regulatory_limits",
        agency: l.agency ?? null,
        url: l.source_url,
        verifiedAt: l.effective_date,
        detail: l.limit_value != null ? `${l.limit_value}${l.limit_unit ? " " + l.limit_unit : ""}` : null,
      });
    }
    for (const d of docs) {
      citations.push({ label: d.source_name ?? "source document", source: d.source_name ?? "source_documents", url: d.source_url, detail: d.document_type });
    }
  } else {
    // Free claim: search source documents by claim keywords.
    const words = claim.split(/\s+/).filter((w) => w.length > 3).slice(0, 5);
    if (words.length) {
      const orFilter = words.map((w) => `content_text.ilike.%${w}%`).join(",");
      const { data } = await supabase
        .from("source_documents")
        .select("source_name, source_url, document_type")
        .or(orFilter)
        .limit(8);
      for (const d of (data as SourceDocRow[] | null) ?? []) {
        citations.push({ label: d.source_name ?? "source document", source: d.source_name ?? "source_documents", url: d.source_url, detail: d.document_type });
      }
    }
  }

  if (citations.length === 0) {
    return toToolResult(
      notCovered({
        garden: GARDEN,
        tool: "citation_for_claim",
        answer: `No corroborating toxicology evidence was found for: "${claim}". Treat the claim as unverified by this garden.`,
        reason: "no_evidence",
      }),
    );
  }

  const answer = `Evidence on record relevant to: "${claim}". See citations; verdict reflects how many independent sources corroborate it.`;
  return toToolResult(
    interpret({ garden: GARDEN, tool: "citation_for_claim", answer, citations, coverage: { covered: true } }),
  );
}

export const tkgExecutors: Record<string, (args: Record<string, unknown>) => Promise<ToolCallResult>> = {
  is_substance_restricted: isSubstanceRestricted,
  non_toxic_alternatives_for: nonToxicAlternativesFor,
  citation_for_claim: citationForClaim,
};
