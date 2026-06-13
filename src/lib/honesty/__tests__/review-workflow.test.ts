/**
 * Knowledge-review state-machine tests (LOOP 2 / Slice B), per
 * docs/code-ingestion-hitl.md §2. The machine is pure, so these assert the
 * full transition table: legal transitions land the right status + column
 * effects, illegal ones are rejected, and approve carries the attestation trio.
 */

import { describe, it, expect } from "vitest";
import {
  REVIEW_STATUSES,
  SERVED_STATUSES,
  isServed,
  canTransition,
  nextStatus,
  allowedActions,
  createStatus,
  validateContext,
  columnEffects,
  reviewEvent,
  type ReviewStatus,
} from "../review-workflow";

const NOW = "2026-06-12T00:00:00.000Z";
const ACTOR = "11111111-1111-4111-8111-111111111111";

describe("served statuses", () => {
  it("serves ONLY published", () => {
    expect([...SERVED_STATUSES]).toEqual(["published"]);
    expect(isServed("published")).toBe(true);
    for (const s of REVIEW_STATUSES.filter((x) => x !== "published")) {
      expect(isServed(s)).toBe(false);
    }
  });
});

describe("legal transitions (the §2 happy paths)", () => {
  const cases: Array<[Parameters<typeof nextStatus>[0], ReviewStatus, ReviewStatus]> = [
    ["submit", "draft", "review"],
    ["resubmit", "needs_changes", "review"],
    ["request_changes", "review", "needs_changes"],
    ["approve", "review", "published"],
    ["reject", "review", "rejected"],
    ["reopen", "rejected", "draft"],
    ["supersede", "published", "superseded"],
    ["archive", "published", "archived"],
    ["edit", "review", "review"],
    ["edit", "needs_changes", "review"],
  ];
  it.each(cases)("%s from %s → %s", (action, from, to) => {
    expect(canTransition(action, from)).toBe(true);
    expect(nextStatus(action, from)).toBe(to);
  });
});

describe("illegal transitions are rejected", () => {
  const illegal: Array<[Parameters<typeof nextStatus>[0], ReviewStatus]> = [
    ["approve", "draft"], // can't publish straight from draft — must go through review
    ["approve", "published"], // already published
    ["submit", "published"],
    ["reject", "published"],
    ["supersede", "draft"],
    ["archive", "review"], // only published rows archive
    ["reopen", "published"],
    ["request_changes", "draft"],
  ];
  it.each(illegal)("%s from %s is illegal", (action, from) => {
    expect(canTransition(action, from)).toBe(false);
    expect(nextStatus(action, from)).toBeNull();
    expect(columnEffects(action, from, { actorId: ACTOR })).toBeNull();
  });
});

describe("allowedActions drives the queue's buttons", () => {
  it("review offers approve/reject/request_changes/edit", () => {
    expect(allowedActions("review").sort()).toEqual(
      ["approve", "edit", "reject", "request_changes"].sort()
    );
  });
  it("published offers supersede/archive only", () => {
    expect(allowedActions("published").sort()).toEqual(["archive", "supersede"].sort());
  });
  it("rejected offers reopen only", () => {
    expect(allowedActions("rejected")).toEqual(["reopen"]);
  });
});

describe("createStatus — §8 step 1 defaults new ingestion to review", () => {
  it("defaults to review", () => {
    expect(createStatus()).toBe("review");
  });
  it("can opt into draft", () => {
    expect(createStatus(false)).toBe("draft");
  });
});

describe("validateContext", () => {
  it("approve requires a source", () => {
    const r = validateContext("approve", "review", { actorId: ACTOR });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("source");
  });
  it("approve with a source is valid", () => {
    expect(validateContext("approve", "review", { actorId: ACTOR, source: "upcodes-essentials" }).ok).toBe(true);
  });
  it("reject requires a note", () => {
    const r = validateContext("reject", "review", { actorId: ACTOR });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("note");
  });
  it("request_changes requires a note", () => {
    const r = validateContext("request_changes", "review", { actorId: ACTOR, note: "  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("note");
  });
  it("supersede requires a successorId", () => {
    const r = validateContext("supersede", "published", { actorId: ACTOR });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("successorId");
  });
  it("an illegal transition is reported, not silently passed", () => {
    const r = validateContext("approve", "draft", { actorId: ACTOR, source: "x" });
    expect(r.ok).toBe(false);
  });
});

describe("columnEffects — approve IS attestation (the load-bearing line)", () => {
  it("approve sets the manually_verified trio + published_at + last_verified", () => {
    const eff = columnEffects("approve", "review", { actorId: ACTOR, source: "icc-digital-codes", now: NOW })!;
    expect(eff).toMatchObject({
      status: "published",
      published_at: NOW,
      manually_verified_at: NOW,
      manually_verified_by: ACTOR,
      manually_verified_source: "icc-digital-codes",
      last_verified: NOW,
      updated_at: NOW,
    });
  });
  it("a plain transition (submit) touches only status + updated_at — no verification columns", () => {
    const eff = columnEffects("submit", "draft", { actorId: ACTOR, now: NOW })!;
    expect(eff).toEqual({ status: "review", updated_at: NOW });
    expect(eff).not.toHaveProperty("manually_verified_at");
  });
  it("supersede stamps superseded_by on the predecessor", () => {
    const eff = columnEffects("supersede", "published", { actorId: ACTOR, successorId: "succ-id", now: NOW })!;
    expect(eff).toMatchObject({ status: "superseded", superseded_by: "succ-id" });
  });
});

describe("reviewEvent — the append-only §3 record", () => {
  it("captures action, from/to, note, source, evidence", () => {
    const ev = reviewEvent("ent-1", "approve", "review", {
      actorId: ACTOR,
      source: "upcodes-essentials",
      evidenceUrl: "https://up.codes/s/...",
    });
    expect(ev).toMatchObject({
      entity_id: "ent-1",
      actor_id: ACTOR,
      actor_kind: "human",
      action: "approve",
      from_status: "review",
      to_status: "published",
      source: "upcodes-essentials",
      evidence_url: "https://up.codes/s/...",
    });
  });
  it("infers machine actor_kind when actor_id is null", () => {
    const ev = reviewEvent("ent-1", "submit", "draft", { actorId: null });
    expect(ev.actor_kind).toBe("machine");
    expect(ev.to_status).toBe("review");
  });
  it("a create event (no from) lands the create default status", () => {
    const ev = reviewEvent("ent-1", "create", null, { actorId: ACTOR });
    expect(ev.from_status).toBeNull();
    expect(ev.to_status).toBe("review");
  });
});
