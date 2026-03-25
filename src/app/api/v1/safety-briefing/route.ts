// Builder's Knowledge Garden — Safety Briefing Generator
// POST /api/v1/safety-briefing
// task types + jurisdiction + weather → structured safety briefing
// Phase 1 deliverable — Product 5 (Voice-First Field Ops) preview

import { NextRequest, NextResponse } from "next/server";
import { eventBus, EVENT_TYPES } from "@/lib/events";

interface BriefingRequest {
  tasks: string[];
  jurisdiction?: string;
  weather?: { temp_f?: number; conditions?: string; wind_mph?: number };
  crew_size?: number;
  project_name?: string;
  date?: string;
}

interface SafetyBriefing {
  date: string;
  project: string;
  crew_size: number;
  weather_alerts: string[];
  task_hazards: TaskHazard[];
  ppe_required: string[];
  emergency_info: EmergencyInfo;
  toolbox_talk: string;
  sign_off_required: boolean;
}

interface TaskHazard {
  task: string;
  hazards: string[];
  controls: string[];
  ppe: string[];
  regulations: string[];
}

interface EmergencyInfo {
  emergency_number: string;
  nearest_hospital: string;
  first_aid_location: string;
  assembly_point: string;
  site_address: string;
}

// Safety knowledge by task type
const TASK_SAFETY: Record<string, Omit<TaskHazard, "task">> = {
  "roof work": {
    hazards: ["Falls from elevation (leading cause of construction fatalities)", "Unstable/sloped surfaces", "Weather exposure (heat, cold, wind)", "Electrical contact from overhead lines"],
    controls: ["100% tie-off at all times", "Guardrails on all open edges above 10'", "Warning line system at 6' from edge minimum", "Designated controlled access zones marked"],
    ppe: ["Full body harness with shock-absorbing lanyard", "Hard hat (Type I, Class E)", "Non-slip rubber-soled boots", "Safety glasses (tinted for sun exposure)"],
    regulations: ["OSHA 1926.501(b)(13) — Residential construction", "OSHA 1926.502 — Fall protection systems", "OSHA 1926.503 — Training requirements"],
  },
  "excavation": {
    hazards: ["Cave-in / trench collapse (can be fatal in seconds)", "Falls into open excavation", "Underground utility strikes (gas, electric, water)", "Hazardous atmosphere in deep trenches"],
    controls: ["Competent person on-site at all times", "Protective systems for all trenches >5'", "Call 811 before digging (minimum 48hr notice)", "Spoil pile minimum 2' from trench edge", "Atmospheric testing for trenches >4' deep"],
    ppe: ["Hard hat (Class E)", "High-visibility vest (Class 2 minimum)", "Steel-toe boots", "Respirator if atmosphere not tested"],
    regulations: ["OSHA 1926.651 — General requirements", "OSHA 1926.652 — Protective systems", "OSHA 1926.651(b) — Utility location"],
  },
  "concrete pour": {
    hazards: ["Chemical burns from wet concrete (pH 12-13)", "Silica dust exposure during cutting/grinding", "Musculoskeletal injury from repetitive heavy lifting", "Struck-by from concrete trucks and pump booms"],
    controls: ["No direct skin contact with wet concrete", "Wash exposed skin within 15 minutes", "Wet cutting methods only", "Designated traffic routes for trucks", "Spotter for pump boom operations"],
    ppe: ["Alkali-resistant gloves (nitrile or rubber)", "Rubber boots — concrete must not enter", "Safety glasses or goggles", "Long sleeves", "N95 respirator for cutting/grinding"],
    regulations: ["OSHA 1926.55 — Gases, vapors, dusts", "OSHA 1926.701 — Concrete and masonry", "OSHA Silica Standard 1926.1153"],
  },
  "electrical work": {
    hazards: ["Electrocution (contact with energized circuits)", "Arc flash and arc blast", "Burns from electrical faults", "Falls from ladders and lifts"],
    controls: ["Lockout/tagout verified before any work", "Test circuits with verified tester before touching", "Qualified persons only for energized work", "Maintain NFPA 70E approach boundaries", "Insulated tools for all electrical work"],
    ppe: ["Insulated gloves rated for circuit voltage", "Arc-rated face shield and clothing", "Non-conductive hard hat (Class E)", "Safety glasses with side shields", "Insulated matting for panel work"],
    regulations: ["OSHA 1926.405 — Wiring methods", "NFPA 70E — Electrical safety in workplace", "NEC Article 110 — Requirements for installations"],
  },
  "welding": {
    hazards: ["UV radiation and arc eye", "Metal fume fever from zinc/galvanized steel", "Fire and explosion from sparks", "Burns from hot metal and slag"],
    controls: ["Hot work permit required for all welding", "Fire watch maintained 30 min after welding", "Remove combustibles within 35' radius", "Ventilation or fume extraction in enclosed areas", "Fire extinguisher within 20'"],
    ppe: ["Welding helmet (shade 10-14)", "Leather welding gloves", "Fire-resistant clothing (no synthetics)", "Leather apron for vertical/overhead work", "Steel-toe boots with metatarsal guards"],
    regulations: ["OSHA 1926.351-354 — Welding and cutting", "AWS D1.1 — Structural welding code", "NFPA 51B — Hot work standard"],
  },
  "scaffold work": {
    hazards: ["Falls from scaffold platform", "Scaffold collapse from overloading", "Struck by falling tools/materials", "Electrocution from nearby power lines"],
    controls: ["Competent person inspects before each shift", "Maximum load capacity posted and not exceeded", "Guardrails on all open sides above 10'", "Toe boards on all platforms", "Tool lanyards for all hand tools"],
    ppe: ["Full body harness when above 10' (per OSHA)", "Hard hat", "Non-slip boots", "Tool lanyards"],
    regulations: ["OSHA 1926.451 — General requirements", "OSHA 1926.452 — Specific scaffold types", "OSHA 1926.454 — Training"],
  },
  "crane operations": {
    hazards: ["Struck by suspended load", "Crane tip-over", "Contact with overhead power lines", "Rigging failure"],
    controls: ["Signal person required for all blind lifts", "Pre-lift plan for all critical lifts (>75% capacity)", "Maintain 20' clearance from power lines", "Daily crane and rigging inspection", "Barricade swing radius"],
    ppe: ["Hard hat", "High-visibility vest", "Steel-toe boots", "Safety glasses"],
    regulations: ["OSHA 1926.1400-1442 — Crane standard", "ASME B30 series", "OSHA 1926.1431 — Power line clearance"],
  },
  "demolition": {
    hazards: ["Structural collapse", "Asbestos / lead paint exposure", "Falling debris", "Silica dust from concrete breaking"],
    controls: ["Engineering survey before ANY demolition begins", "Hazmat survey completed (asbestos, lead, PCBs)", "Bracing plan for adjacent structures", "Exclusion zones established and enforced", "Continuous dust suppression"],
    ppe: ["Hard hat with face shield", "P100 respirator (minimum)", "Full body coveralls for hazmat areas", "Steel-toe boots", "Cut-resistant gloves"],
    regulations: ["OSHA 1926.850-860 — Demolition", "EPA NESHAP — Asbestos", "OSHA 1926.62 — Lead in construction"],
  },
};

const TOOLBOX_TALKS: Record<string, string> = {
  "roof work": "Today's focus: FALL PROTECTION. Falls are the #1 cause of death in construction — 33.5% of all fatalities. Before stepping onto any elevated surface, ask yourself: Am I tied off? Is my harness inspected? Do I know where my anchor point is? If the answer to ANY of these is no, STOP and get it right. No shortcut is worth your life.",
  "excavation": "Today's focus: TRENCH SAFETY. A cubic yard of soil weighs 3,000 pounds — enough to crush you instantly. Never enter a trench deeper than 5 feet without a protective system. Never work in a trench without a competent person present. Always have a way to get out within 25 feet of your work position.",
  "concrete pour": "Today's focus: CONCRETE BURNS. Wet concrete has a pH of 12-13 — it will burn your skin on contact. Today we're working with concrete, so: long sleeves, rubber boots, alkali-resistant gloves. If concrete gets on your skin, wash it off within 15 minutes or you WILL get a chemical burn. This is not optional.",
  "electrical work": "Today's focus: LOCKOUT/TAGOUT. Every year, workers are killed by circuits they assumed were de-energized. Today's rule is simple: verify DEAD before you touch. Use YOUR lock, YOUR tag, YOUR tester. Don't trust someone else's lockout. Test it yourself. Every time.",
  "welding": "Today's focus: HOT WORK SAFETY. Welding sparks can travel 35 feet and start fires hours after you leave. Before you strike an arc: Is the hot work permit posted? Are combustibles cleared? Is the fire watch assigned? Fire extinguisher within reach? If not — don't start.",
  "scaffold work": "Today's focus: SCAFFOLD SAFETY. Before you step on any scaffold today, verify: Did the competent person inspect it this morning? Is the load capacity posted? Are all guardrails in place? Is the base on solid footing? Scaffolds support you — but only if they're set up right.",
  "crane operations": "Today's focus: CRANE SAFETY. Never stand under a suspended load. Never walk through a crane's swing radius. If you're the signal person, you are the ONLY one communicating with the operator. Everyone else: stay clear, stay visible, stay alive.",
  "demolition": "Today's focus: DEMOLITION HAZARDS. Behind every wall could be asbestos, lead paint, or a live utility. The engineering survey tells us what to expect, but surprises happen. If you see something unexpected — STOP work and report it. No demo task is worth a hazmat exposure.",
};

// Weather-based alerts
function getWeatherAlerts(weather?: BriefingRequest["weather"]): string[] {
  const alerts: string[] = [];
  if (!weather) return ["⚠️ Weather data not provided — check conditions before starting work"];
  
  const { temp_f, conditions, wind_mph } = weather;
  
  if (temp_f !== undefined) {
    if (temp_f >= 90) alerts.push(`🌡️ HEAT ALERT: ${temp_f}°F — mandatory water breaks every 20 min. Watch for heat exhaustion signs: dizziness, nausea, excessive sweating.`);
    if (temp_f >= 100) alerts.push(`🔴 EXTREME HEAT: ${temp_f}°F — reduce work pace, buddy system required, shade breaks every 15 min.`);
    if (temp_f <= 32) alerts.push(`❄️ COLD ALERT: ${temp_f}°F — concrete curing compromised below 50°F. Watch for hypothermia and frostbite.`);
    if (temp_f <= 20) alerts.push(`🔴 EXTREME COLD: ${temp_f}°F — limit outdoor exposure, warm-up breaks every 30 min, insulated PPE required.`);
  }
  
  if (wind_mph !== undefined) {
    if (wind_mph >= 20) alerts.push(`💨 WIND ADVISORY: ${wind_mph} mph — secure loose materials, caution with crane operations.`);
    if (wind_mph >= 30) alerts.push(`🔴 HIGH WIND: ${wind_mph} mph — suspend crane operations, no work on scaffolds or elevated platforms.`);
    if (wind_mph >= 40) alerts.push(`🔴 DANGEROUS WIND: ${wind_mph} mph — consider suspending all elevated work. Evacuate scaffolds immediately.`);
  }
  
  if (conditions) {
    const c = conditions.toLowerCase();
    if (c.includes("rain") || c.includes("storm")) alerts.push("🌧️ WET CONDITIONS: Slip hazard on all surfaces. No electrical work outdoors. Secure excavation edges.");
    if (c.includes("thunder") || c.includes("lightning")) alerts.push("⛈️ LIGHTNING RISK: All workers must evacuate to enclosed structures. No crane operations. Wait 30 min after last strike.");
    if (c.includes("fog")) alerts.push("🌫️ LOW VISIBILITY: Use additional spotters, increase lighting, reduce vehicle speeds on site.");
    if (c.includes("snow") || c.includes("ice")) alerts.push("🧊 ICE/SNOW: Clear walking paths, sand/salt ramps, extra caution on ladders and scaffolds.");
  }
  
  if (alerts.length === 0) alerts.push("✅ No weather alerts — conditions favorable for planned work.");
  return alerts;
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  let body: BriefingRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tasks, jurisdiction, weather, crew_size = 5, project_name, date } = body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json(
      { error: "tasks array is required (e.g., ['roof work', 'electrical work'])", available_tasks: Object.keys(TASK_SAFETY) },
      { status: 400 }
    );
  }

  // Build task hazards
  const taskHazards: TaskHazard[] = [];
  const allPPE = new Set<string>();

  for (const task of tasks) {
    const key = task.toLowerCase();
    const safety = TASK_SAFETY[key];
    if (safety) {
      taskHazards.push({ task, ...safety });
      safety.ppe.forEach(p => allPPE.add(p));
    } else {
      // Generic hazard for unknown tasks
      taskHazards.push({
        task,
        hazards: ["Assess site-specific hazards before starting work"],
        controls: ["Job hazard analysis (JHA) required", "Supervisor must approve work plan"],
        ppe: ["Hard hat", "Safety glasses", "High-vis vest", "Steel-toe boots"],
        regulations: ["OSHA 1926 Subpart C — General safety and health"],
      });
      ["Hard hat", "Safety glasses", "High-vis vest", "Steel-toe boots"].forEach(p => allPPE.add(p));
    }
  }

  // Always require base PPE
  ["Hard hat", "Safety glasses", "High-visibility vest", "Steel-toe boots"].forEach(p => allPPE.add(p));

  // Get primary task for toolbox talk
  const primaryTask = tasks[0].toLowerCase();
  const toolboxTalk = TOOLBOX_TALKS[primaryTask] || `Today we're performing ${tasks.join(", ")}. Before starting, review the hazards for each task. Ask questions if anything is unclear. Look out for your coworkers. If you see something unsafe, say something.`;

  const briefing: SafetyBriefing = {
    date: date || new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    project: project_name || "Unnamed Project",
    crew_size,
    weather_alerts: getWeatherAlerts(weather),
    task_hazards: taskHazards,
    ppe_required: Array.from(allPPE),
    emergency_info: {
      emergency_number: "911",
      nearest_hospital: "Check site safety plan",
      first_aid_location: "Check site safety plan",
      assembly_point: "Check site safety plan",
      site_address: "Check site safety plan",
    },
    toolbox_talk: toolboxTalk,
    sign_off_required: true,
  };

  // Emit event for RSI tracking
  eventBus.emit(EVENT_TYPES.COMPLIANCE_CHECK, {
    type: "safety_briefing",
    tasks,
    jurisdiction,
    crew_size,
    weather_alerts_count: briefing.weather_alerts.length,
  }, { source: "safety-briefing-api" });

  return NextResponse.json({
    briefing,
    _meta: { latency_ms: Date.now() - start, tasks_covered: taskHazards.length, version: "0.1.0" },
  });
}

// GET: list available task types
export async function GET() {
  return NextResponse.json({
    available_tasks: Object.keys(TASK_SAFETY),
    description: "POST with {tasks: ['roof work', 'excavation'], weather: {temp_f: 95}, crew_size: 8} to generate a safety briefing",
    _example: {
      tasks: ["roof work", "electrical work"],
      jurisdiction: "ca-la",
      weather: { temp_f: 95, conditions: "sunny", wind_mph: 12 },
      crew_size: 8,
      project_name: "Sunset Plaza Renovation",
    },
  });
}
