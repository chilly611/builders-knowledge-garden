/**
 * Stream B — Lanes x Lenses: canonical type and schema contract.
 *
 * DATA_CATEGORIES, LENS_ACTIONS, and LANE_SLUGS are the single source of truth
 * shared with the DB migration (public.lanes / public.project_lane_memberships)
 * and the enforcement middleware. Do not redefine these constants elsewhere.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Canonical enum constants
// ---------------------------------------------------------------------------

export const LANE_SLUGS = [
  "owner",
  "gc",
  "diy-builder",
  "sub",
  "worker",
  "supplier",
  "equipment-provider",
  "service-provider",
  "robot-ai",
] as const;

export const DATA_CATEGORIES = [
  "project_overview",
  "budget_total",
  "sub_margin",
  "schedule",
  "documents_contracts",
  "rfis_submittals",
  "change_orders",
  "bids_estimates",
  "photos_field_logs",
  "compliance_credentials",
  "team_directory",
] as const;

export const LENS_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
] as const;

export const SERVICE_PROVIDER_SUBTYPES = [
  "architect",
  "structural-engineer",
  "inspector",
  "lender",
  "lawyer",
  "future-buyer",
] as const;

// ---------------------------------------------------------------------------
// Derived union types
// ---------------------------------------------------------------------------

export type LaneSlug = (typeof LANE_SLUGS)[number];
export type DataCategory = (typeof DATA_CATEGORIES)[number];
export type LensAction = (typeof LENS_ACTIONS)[number];
export type ServiceProviderSubtype = (typeof SERVICE_PROVIDER_SUBTYPES)[number];

// ---------------------------------------------------------------------------
// Zod enum schemas
// ---------------------------------------------------------------------------

export const LaneSlugSchema = z.enum(LANE_SLUGS);
export const DataCategorySchema = z.enum(DATA_CATEGORIES);
export const LensActionSchema = z.enum(LENS_ACTIONS);
export const ServiceProviderSubtypeSchema = z.enum(SERVICE_PROVIDER_SUBTYPES);

// ---------------------------------------------------------------------------
// PermissionDecision
// ---------------------------------------------------------------------------

export type PermissionDecision = "permitted" | "not-permitted";
export const PermissionDecisionSchema = z.enum(["permitted", "not-permitted"]);

// ---------------------------------------------------------------------------
// LensConfig — shape of lanes.default_lens_config (loose; allows extra keys)
// ---------------------------------------------------------------------------

export const LensConfigSchema = z
  .object({
    description: z.string().optional(),
    subtypes: z.array(ServiceProviderSubtypeSchema).optional(),
  })
  .passthrough();

export type LensConfig = z.infer<typeof LensConfigSchema>;

// ---------------------------------------------------------------------------
// CustomLensOverrides
//
// A per-membership sparse override map: data_category -> action -> boolean.
// Both levels are partial — a membership only overrides a few cells.
//
// z.record(enumSchema, ...) in zod v4 requires ALL enum keys to be present at
// parse time, making it unsuitable for a partial/sparse map. We therefore use
// z.record(z.string(), z.record(z.string(), z.boolean())) which infers as
// Record<string, Record<string, boolean>> — all keys are optional by nature,
// satisfying Partial<Record<DataCategory, Partial<Record<LensAction, boolean>>>>.
// ---------------------------------------------------------------------------

export const CustomLensOverridesSchema = z.record(
  z.string(),
  z.record(z.string(), z.boolean()),
);

export type CustomLensOverrides = z.infer<typeof CustomLensOverridesSchema>;

// ---------------------------------------------------------------------------
// Lane — mirrors public.lanes
// ---------------------------------------------------------------------------

export const LaneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: LaneSlugSchema,
  default_lens_config: LensConfigSchema,
  created_at: z.string(),
});

export type Lane = z.infer<typeof LaneSchema>;

// ---------------------------------------------------------------------------
// LaneMembership — mirrors public.project_lane_memberships
// ---------------------------------------------------------------------------

export const LaneMembershipSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string(), // text column, not uuid
  user_id: z.string().uuid(),
  lane_id: z.string().uuid(),
  subtype: ServiceProviderSubtypeSchema.nullable(),
  custom_lens_overrides: CustomLensOverridesSchema.nullable(),
  invited_by: z.string().uuid().nullable(),
  invited_at: z.string(),
  revoked_at: z.string().nullable(),
});

export type LaneMembership = z.infer<typeof LaneMembershipSchema>;

// ---------------------------------------------------------------------------
// PermissionCheck — middleware input
// ---------------------------------------------------------------------------

export const PermissionCheckSchema = z.object({
  userId: z.string(),
  projectId: z.string(),
  dataCategory: DataCategorySchema,
  action: LensActionSchema,
});

export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;
