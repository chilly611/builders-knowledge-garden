#!/usr/bin/env node
// W10.A smoke harness — fires contractor-realistic questions at every wired
// specialist on the live deploy and reports demo-readiness flags.
//
// USAGE:
//   node scripts/probes/w10a-smoke.mjs                 # all probes
//   BASE=http://localhost:3000 node scripts/probes/w10a-smoke.mjs   # local dev
//   FILTER=draw node scripts/probes/w10a-smoke.mjs     # only specialists matching "draw"
//
// FLAGS detected (each is a printed warning per probe):
//   - HTTP_NNN          — non-200 response
//   - API_ERR           — body.error set
//   - DEMO_FALLBACK     — narrative looks like the mock-mode placeholder
//   - CYA_*             — banned CYA phrase in narrative
//   - HEDGE_OPENER      — narrative opens with "I need more information" / "Could you provide"
//   - NO_STRUCTURED     — structured object empty (parser miss or v1 prompt)
//   - HALLUCINATED_CITE — citation entity_id starts with "mock-"
//   - SHORT_NARRATIVE   — narrative under 80 chars (likely error)
//
// Origin: W10.A session, 2026-05-01. Promoted from /tmp/w10a-probe.mjs.

const BASE = process.env.BASE || "https://builders.theknowledgegardens.com";
const FILTER = process.env.FILTER || "";

const probes = [
  // ── q2/q5/q9 v2 specialists (W10.A5 verification) ─────────────────────────
  { specialist: "estimating-takeoff", workflow: "q2", stage: 1, jurisdiction: "ca-la",
    scope_description: "Kitchen remodel: gut, new cabinetry + quartz, flooring, electrical (3 circuits), relocate sink rough-in, paint. 2,500 sqft." },
  { specialist: "compliance-structural", workflow: "q5", stage: 2, jurisdiction: "ca-la", trade: "structural",
    scope_description: "Removing a 12-foot interior wall to combine kitchen and dining. Need to know if it's bearing and what beam I'd need." },
  { specialist: "sub-bid-analysis", workflow: "q9", stage: 3, jurisdiction: "ca-la", trade: "electrical",
    scope_description: "3 electrical bids: ElectroPlus $12.5k (panel upgrade, rough-in, 2w, bonded). Metro $13.8k (full scope, 3w). SparkyHomes $16.5k (premium, no insurance)." },
  // ── W10.A2b v2 rewrites ───────────────────────────────────────────────────
  { specialist: "weather-forecast", workflow: "q14", stage: 4, jurisdiction: "ca-sd", trade: "concrete",
    scope_description: "Can we pour a 28-yard slab on Thursday in San Diego? Forecast shows scattered showers and 62°F lows." },
  { specialist: "co-schedule-impact", workflow: "q20", stage: 5, jurisdiction: "ca-sd",
    scope_description: "Adding a 200 sqft composite rear deck mid-build, after framing inspection passed. Currently in MEP rough phase. How does this affect my schedule?" },
  { specialist: "co-document", workflow: "q20", stage: 5, jurisdiction: "ca-sd",
    scope_description: "Draft a change order for the rear deck addition: $12,400 cost, 8 working day extension, no impact on substantial completion milestone. Owner: Sarah Chen." },
  { specialist: "draw-calculate", workflow: "q21", stage: 6, jurisdiction: "ca-sd",
    scope_description: "We've completed framing, roof dry-in, and rough plumbing on a $385K San Diego ADU. Two prior draws totaled $147K. Calculate draw #3 amount and what to bill for." },
  { specialist: "expense-dashboard", workflow: "q17", stage: 4, jurisdiction: "ca-sd",
    scope_description: "Summarize this month's expenses for Job 14 (San Diego ADU). Budget was $385K, $47K committed, $14K spent so far." },
  // ── W10.A4 new specialists for previously specialist-less workflows ───────
  { specialist: "crew-outreach-draft", workflow: "q13", stage: 3, jurisdiction: "ca-sd",
    scope_description: "Reach out to Mike — framing lead, 8 years experience, refs solid. Need him for 12 weeks of framing on a San Diego ADU starting May 1. Day rate $200, breakfast on us." },
  { specialist: "daily-log-categorize", workflow: "q15", stage: 4, jurisdiction: "ca-sd",
    scope_description: "Framing on west wall done. Electrical rough-in starting tomorrow. Found water stain in south corner, needs investigation. Mike was an hour late. Inspector Phil stopped by to look at the plans, we're good for next Tuesday." },
  { specialist: "lien-waiver-tracker", workflow: "q22", stage: 6, jurisdiction: "ca-sd",
    scope_description: "Need to track lien waivers. Subs and suppliers: Main Electric ($28K, paid $14K through draw 2), Premier Plumbing ($18K, paid $7K), Anderson Lumber ($35K, paid in full), Concrete Pros ($22K, paid in full)." },
  { specialist: "payroll-classification-gate", workflow: "q23", stage: 6, jurisdiction: "ca-sd",
    scope_description: "Mike (employee, 8yr framing), Joe (1099, 3yr finish), Sarah (employee, apprentice). Anyone misclassified?" },
  { specialist: "retainage-strategy", workflow: "q25", stage: 7, jurisdiction: "ca-sd",
    scope_description: "Retainage held back: $19,250. Project substantially complete on 2026-04-15. San Diego." },
  { specialist: "warranty-summary", workflow: "q26", stage: 7, jurisdiction: "ca-sd",
    scope_description: "Job done 2026-04-30. Installed: GAF Timberline HDZ asphalt roof, Carrier Infinity 2-stage HVAC, Andersen 400-series windows, Sherwin Williams Duration exterior paint, KitchenAid appliances." },
  { specialist: "lessons-synthesize", workflow: "q27", stage: 7, jurisdiction: "ca-sd",
    scope_description: "What went right: client was great, sequencing was perfect, team came together. What went wrong: permits took 3 weeks instead of 2, drywall crew was slow, material delay on windows. Cost variance: +12 (over budget). Crew thinks: great experience, let's do more of these, safety was tight." },
];

const BANNED_CYA = [
  { name: "AHJ", re: /\b(authority having jurisdiction|AHJ)\b/i },
  { name: "CONSULT_LICENSED", re: /consult (a |an )?licensed (architect|engineer|attorney|professional)/i },
  { name: "RECOMMEND_RETAIN", re: /we recommend retaining/i },
  { name: "NOT_PERMITTED", re: /\bnot permitted\b/i },
];

const HEDGE_OPENERS = [
  /^i need more (information|details|specific|specifics)/i,
  /^could you (please )?provide/i,
  /^i (would )?need more details/i,
  /^to (provide|give) (an? |you )?accurate /i,
];

const DEMO_FALLBACK = /demo mode active|ANTHROPIC_API_KEY is not configured|Placeholder response/i;
const HALLUCINATED_CITE = /^mock-/i;

async function probeOne(p) {
  const start = Date.now();
  let res, body, err;
  try {
    res = await fetch(`${BASE}/api/v1/specialists/${p.specialist}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope_description: p.scope_description,
        jurisdiction: p.jurisdiction,
        trade: p.trade,
        extra: { workflow_id: p.workflow, smoke: "w10a" },
      }),
    });
    const text = await res.text();
    try { body = JSON.parse(text); } catch { body = { _raw: text.slice(0, 500) }; }
  } catch (e) { err = String(e); }

  const latency = Date.now() - start;
  const narrative = (body?.narrative ?? "").trim();
  const citations = body?.citations ?? [];
  const structured = body?.structured ?? {};
  const flags = [];

  if (err) flags.push(`FETCH_ERR(${err})`);
  if (res && res.status >= 400) flags.push(`HTTP_${res.status}`);
  if (body?.error) flags.push(`API_ERR(${body.error})`);

  for (const { name, re } of BANNED_CYA) if (re.test(narrative)) flags.push(`CYA_${name}`);
  if (DEMO_FALLBACK.test(narrative)) flags.push("DEMO_FALLBACK");
  for (const re of HEDGE_OPENERS) if (re.test(narrative)) { flags.push("HEDGE_OPENER"); break; }
  if (Array.isArray(citations))
    for (const c of citations)
      if (typeof c?.entity_id === "string" && HALLUCINATED_CITE.test(c.entity_id))
        flags.push(`HALLUCINATED_CITE(${c.entity_id})`);

  if (Object.keys(structured).length === 0 && p.specialist !== "payroll-classification-gate") flags.push("NO_STRUCTURED");
  if (narrative.length < 80) flags.push(`SHORT_NARRATIVE(${narrative.length}ch)`);

  return {
    specialist: p.specialist, workflow: p.workflow, stage: p.stage,
    status: res?.status, latency_ms: latency,
    confidence: body?.confidence,
    promptVersion: body?.promptVersion,
    narrative_len: narrative.length,
    citations_n: Array.isArray(citations) ? citations.length : 0,
    structured_keys: Object.keys(structured).length,
    flags,
    narrative_head: narrative.slice(0, 180).replace(/\n/g, " "),
  };
}

async function main() {
  const filtered = FILTER ? probes.filter(p => p.specialist.includes(FILTER) || p.workflow.includes(FILTER)) : probes;
  console.error(`W10.A smoke harness — ${filtered.length} probes against ${BASE}\n`);

  const results = [];
  for (const p of filtered) {
    process.stderr.write(`  ${p.workflow.padEnd(4)} ${p.specialist.padEnd(28)} `);
    const r = await probeOne(p);
    results.push(r);
    const status = r.flags.length === 0 ? "✓ OK"
      : r.flags.some(f => f.startsWith("CYA_") || f === "DEMO_FALLBACK" || f.startsWith("HTTP_") || f.startsWith("API_ERR")) ? "✗ FAIL"
      : "⚠ WARN";
    process.stderr.write(`${(r.status || "ERR").toString().padEnd(4)} ${(r.latency_ms + "ms").padEnd(8)} ${r.structured_keys}struct ${r.citations_n}cites  ${status} ${r.flags.length ? "→ " + r.flags.join(",") : ""}\n`);
  }

  console.log("\n=== SUMMARY ===");
  console.log("workflow | specialist                     | http | conf   | nlen | cites | struct | ver | latms | flags");
  for (const r of results) {
    const flags = r.flags.length ? r.flags.join(";") : "OK";
    console.log([
      r.workflow.padEnd(8), r.specialist.padEnd(30),
      String(r.status || "ERR").padEnd(4),
      (r.confidence || "—").padEnd(6),
      String(r.narrative_len).padEnd(4),
      String(r.citations_n).padEnd(5),
      String(r.structured_keys).padEnd(6),
      (r.promptVersion || "—").padEnd(3),
      String(r.latency_ms).padEnd(5),
      flags
    ].join(" | "));
  }

  const fails = results.filter(r => r.flags.some(f => f.startsWith("CYA_") || f === "DEMO_FALLBACK" || f.startsWith("HTTP_") || f.startsWith("API_ERR")));
  const warns = results.filter(r => r.flags.length > 0 && !fails.includes(r));
  console.log(`\n=== TOTAL: ${results.length} probed, ${fails.length} FAIL, ${warns.length} WARN, ${results.length - fails.length - warns.length} OK ===`);

  if (fails.length > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(2); });
