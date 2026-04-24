/**
 * W9 IntegratedNavigator — shared type contracts
 *
 * The Navigator unifies three previously-separate chrome surfaces into one
 * stacked, collapsible, ever-present strip on every `/killerapp/*` route:
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  <JourneyStrip>      — 7 stages, color-coded progress       │
 *   │  <TimeMachineLever>  — horizontal scrub to prior snapshots  │
 *   │  <BudgetTimeline>    — per-stage committed/spent/remaining  │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Sub-components import from this file so every piece of the Navigator
 * speaks the same shape. Change a contract here — propagate by tsc.
 *
 * See: docs/design/W9-integrated-surface-spec.md
 */
// ─── Event contract ──────────────────────────────────────────────────────
/**
 * Custom events dispatched by the Navigator so other parts of the app
 * can react (e.g. the BudgetWidget could reflect historical data when
 * the user scrubs the Time Machine).
 */
export const NAVIGATOR_EVENTS = {
    STAGE_CLICKED: 'bkg:navigator:stage-clicked',
    TIME_SCRUBBED: 'bkg:navigator:time-scrubbed',
    COLLAPSE_CHANGED: 'bkg:navigator:collapse-changed',
};
// ─── Canonical stage registry ────────────────────────────────────────────
/**
 * Source of truth for stage labels used anywhere in the Navigator.
 * Mirror of docs/workflows.json `lifecycleStages`; duplicated here so the
 * Navigator never crashes on a workflows.json fetch miss.
 *
 * If you rename a label here, also update workflows.json and the
 * JourneyMapHeader fallback list. brand-voice rule: short, crew-voice,
 * action verbs.
 */
export const STAGE_REGISTRY = [
    { id: 1, slug: 'size-up', label: 'Size up', description: 'Assess the opportunity and plan the work.' },
    { id: 2, slug: 'lock', label: 'Lock it in', description: 'Contracts signed, scope fixed, permits pulled.' },
    { id: 3, slug: 'plan', label: 'Plan it out', description: 'Sequence the job, size the crew, line up supplies.' },
    { id: 4, slug: 'build', label: 'Build', description: 'Run the job on the ground.' },
    { id: 5, slug: 'adapt', label: 'Adapt', description: 'Handle change orders, RFIs, field conditions.' },
    { id: 6, slug: 'collect', label: 'Collect', description: 'Invoices, draws, lien waivers, payment.' },
    { id: 7, slug: 'reflect', label: 'Reflect', description: 'Warranty, lessons, portfolio, referrals.' },
];
// ─── Helpers ─────────────────────────────────────────────────────────────
export function stageBySlug(slug) {
    return STAGE_REGISTRY.find((s) => s.slug === slug);
}
export function stageById(id) {
    return STAGE_REGISTRY.find((s) => s.id === id);
}
export function formatCents(cents) {
    const dollars = Math.round(cents / 100);
    if (Math.abs(dollars) >= 1000) {
        return `$${(dollars / 1000).toFixed(1)}k`;
    }
    return `$${dollars}`;
}
