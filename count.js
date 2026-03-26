const { createClient } = require("@supabase/supabase-js");
const s = createClient(
  "https://vlezoyalutexenbnzzui.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXpveWFsdXRleGVuYm56enVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE3NTkwMSwiZXhwIjoyMDg3NzUxOTAxfQ.0-gT1eeuLwCK4khGkuh8g6Srzz6LcuzIcyGrGFXfyOk"
);
async function main() {
  // Check all tables that might have knowledge data
  const tables = ["species","genera","knowledge_entities","jurisdictions","entity_relationships",
    "code_sections","materials","safety_rules","building_types","construction_methods"];
  for (const t of tables) {
    const { count, error } = await s.from(t).select("id", { count: "exact", head: true });
    if (!error) console.log(`${t}: ${count}`);
    else console.log(`${t}: (not found or error)`);
  }
}
main();
