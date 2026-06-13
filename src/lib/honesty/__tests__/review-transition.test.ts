/**
 * applyTransition tests (LOOP 2 / Slice B PR2). Mocks the Supabase client
 * surface + @/lib/auth-server + @/lib/events (the @/ alias doesn't resolve
 * under vitest, so deps that use it must be mocked — same convention as
 * onboard-new-user/__tests__). Asserts: the approve happy path writes the
 * attestation columns + the §3 event; illegal transitions 409; missing
 * required fields 400; non-owner 403; and the event-log write degrades
 * gracefully when the migration isn't applied.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const REVIEWER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "chillyd@gmail.com",
  app_metadata: { role: "user" },
};

const state: {
  user: Record<string, unknown> | null;
  row: Record<string, unknown> | null;
  readError: { code?: string; message?: string } | null;
  updateError: { code?: string; message?: string } | null;
  eventInsertError: { code?: string; message?: string } | null;
  captured: { updatePayload?: Record<string, unknown>; eventRow?: Record<string, unknown> };
} = {
  user: REVIEWER,
  row: { id: "ent-1", slug: "nec-210-52", title: "NEC 210.52", status: "review", auto_verification_confidence: 0.62 },
  readError: null,
  updateError: null,
  eventInsertError: null,
  captured: {},
};

// Chainable stub for createClient (@supabase/supabase-js).
function makeClient() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: state.user },
        error: state.user ? null : { message: "no user" },
      }),
    },
    from(_table: string) {
      let mode: "select" | "update" = "select";
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        select: () => chain, // preserves `mode`; update().select() stays update
        update: (payload: Record<string, unknown>) => {
          mode = "update";
          state.captured.updatePayload = payload;
          return chain;
        },
        eq: () => chain,
        single: async () => {
          if (mode === "update") {
            if (state.updateError) return { data: null, error: state.updateError };
            return { data: { ...state.row, ...state.captured.updatePayload }, error: null };
          }
          return { data: state.row, error: state.readError };
        },
      });
      return chain;
    },
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => makeClient()),
}));

vi.mock("@/lib/auth-server", () => ({
  getServiceClient: vi.fn(() => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        state.captured.eventRow = row;
        return { error: state.eventInsertError };
      },
    }),
  })),
}));

const emitSpy = vi.fn();
vi.mock("@/lib/events", () => ({
  emitKnowledgeReviewSignal: (...args: unknown[]) => emitSpy(...args),
}));

function req(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/v1/knowledge-entities/ent-1/approve", {
    method: "POST",
    headers: { authorization: "Bearer fake-jwt" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { ...REVIEWER };
  state.row = { id: "ent-1", slug: "nec-210-52", title: "NEC 210.52", status: "review", auto_verification_confidence: 0.62 };
  state.readError = null;
  state.updateError = null;
  state.eventInsertError = null;
  state.captured = {};
  emitSpy.mockClear();
  vi.resetModules();
});
afterEach(() => vi.clearAllMocks());

async function applyTransition(...args: Parameters<typeof import("../review-transition").applyTransition>) {
  const mod = await import("../review-transition");
  return mod.applyTransition(...args);
}

describe("applyTransition — approve IS attestation", () => {
  it("review → published writes the manually_verified trio + logs the event", async () => {
    const r = await applyTransition({ request: req({ source: "icc-digital-codes" }), entityId: "ent-1", action: "approve", source: "icc-digital-codes" });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.to_status).toBe("published");
    // attestation columns landed in the UPDATE payload
    const upd = state.captured.updatePayload!;
    expect(upd.status).toBe("published");
    expect(upd.manually_verified_by).toBe(REVIEWER.id);
    expect(upd.manually_verified_source).toBe("icc-digital-codes");
    expect(upd.published_at).toBeTruthy();
    expect(upd.last_verified).toBeTruthy();
    // §3 event recorded
    expect(state.captured.eventRow!.action).toBe("approve");
    expect(state.captured.eventRow!.from_status).toBe("review");
    expect(state.captured.eventRow!.to_status).toBe("published");
    expect(r.body.event_logged).toBe(true);
    // RSI signal emitted with the pre-decision confidence
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.mock.calls[0][0]).toMatchObject({ action: "approve", auto_confidence_at_decision: 0.62 });
  });
});

describe("applyTransition — guards", () => {
  it("non-owner → 403, no write", async () => {
    state.user = { id: "x", email: "stranger@example.com", app_metadata: {} };
    const r = await applyTransition({ request: req(), entityId: "ent-1", action: "approve", source: "x" });
    expect(r.status).toBe(403);
    expect(state.captured.updatePayload).toBeUndefined();
  });

  it("illegal transition (approve from draft) → 409", async () => {
    state.row = { ...state.row!, status: "draft" };
    const r = await applyTransition({ request: req(), entityId: "ent-1", action: "approve", source: "x" });
    expect(r.status).toBe(409);
    expect(state.captured.updatePayload).toBeUndefined();
  });

  it("reject without a note → 400", async () => {
    const r = await applyTransition({ request: req(), entityId: "ent-1", action: "reject" });
    expect(r.status).toBe(400);
    expect(state.captured.updatePayload).toBeUndefined();
  });

  it("entity not found → 404", async () => {
    state.row = null;
    state.readError = { code: "PGRST116", message: "no rows" };
    const r = await applyTransition({ request: req(), entityId: "missing", action: "approve", source: "x" });
    expect(r.status).toBe(404);
  });
});

describe("applyTransition — event log degrades gracefully pre-migration", () => {
  it("approve still succeeds when knowledge_review_events is absent (42P01)", async () => {
    state.eventInsertError = { code: "42P01", message: 'relation "knowledge_review_events" does not exist' };
    const r = await applyTransition({ request: req({ source: "x" }), entityId: "ent-1", action: "approve", source: "x" });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.event_logged).toBe(false);
    expect(String(r.body.event_note)).toMatch(/not yet provisioned/i);
    // the status change + attestation still committed
    expect(state.captured.updatePayload!.status).toBe("published");
  });
});
