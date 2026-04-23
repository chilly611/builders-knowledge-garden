/**
 * Starter prompts library — per-workflow example prompts.
 * ===========================================================
 *
 * Every workflow page shows 3 pre-baked example prompts as buttons above
 * the Ask input, so users don't stare at a blank field. Keyed by route
 * segment (estimating, code-compliance, etc.) or workflow ID (q2, q4, etc.).
 *
 * Voice: foreman, concrete, specific. Include sqft / location / materials
 * so the AI has context to work with.
 *
 * Extracted from workflow blurbs and typical use cases.
 */

export interface StarterPrompt {
  label: string; // Short button label
  prompt: string; // The actual prompt text that gets sent
}

export const STARTER_PROMPTS: Record<string, StarterPrompt[]> = {
  // ============================================================
  // WEEK 3 — LOCK IT IN (Stage 2)
  // ============================================================

  // q4: Contract templates
  'contract-templates': [
    {
      label: 'Get a general contract template',
      prompt:
        'Create a standard general contractor agreement template for a 3-month remodel job in California. Include change order process, payment terms (50/50 split), timeline, insurance, and lien waiver language.',
    },
    {
      label: 'Subcontractor agreement',
      prompt:
        'Draft a subcontractor agreement for electrical work. Rate is $85/hour, 4-week timeline, includes cleanup and final inspection. California jurisdiction.',
    },
    {
      label: 'Work order template',
      prompt:
        'Simple 1-page work order template: client name, scope, start date, estimated hours, materials included, signature lines. For quick mobilization on small jobs.',
    },
  ],

  // q5: Code compliance
  'code-compliance': [
    {
      label: 'Check egress code for a bedroom',
      prompt:
        'For a 2,500 sqft ADU in San Diego, what California code sections apply to egress windows in a bedroom? Minimum size, sill height, operational force?',
    },
    {
      label: 'Bathroom ventilation requirements',
      prompt:
        'Master bath remodel: 150 sqft, multiple plumbing fixtures, no existing vent. What is the required CFM for exhaust ventilation under San Diego code? Do I need a ducted fan or can I go through the attic?',
    },
    {
      label: 'Foundation inspection checklist',
      prompt:
        'Ground-up ADU build on slab in San Diego. What inspections do I need before, during, and after slab pour? What code sections cover rebar spacing, concrete strength, slope?',
    },
  ],

  // ============================================================
  // WEEK 3 — PLAN IT OUT (Stage 3)
  // ============================================================

  // q2: Estimating (also in Size Up but listed in Plan in the app)
  'estimating': [
    {
      label: 'Estimate a bathroom remodel',
      prompt:
        'Estimate a master bath remodel: 80 sqft, new tile shower, walk-in vanity, double sink, mid-grade fixtures, plumbing rough-in. San Diego labor and material rates.',
    },
    {
      label: 'Estimate this ADU build',
      prompt:
        'Ballpark a 2,500 sqft ADU: modernist 2-bed, 2-bath, slab foundation, standard finishes, framing, MEP, drywall, flooring. Ground-up in San Diego. What should I bid?',
    },
    {
      label: 'Quick kitchen reno quote',
      prompt:
        'Kitchen remodel: 180 sqft, new cabinets, quartz counters, gas range stays, LVP flooring, paint, hardware. 4-week timeline. Los Angeles rates. Ballpark total?',
    },
  ],

  // q6: Job sequencing
  'job-sequencing': [
    {
      label: 'Sequence an ADU build',
      prompt:
        'Sequence a 2,500 sqft ground-up ADU in San Diego. Slab foundation, wood framing, MEP (plumbing, electrical, HVAC), drywall, flooring, finishes. No existing conditions. Critical path?',
    },
    {
      label: 'Sequence a kitchen remodel',
      prompt:
        'Full kitchen remodel, occupied home. 4-week target. New cabinets, counters, appliances, flooring, electrical. What trades in order? Dust containment strategy?',
    },
    {
      label: 'Find my critical path',
      prompt:
        'Bath remodel sequence: demo, plumbing rough, tile shower pan, tile walls, fixtures, drywall touch-up, paint. Which is the longest lead? What do I run in parallel?',
    },
  ],

  // q7: Worker count
  'worker-count': [
    {
      label: 'Crew for a kitchen remodel',
      prompt:
        'Kitchen remodel, 180 sqft, 4 weeks, occupied home. Demolition, framing, plumbing, electrical, tile, flooring, paint, finish carpentry. How many crew by trade and phase?',
    },
    {
      label: 'Crew sizing for an ADU',
      prompt:
        '2,500 sqft ADU ground-up in San Diego. 16-week timeline. Slab, framing, MEP, drywall, finish. How many crew for each phase to stay on schedule?',
    },
    {
      label: 'Minimal crew bath job',
      prompt:
        '80 sqft master bath, 3-week timeline, occupied home. Minimal trade overlap. How many workers do I need? Can I run demo + rough-in in parallel?',
    },
  ],

  // q8: Permit applications
  'permit-applications': [
    {
      label: 'Permits for an ADU',
      prompt:
        '2,500 sqft ADU in San Diego County, slab foundation, 2 bed/1.5 bath, from the ground up. What permits do I need? SFM, grading, electrical, plumbing, mechanical? Timeline to approval?',
    },
    {
      label: 'Kitchen remodel permits',
      prompt:
        'Kitchen remodel in Los Angeles: new cabinets, counters, electrical panel upgrade, plumbing move. Occupied home. Which permits required? Any fast-track options?',
    },
    {
      label: 'Permit checklist for my job',
      prompt:
        'Bathroom renovation: 80 sqft, new plumbing, new electrical outlet, new exhaust fan, tile. San Diego. Do I need a permit? What paperwork before I start?',
    },
  ],

  // q9: Sub-management
  'sub-management': [
    {
      label: 'Compare plumbing bids',
      prompt:
        'Plumbing rough-in for a 2,500 sqft ADU: 3 bids between $12k and $18k. Electrician A says 3 weeks, B says 4 weeks. What questions to ask before choosing?',
    },
    {
      label: 'Sub bid analysis for tile',
      prompt:
        'Tile work: 400 sqft shower + 200 sqft bathroom walls + 300 sqft kitchen backsplash. Three subs: $8.5k, $11k, $9.2k. How do I compare quality vs. price?',
    },
    {
      label: 'Negotiate with a framing crew',
      prompt:
        'Framing bid for ADU is $28k. Market rate is $22k-$24k. What is fair? What can I negotiate: timeline, cleanup, punch list?',
    },
  ],

  // q10: Equipment
  'equipment': [
    {
      label: 'Rent or buy a concrete mixer?',
      prompt:
        'ADU slab pour: 8,500 sqft, 4-inch slab. Rent a 10-cu-yd mixer for $400/day or buy used for $2,800? How many days will I use it on future jobs?',
    },
    {
      label: 'Equipment costs for the job',
      prompt:
        'Kitchen remodel: need scaffolding ($150/week), dumpster ($400/dump), nail gun rental ($50/week). 4-week job. Breakdown by phase?',
    },
    {
      label: 'Compare lift rentals',
      prompt:
        '2-story ADU, exterior work, need a lift for 6 weeks. Boom lift ($600/day), scissor lift ($400/day), or man-lift ($250/day)? Pros and cons by phase?',
    },
  ],

  // q11: Supply ordering
  'supply-ordering': [
    {
      label: 'Order framing lumber for ADU',
      prompt:
        '2,500 sqft ADU, 2x6 walls, 16" OC. Estimate board feet for exterior walls, interior partitions, floors, roof. Build in 10% waste. Home Depot vs. commercial lumber yard pricing?',
    },
    {
      label: 'Kitchen materials list',
      prompt:
        'Kitchen remodel: 180 sqft, cabinets (custom maple), quartz counters (light gray), LVP flooring (oak look), subway tile backsplash. Lead times and costs? Order now or wait?',
    },
    {
      label: 'Drywall order for bathroom',
      prompt:
        'Bath remodel: 80 sqft, 9-foot ceilings, moisture-resistant drywall. How many sheets? Tape, joint compound, primer, paint estimates?',
    },
  ],

  // q12: Services todos
  'services-todos': [
    {
      label: 'Schedule utilities for ADU start',
      prompt:
        'ADU ground-up start next Monday. Need water meter setup, temporary power (2 weeks), trash service (12 weeks). Sewer tap timing? What do I coordinate with county?',
    },
    {
      label: 'Gas, water, electrical rough-in schedule',
      prompt:
        'Kitchen remodel, occupied home. Need temporary power for tools. Gas line move for new range. Water line for island sink. Schedule these around framing?',
    },
    {
      label: 'Plan inspections and finals',
      prompt:
        'ADU build, 16 weeks. What inspections? Footing, framing, MEP rough, drywall, final? Who schedules? Lead time from request to inspector?',
    },
  ],

  // q13: Hiring
  'hiring': [
    {
      label: 'Post a job for framers',
      prompt:
        'Need 4 framers for an 8-week ADU build. No experience required (I train), $28/hr, health insurance after 90 days. Where do I advertise? What to put in the job post?',
    },
    {
      label: 'Find electricians in my area',
      prompt:
        'San Diego area, need a licensed electrician for MEP rough-in on ADU. 4-week duration, $60/hr. How do I vet? Insurance, license check, references?',
    },
    {
      label: 'Interview a tile specialist',
      prompt:
        'Candidate for tile work: 5 years experience, portfolio looks strong, references check out. Rate is $50/hr vs. my budget of $40/hr. Questions to ask before hiring?',
    },
  ],

  // ============================================================
  // WEEK 3 — BUILD (Stage 4)
  // ============================================================

  // q14: Weather scheduling
  'weather-scheduling': [
    {
      label: 'Plan framing around rain',
      prompt:
        'Framing starts Monday, 16-week ADU. San Diego summer forecast: mostly dry but possible thunderstorm week 3. How do I sequence drywall delivery? Indoor work first?',
    },
    {
      label: 'Slab pour timing',
      prompt:
        'Slab pour scheduled for next Friday, 8,500 sqft. 40% chance of rain Wednesday-Thursday. Should I push to Monday? Cost of delay vs. risk of poor cure?',
    },
    {
      label: 'Exterior work window',
      prompt:
        'Roof framing + sheathing in week 4-5. Roofing in week 6. Weather window before monsoon season (mid-July) in Arizona. How do I buffer?',
    },
  ],

  // q15: Daily log
  'daily-log': [
    {
      label: 'Log today\'s work',
      prompt:
        'ADU framing day 12: 3 framers + 1 helper. Completed interior walls (west side), no defects. Material delivery 2 hours late. Weather clear. Safety: no incidents. Summary for the client?',
    },
    {
      label: 'Log weather impact',
      prompt:
        'Scheduled drywall hang, light rain all day, crew diverted to MEP rough cleanup. 4 hours productive. How do I record this and adjust tomorrow\'s schedule?',
    },
    {
      label: 'Record site safety check',
      prompt:
        'Daily safety walkthrough: two extension cords taped together (violation), proper fall protection in place, no PPE gaps. Corrected the cords on the spot. What goes in the log?',
    },
  ],

  // q16: OSHA toolbox
  'osha-toolbox': [
    {
      label: 'Generate a toolbox talk on fall protection',
      prompt:
        'Weekly toolbox talk for ADU roofing crew (6 workers). Pitch 6:12, no guardrails yet, harness deployment. 15 minutes max. Main hazards and prevention?',
    },
    {
      label: 'Toolbox talk on electrical hazards',
      prompt:
        'MEP rough phase, temporary power on site, 8 workers. Cord safety, outlet grounding, tool safety around live wires. OSHA 1910.307 highlight?',
    },
    {
      label: 'Heat stress and hydration talk',
      prompt:
        'Summer ADU build, San Diego, daytime temps 90-100F, 6 workers outdoors. Heat illness prevention, shade, water, rest breaks. What does OSHA require?',
    },
  ],

  // q17: Expenses
  'expenses': [
    {
      label: 'Log job expenses for the week',
      prompt:
        'ADU week 4 expenses: lumber $3,200, concrete $1,800, drywall delivery $450, tool rental $180, fuel $95, sub invoice (electrical rough) $5,400. Categories and totals?',
    },
    {
      label: 'Track material vs. labor costs',
      prompt:
        'Kitchen remodel budget: $18k materials, $12k labor (crew + subs). Halfway through. Materials on track ($9.2k spent), labor over ($7.1k, expected $6k). Variance analysis?',
    },
    {
      label: 'Reconcile sub invoices',
      prompt:
        'Framing invoice $24,500, plumbing invoice $13,200, electrical $11,800. Agreed prices were $24k, $13k, $11.5k. Overages: labor hours, material changes? How to handle?',
    },
  ],

  // q18: Outreach
  'outreach': [
    {
      label: 'Email suppliers for quotes',
      prompt:
        'Need lumber quotes for 2,500 sqft ADU: 2x6 framing, plywood sheathing, roof trusses. Getting bids from Home Depot, Lowe\'s, [local lumber supplier]. Template email to send?',
    },
    {
      label: 'Follow up with slow-responding subs',
      prompt:
        'Asked three electricians for quotes 5 days ago, no responses. One quote came in at $12.5k, others silent. How do I follow up without being pushy? Timeline?',
    },
    {
      label: 'Vendor relationship outreach',
      prompt:
        'Regular drywall supplier gave me a good deal on the last two jobs. Want to lock in pricing for the next 6 jobs. How do I approach a volume discount conversation?',
    },
  ],

  // q19: Compass navigation
  'compass-nav': [
    {
      label: 'Where are we in the build?',
      prompt:
        'ADU 16-week timeline. Today is day 46 (week 7). Planned: framing complete, drywall started. Actual: framing 85% done, drywall starts Monday. On track? Risks ahead?',
    },
    {
      label: 'Are we ahead or behind?',
      prompt:
        'Kitchen remodel, 4-week timeline. Week 2 done: demo complete (on time), rough-in 50% done (planned 75%). Tile comes in week 3. Can I still hit the deadline?',
    },
    {
      label: 'Safety and quality checkpoint',
      prompt:
        'ADU week 10: framing done, no defects, no safety incidents. Drywall 60% up. MEP rough passed inspection first try. Next: drywall finish and flooring. Summary health check?',
    },
  ],
};

/**
 * Fallback starters for stage 0 (landing) or unrecognized workflows.
 * Used when workflowId is not set or not in STARTER_PROMPTS.
 */
export const DEFAULT_STARTERS: StarterPrompt[] = [
  {
    label: 'Size up a new job',
    prompt:
      'Help me score the risk on a potential bid: 1,800 sqft bath remodel, client I haven\'t worked with, 10% markup.',
  },
  {
    label: 'Check code for something',
    prompt:
      'For a 2,500 sqft ADU in San Diego, what code sections apply to the egress window in a bedroom?',
  },
  {
    label: 'Sequence a build',
    prompt: 'Sequence a 2,500 sqft ADU ground-up in San Diego.',
  },
];

/**
 * Retrieve starter prompts for a given workflow.
 * Falls back to DEFAULT_STARTERS if workflow is not found.
 */
export function getStartersForWorkflow(
  workflowId: string | undefined
): StarterPrompt[] {
  if (!workflowId) return DEFAULT_STARTERS;
  return STARTER_PROMPTS[workflowId] ?? DEFAULT_STARTERS;
}
