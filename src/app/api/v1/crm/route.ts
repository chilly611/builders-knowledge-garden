import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════
// CRM API — The Killer App's revenue backbone
// GET  /api/v1/crm           → list contacts (filterable)
// GET  /api/v1/crm?id=xxx    → single contact + activities
// GET  /api/v1/crm?stats=1   → pipeline summary
// POST /api/v1/crm           → create contact
// PATCH /api/v1/crm          → update contact
// ═══════════════════════════════════════════════════════════════

const STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "dormant"] as const;
const CONTACT_TYPES = ["lead", "prospect", "client", "past_client", "vendor", "partner"] as const;
const TEMPERATURES = ["hot", "warm", "cool", "cold"] as const;

interface CRMContact {
  id: string;
  first_name: string;
  last_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  contact_type: string;
  stage: string;
  temperature: string;
  project_type?: string;
  project_location?: string;
  estimated_value?: number;
  lead_score: number;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_contact_at?: string;
  next_followup?: string;
  archived?: boolean;
  stage_changed_at?: string;
  activities?: CRMActivity[];
}

interface CRMActivity {
  id: string;
  activity_type: string;
  title: string;
  body?: string;
  outcome?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
}

// ═══ MOCK DATA (until Supabase CRM tables are created) ═══
const MOCK_CONTACTS: CRMContact[] = [
  {
    id: "crm-001", first_name: "Sarah", last_name: "Chen", company: "Westfield Developments",
    email: "sarah@westfield.dev", phone: "(512) 555-0142",
    contact_type: "prospect", stage: "qualified", temperature: "hot",
    project_type: "multi-family", project_location: "Austin, TX",
    estimated_value: 4200000, lead_score: 82,
    notes: "Met at Austin Construction Summit. Interested in our scheduling + estimating tools. Has 3 projects in pipeline.",
    tags: ["summit-lead", "multi-family", "high-value"],
    created_at: "2026-03-10T09:00:00Z", updated_at: "2026-03-24T14:30:00Z",
    last_contact_at: "2026-03-24T14:30:00Z", next_followup: "2026-03-28T10:00:00Z",
    activities: [
      { id: "act-001", activity_type: "meeting", title: "Austin Construction Summit intro", body: "Met at booth. Discussed scheduling pain points with Procore.", outcome: "positive", completed_at: "2026-03-10T15:00:00Z", created_at: "2026-03-10T15:30:00Z" },
      { id: "act-002", activity_type: "call", title: "Follow-up call — demo scheduled", body: "45 min call. Showed Smart Project Launcher. Very impressed with auto-population.", outcome: "positive", completed_at: "2026-03-18T11:00:00Z", created_at: "2026-03-18T11:45:00Z" },
      { id: "act-003", activity_type: "proposal", title: "Team tier proposal sent", body: "Sent Team $199/mo proposal for 12-person team. Includes comparison to Procore pricing.", created_at: "2026-03-24T14:30:00Z" },
    ],
  },
  {
    id: "crm-002", first_name: "Marcus", last_name: "Rivera", company: "Rivera Electric",
    email: "marcus@riveraelectric.com", phone: "(305) 555-0198",
    contact_type: "lead", stage: "contacted", temperature: "warm",
    project_type: "commercial", project_location: "Miami, FL",
    estimated_value: 850000, lead_score: 55,
    notes: "Specialty electrical contractor. Interested in code lookup + cert tracking.",
    tags: ["electrical", "specialty", "miami"],
    created_at: "2026-03-20T08:00:00Z", updated_at: "2026-03-22T10:00:00Z",
    last_contact_at: "2026-03-22T10:00:00Z", next_followup: "2026-03-27T09:00:00Z",
    activities: [
      { id: "act-010", activity_type: "email", title: "Intro email with NEC code lookup demo", outcome: "neutral", completed_at: "2026-03-22T10:00:00Z", created_at: "2026-03-22T10:00:00Z" },
    ],
  },
  {
    id: "crm-003", first_name: "Jennifer", last_name: "Park", company: "",
    email: "jpark.builds@gmail.com", phone: "(828) 555-0231",
    contact_type: "lead", stage: "new", temperature: "warm",
    project_type: "single-family", project_location: "Asheville, NC",
    estimated_value: 450000, lead_score: 40,
    notes: "Came through Dream Builder — designed a modern farmhouse. Shared dream link with spouse.",
    tags: ["dream-builder", "diy", "asheville", "modern-farmhouse"],
    created_at: "2026-03-25T16:00:00Z", updated_at: "2026-03-25T16:00:00Z",
    activities: [],
  },
  {
    id: "crm-004", first_name: "Tom", last_name: "Nguyen", company: "Nguyen General Contracting",
    email: "tom@nguyengc.com", phone: "(213) 555-0177",
    contact_type: "client", stage: "won", temperature: "hot",
    project_type: "residential", project_location: "Los Angeles, CA",
    estimated_value: 1200000, lead_score: 95,
    notes: "Signed Pro tier. Running 3 residential projects. Happy with scheduling + copilot.",
    tags: ["gc", "residential", "los-angeles", "pro-tier"],
    created_at: "2026-02-15T09:00:00Z", updated_at: "2026-03-25T08:00:00Z",
    last_contact_at: "2026-03-25T08:00:00Z",
    activities: [
      { id: "act-020", activity_type: "contract", title: "Pro tier signed", outcome: "positive", completed_at: "2026-02-20T14:00:00Z", created_at: "2026-02-20T14:00:00Z" },
      { id: "act-021", activity_type: "call", title: "Onboarding call", body: "Walked through Smart Launcher + Copilot. Set up 3 projects.", outcome: "positive", completed_at: "2026-02-22T10:00:00Z", created_at: "2026-02-22T10:30:00Z" },
    ],
  },
  {
    id: "crm-005", first_name: "Angela", last_name: "Washington", company: "DataCore Construction",
    email: "awash@datacoreconstruction.com", phone: "(703) 555-0312",
    contact_type: "prospect", stage: "proposal", temperature: "hot",
    project_type: "data-center", project_location: "Northern Virginia",
    estimated_value: 18500000, lead_score: 78,
    notes: "Enterprise prospect. Building 2 data centers in NoVA. Needs Tier III compliance tracking.",
    tags: ["data-center", "enterprise", "nova", "high-value"],
    created_at: "2026-03-05T09:00:00Z", updated_at: "2026-03-24T16:00:00Z",
    last_contact_at: "2026-03-24T16:00:00Z", next_followup: "2026-03-26T14:00:00Z",
    activities: [
      { id: "act-030", activity_type: "meeting", title: "Discovery call — data center requirements", outcome: "positive", completed_at: "2026-03-08T14:00:00Z", created_at: "2026-03-08T15:00:00Z" },
      { id: "act-031", activity_type: "proposal", title: "Enterprise tier proposal — custom pricing", body: "Proposed Enterprise $1,499/mo with dedicated API + Tier III compliance module.", created_at: "2026-03-24T16:00:00Z" },
    ],
  },
];

// ═══ GET Handler ═══
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const stats = searchParams.get("stats");
  const stage = searchParams.get("stage");
  const contactType = searchParams.get("type");
  const temperature = searchParams.get("temperature");
  const search = searchParams.get("q");

  // Single contact with activities
  if (id) {
    const contact = MOCK_CONTACTS.find(c => c.id === id);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    return NextResponse.json({ contact });
  }

  // Pipeline stats
  if (stats) {
    const pipeline: Record<string, { count: number; value: number }> = {};
    for (const s of STAGES) {
      const inStage = MOCK_CONTACTS.filter(c => c.stage === s && !c.archived);
      pipeline[s] = { count: inStage.length, value: inStage.reduce((sum, c) => sum + (c.estimated_value || 0), 0) };
    }
    const total = MOCK_CONTACTS.filter(c => !c.archived);
    return NextResponse.json({
      pipeline,
      totals: {
        contacts: total.length,
        total_value: total.reduce((sum, c) => sum + (c.estimated_value || 0), 0),
        avg_score: Math.round(total.reduce((sum, c) => sum + c.lead_score, 0) / total.length),
        hot: total.filter(c => c.temperature === "hot").length,
        needs_followup: total.filter(c => c.next_followup && new Date(c.next_followup) <= new Date()).length,
      },
    });
  }

  // Filtered list
  let contacts = MOCK_CONTACTS.filter(c => !c.archived);
  if (stage) contacts = contacts.filter(c => c.stage === stage);
  if (contactType) contacts = contacts.filter(c => c.contact_type === contactType);
  if (temperature) contacts = contacts.filter(c => c.temperature === temperature);
  if (search) {
    const q = search.toLowerCase();
    contacts = contacts.filter(c =>
      c.first_name.toLowerCase().includes(q) ||
      (c.last_name || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.includes(q))
    );
  }

  // Sort by lead_score desc (hottest first)
  contacts.sort((a, b) => b.lead_score - a.lead_score);

  // Strip activities from list view (include count only)
  const list = contacts.map(({ activities, ...rest }) => ({
    ...rest,
    activity_count: (activities || []).length,
  }));

  return NextResponse.json({ contacts: list, total: list.length });
}

// ═══ POST Handler — Create contact ═══
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { first_name, last_name, company, email, phone, contact_type, stage, project_type, project_location, estimated_value, notes, tags } = body;

    if (!first_name) {
      return NextResponse.json({ error: "first_name is required" }, { status: 400 });
    }

    // In production: insert into Supabase crm_contacts with org_id from auth
    const newContact: CRMContact = {
      id: `crm-${Date.now()}`,
      first_name,
      last_name: last_name || "",
      company: company || "",
      email: email || "",
      phone: phone || "",
      contact_type: CONTACT_TYPES.includes(contact_type) ? contact_type : "lead",
      stage: STAGES.includes(stage) ? stage : "new",
      temperature: "warm",
      project_type: project_type || "",
      project_location: project_location || "",
      estimated_value: estimated_value || 0,
      lead_score: 30, // default score, AI adjusts later
      notes: notes || "",
      tags: tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [],
    };

    // Mock: add to in-memory array (in production: Supabase INSERT)
    MOCK_CONTACTS.push(newContact);

    return NextResponse.json({ contact: newContact, message: "Contact created" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// ═══ PATCH Handler — Update contact ═══
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const contact = MOCK_CONTACTS.find(c => c.id === id);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    // Apply updates
    const allowed = ["first_name","last_name","company","email","phone","contact_type","stage","temperature","project_type","project_location","estimated_value","lead_score","notes","tags","next_followup","archived"];
    for (const key of allowed) {
      if (key in updates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (contact as any)[key] = updates[key];
      }
    }
    contact.updated_at = new Date().toISOString();
    if (updates.stage) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (contact as any).stage_changed_at = new Date().toISOString();
    }

    return NextResponse.json({ contact, message: "Contact updated" });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
