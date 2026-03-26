// Batch relationship creation for new entities
const SUPABASE_URL = "https://vlezoyalutexenbnzzui.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXpveWFsdXRleGVuYm56enVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE3NTkwMSwiZXhwIjoyMDg3NzUxOTAxfQ.0-gT1eeuLwCK4khGkuh8g6Srzz6LcuzIcyGrGFXfyOk";
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

async function getIds(slugs) {
  const filter = slugs.map(s => `slug.eq.${s}`).join(",");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_entities?or=(${filter})&select=id,slug`, { headers });
  const data = await res.json();
  const map = {};
  data.forEach(e => map[e.slug] = e.id);
  return map;
}

async function postRels(rels) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/entity_relationships?on_conflict=source_id,target_id,relationship`, {
    method: "POST", headers: { ...headers, Prefer: "return=minimal,resolution=merge-duplicates" },
    body: JSON.stringify(rels),
  });
  if (!res.ok) { const t = await res.text(); console.error(`  ERROR ${res.status}: ${t.slice(0,200)}`); return 0; }
  return rels.length;
}

function rel(sourceId, targetId, relationship, strength = 0.7) {
  return { source_id: sourceId, target_id: targetId, relationship, strength, metadata: {} };
}

async function main() {
  // Fetch all entity IDs we need
  const allSlugs = [
    // NEC new
    "nec-article-400","nec-article-410","nec-article-430","nec-article-450","nec-article-480",
    "nec-article-500","nec-article-625","nec-article-690","nec-article-700","nec-article-706",
    "nec-article-770","nec-article-800",
    // NEC existing
    "nec-article-210","nec-article-220","nec-article-230","nec-article-240","nec-article-250",
    "nec-article-300","nec-article-310","nec-article-334","nec-article-422","nec-article-440",
    // International
    "uk-part-a","uk-part-b","uk-part-c","uk-part-f","uk-part-k","uk-part-l","uk-part-m","uk-part-s",
    "eurocode-0","eurocode-1","eurocode-2","eurocode-3","eurocode-7","eurocode-8",
    "australia-ncc","australia-ncc-vol1","australia-ncc-vol2","japan-bsl","japan-bsl-seismic",
    "india-nbc","china-gb50009",

    // Materials new
    "material-rebar-3","material-rebar-5","material-welded-wire","material-concrete-3000","material-concrete-4000",
    "material-structural-steel-w","material-steel-hss-round","material-aluminum-6061",
    "material-copper-type-l","material-cpvc","material-abs-pipe",
    "material-rigid-insulation","material-mineral-wool","material-zip-sheathing","material-tpo-membrane",
    // Existing materials
    "material-rebar-4","material-concrete-5000-psi","material-hss-steel","material-spray-foam",
    "material-osb","material-xps-foam","material-glulam","material-clt","material-epdm-membrane",
    // Trades new + existing
    "trade-ironworker","trade-glazier","trade-sheet-metal","trade-tile-setter","trade-crane-operator","trade-surveyor",
    "trade-electrician","trade-plumber","trade-carpenter","trade-hvac-technician",
    // Safety new
    "safety-confined-space","safety-crane-operations","safety-silica","safety-trench-shoring",
    "safety-hot-work","safety-heat-illness","safety-lockout-tagout","safety-noise-exposure",
    "safety-eu-osha-fall","safety-au-whs-code",
    // Methods new
    "method-shotcrete","method-post-tension","method-helical-piles","method-curtain-wall",
    "method-precast-tilt-up","method-green-roof","method-epoxy-coating","method-hvac-commissioning","method-blower-door",
    // Standards new
    "standard-astm-c90","standard-astm-e119","standard-astm-e84","standard-aci-318",
    "standard-aisc-360","standard-ashrae-62-1","standard-ashrae-90-1",
    // Building types, equipment, permits, inspections, sequences
    "btype-data-center","btype-cold-storage","btype-vertical-farm","btype-ev-charging","btype-mixed-use",
    "equip-tower-crane","equip-excavator","equip-concrete-pump","equip-scissor-lift",
    "permit-fire-alarm","permit-stormwater","permit-demolition","permit-encroachment","permit-fire-sprinkler",
    "inspect-concrete-pre-pour","inspect-underground-plumbing","inspect-energy-envelope","inspect-fire-wall",
    "seq-steel-erection","seq-roofing-install","seq-drywall-finish","seq-commissioning","seq-site-work",
    // Codes existing
    "ibc-chapter-9","ibc-chapter-7","ibc-chapter-16","iecc-c402","iecc-c403",
  ];

  console.log("Fetching entity IDs...");
  const ids = await getIds(allSlugs);
  console.log(`Found ${Object.keys(ids).length} entities`);
  const missing = allSlugs.filter(s => !ids[s]);
  if (missing.length) console.log("Missing:", missing.join(", "));

  const rels = [];
  const r = (src, tgt, type, str = 0.7) => {
    if (ids[src] && ids[tgt]) rels.push(rel(ids[src], ids[tgt], type, str));
  };

  // NEC articles cross-references
  r("nec-article-625","nec-article-210","requires",0.8); // EV charging → branch circuits
  r("nec-article-625","nec-article-240","requires",0.7); // EV → overcurrent
  r("nec-article-690","nec-article-240","requires",0.8); // Solar → overcurrent
  r("nec-article-690","nec-article-250","requires",0.8); // Solar → grounding
  r("nec-article-690","nec-article-310","requires",0.7); // Solar → conductors
  r("nec-article-700","nec-article-230","requires",0.8); // Emergency → services
  r("nec-article-700","nec-article-240","requires",0.7); // Emergency → overcurrent
  r("nec-article-706","nec-article-480","related_to",0.9); // ESS → batteries
  r("nec-article-706","nec-article-690","related_to",0.8); // ESS → solar
  r("nec-article-430","nec-article-240","requires",0.8); // Motors → overcurrent
  r("nec-article-430","nec-article-310","requires",0.7); // Motors → conductors
  r("nec-article-450","nec-article-240","requires",0.8); // Transformers → overcurrent
  r("nec-article-410","nec-article-210","requires",0.7); // Lighting → branch circuits
  r("nec-article-770","nec-article-800","related_to",0.8); // Fiber → communications

  // NEC → Trade: electrician
  ["nec-article-400","nec-article-410","nec-article-430","nec-article-450","nec-article-480",
   "nec-article-500","nec-article-625","nec-article-690","nec-article-700","nec-article-706",
   "nec-article-770","nec-article-800"].forEach(s => r(s, "trade-electrician", "performed_by", 0.8));

  // International code cross-references
  r("uk-part-a","eurocode-1","cross_jurisdiction",0.8);
  r("uk-part-a","ibc-chapter-16","cross_jurisdiction",0.7);
  r("eurocode-3","standard-aisc-360","cross_jurisdiction",0.8); // EU steel ↔ US steel
  r("eurocode-8","japan-bsl-seismic","cross_jurisdiction",0.8); // EU seismic ↔ Japan seismic
  r("eurocode-7","uk-part-a","related_to",0.7); // Geotech ↔ UK structure
  r("australia-ncc-vol1","ibc-chapter-9","cross_jurisdiction",0.6); // AU fire ↔ US fire
  r("australia-ncc-vol2","uk-part-l","cross_jurisdiction",0.6); // AU residential ↔ UK energy
  r("uk-part-s","nec-article-625","cross_jurisdiction",0.8); // UK EV ↔ US EV
  r("uk-part-f","standard-ashrae-62-1","cross_jurisdiction",0.7); // UK ventilation ↔ ASHRAE

  // Materials → Standards
  r("material-rebar-3","standard-aci-318","governed_by",0.9);
  r("material-rebar-5","standard-aci-318","governed_by",0.9);
  r("material-welded-wire","standard-aci-318","governed_by",0.8);
  r("material-concrete-3000","standard-aci-318","governed_by",0.9);
  r("material-concrete-4000","standard-aci-318","governed_by",0.9);
  r("material-structural-steel-w","standard-aisc-360","governed_by",0.9);
  r("material-steel-hss-round","standard-aisc-360","governed_by",0.9);
  r("material-mineral-wool","standard-astm-e119","tested_by",0.7);
  r("material-rigid-insulation","standard-ashrae-90-1","governed_by",0.7);
  r("material-zip-sheathing","standard-astm-e84","tested_by",0.7);

  // Materials → Methods
  r("material-concrete-3000","method-shotcrete","used_in",0.7);
  r("material-concrete-4000","method-post-tension","used_in",0.9);
  r("material-rebar-5","method-post-tension","used_in",0.8);
  r("material-structural-steel-w","method-curtain-wall","used_in",0.7);
  r("material-aluminum-6061","method-curtain-wall","used_in",0.9);
  r("material-concrete-4000","method-precast-tilt-up","used_in",0.9);
  r("material-tpo-membrane","method-green-roof","used_in",0.7);
  r("material-rigid-insulation","method-blower-door","tested_by",0.6);
  r("material-zip-sheathing","method-blower-door","tested_by",0.7);

  // Trades → Methods
  r("trade-ironworker","method-curtain-wall","performs",0.7);
  r("trade-ironworker","method-post-tension","performs",0.6);
  r("trade-glazier","method-curtain-wall","performs",0.9);
  r("trade-tile-setter","method-epoxy-coating","related_to",0.5);
  r("trade-hvac-technician","method-hvac-commissioning","performs",0.9);
  r("trade-sheet-metal","method-hvac-commissioning","related_to",0.7);

  // Trades → Safety
  r("trade-crane-operator","safety-crane-operations","governed_by",0.9);
  r("trade-ironworker","safety-crane-operations","related_to",0.7);
  r("trade-electrician","safety-lockout-tagout","governed_by",0.8);
  r("trade-plumber","safety-confined-space","governed_by",0.7);

  // Equipment → Trades + Safety
  r("equip-tower-crane","trade-crane-operator","operated_by",0.9);
  r("equip-tower-crane","safety-crane-operations","governed_by",0.9);
  r("equip-excavator","safety-trench-shoring","related_to",0.7);
  r("equip-concrete-pump","trade-ironworker","related_to",0.5);
  r("equip-scissor-lift","safety-eu-osha-fall","governed_by",0.6);

  // Building types → Codes + Methods
  r("btype-data-center","nec-article-700","requires",0.9);
  r("btype-data-center","nec-article-706","requires",0.8);
  r("btype-data-center","standard-ashrae-90-1","governed_by",0.8);
  r("btype-ev-charging","nec-article-625","requires",0.9);
  r("btype-ev-charging","uk-part-s","cross_jurisdiction",0.8);
  r("btype-mixed-use","ibc-chapter-9","governed_by",0.8);
  r("btype-cold-storage","standard-ashrae-90-1","governed_by",0.7);
  r("btype-vertical-farm","standard-ashrae-62-1","governed_by",0.6);

  // Sequences → Inspections + Methods
  r("seq-steel-erection","inspect-fire-wall","followed_by",0.6);
  r("seq-steel-erection","trade-ironworker","performed_by",0.9);
  r("seq-steel-erection","equip-tower-crane","requires",0.8);
  r("seq-roofing-install","material-tpo-membrane","uses",0.8);
  r("seq-roofing-install","material-rigid-insulation","uses",0.7);
  r("seq-drywall-finish","inspect-energy-envelope","preceded_by",0.8);
  r("seq-commissioning","method-hvac-commissioning","implements",0.9);
  r("seq-commissioning","method-blower-door","includes",0.7);
  r("seq-site-work","permit-stormwater","requires",0.9);
  r("seq-site-work","equip-excavator","requires",0.8);
  r("seq-site-work","safety-trench-shoring","governed_by",0.8);

  // Permits → Codes + Inspections
  r("permit-fire-alarm","ibc-chapter-9","governed_by",0.9);
  r("permit-fire-sprinkler","ibc-chapter-9","governed_by",0.9);
  r("permit-fire-sprinkler","inspect-fire-wall","related_to",0.7);
  r("permit-stormwater","safety-trench-shoring","related_to",0.5);

  // Inspections → Codes + Materials
  r("inspect-concrete-pre-pour","standard-aci-318","governed_by",0.9);
  r("inspect-concrete-pre-pour","material-rebar-5","inspects",0.8);
  r("inspect-energy-envelope","standard-ashrae-90-1","governed_by",0.9);
  r("inspect-energy-envelope","material-rigid-insulation","inspects",0.7);
  r("inspect-fire-wall","standard-astm-e119","governed_by",0.9);

  console.log(`\nPosting ${rels.length} relationships...`);
  
  // Post in batches of 20
  let total = 0;
  for (let i = 0; i < rels.length; i += 20) {
    const batch = rels.slice(i, i + 20);
    const posted = await postRels(batch);
    total += posted;
    process.stdout.write(`  Batch ${Math.floor(i/20)+1}: ${posted} rels (${total} total)\n`);
  }
  
  // Check final count
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/entity_relationships?select=id`, { headers });
  const countData = await countRes.json();
  console.log(`\nDone! Posted ${total} new relationships.`);
  console.log(`Total relationships in DB: ${countData.length}`);
}

main().catch(console.error);
