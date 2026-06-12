/**
 * L2 contract — Onboarding seed
 * ============================
 *
 * The provisioning MACHINERY (create org → org_members → first project →
 * project_members, idempotent) is engine-generic. The SEED is garden config:
 * BKG defaults a `single_family` project and a CSI-division starter budget and
 * sends a construction-flavoured welcome email (`api/v1/onboard-new-user`).
 *
 * See `docs/garden-engine/01-DEPENDENCY-GRAPH.md` (onboarding classification).
 */

export interface SeedBudgetLine {
  /** Category/division key (BKG: CSI division). */
  key: string;
  label: string;
  amount: number;
}

export interface SeedEmailTemplate {
  subject: string;
  /** Body template (engine fills {{name}} etc.). */
  body: string;
}

export interface OnboardingSeed {
  /** Column defaults for the first project row (BKG: project_type, phase…). */
  projectDefaults: Record<string, unknown>;
  /** Optional starter budget seeded on signup. */
  budgetTemplate?: SeedBudgetLine[];
  /** Optional welcome email. */
  welcomeEmail?: SeedEmailTemplate;
  /** Default role assigned to the first user on their first project. */
  defaultProjectRole: string;
}
