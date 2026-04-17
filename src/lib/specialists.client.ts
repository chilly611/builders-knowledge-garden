// Builder's Knowledge Garden — Client-Side Specialist Helper
// Thin wrapper for calling specialists from React components (e.g., StepCard)
// DO NOT import from src/lib/specialists.ts — that is Node-only

"use client";

import type { SpecialistContext, SpecialistResult } from "./specialists";

/**
 * Call a specialist from the client.
 * Fetches to POST /api/v1/specialists/[id] with the given context.
 * Returns a SpecialistResult with narrative, structured output, and citations.
 */
export async function runSpecialist(
  specialistId: string,
  context: SpecialistContext
): Promise<SpecialistResult> {
  const url = `/api/v1/specialists/${encodeURIComponent(specialistId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(context),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.message || errorData.error || "Unknown error";
    throw new Error(`Specialist call failed (${response.status}): ${errorMsg}`);
  }

  return response.json() as Promise<SpecialistResult>;
}
