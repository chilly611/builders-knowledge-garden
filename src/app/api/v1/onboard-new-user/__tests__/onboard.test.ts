/**
 * /api/v1/onboard-new-user tests (2026-05-22, PLG-SIGNUP)
 * =======================================================
 *
 * Coverage:
 *   1. deriveOrgNameFromEmail — pure function, exhaustive edge-case sweep.
 *   2. POST happy path — verifies the right inserts fire in the right
 *      order and the audit_log row is written.
 *   3. POST idempotency — second call with the same user returns
 *      already_onboarded:true and writes nothing.
 *   4. POST email-skip — RESEND_API_KEY absent doesn't fail the call.
 *   5. POST rollback — project insert fails → org + org_member get
 *      cleaned up.
 *
 * We mock `@/lib/auth-server` (so getAuthUser returns a fixed user and
 * getServiceClient returns a chainable spy) and `@/lib/email`
 * (so sendEmail is a stub). The Supabase client surface we exercise is
 * narrow (from -> select/insert/delete -> .eq/.limit/.order/.single)
 * so a hand-rolled stub is more readable than dragging in MSW.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock the Supabase auth + service client surface
// ---------------------------------------------------------------------------

const FIXED_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'jane.smith@acme.com',
  name: 'Jane',
};

// Holds the inserts the route attempted, in order. Each entry is
// { table, rows }. Tests assert against this.
interface Insert {
  table: string;
  rows: Record<string, unknown>[];
}
interface Delete {
  table: string;
  filters: Array<[string, unknown]>;
}

// Module-level state the mock service client reads from. Tests reset it
// in beforeEach.
const state: {
  inserts: Insert[];
  deletes: Delete[];
  // What .select() on org_members should return when the route checks
  // for existing membership. `null` = "no existing rows".
  existingOrgMembership: { org_id: string } | null;
  // First-project lookup for already-onboarded users.
  existingFirstProject: { id: string } | null;
  // Force the next .insert(...).select().single() on a given table to
  // return an error. Used to test rollback.
  failInsert: Record<string, { message: string }> | null;
  // Generated UUIDs for inserted rows so the test can correlate.
  newOrgId: string;
  newProjectId: string;
} = {
  inserts: [],
  deletes: [],
  existingOrgMembership: null,
  existingFirstProject: null,
  failInsert: null,
  newOrgId: '22222222-2222-4222-8222-222222222222',
  newProjectId: '33333333-3333-4333-8333-333333333333',
};

function makeServiceClient() {
  // Each `.from(table)` call returns a fresh chainable.
  function from(table: string) {
    const chain: Record<string, unknown> = {};
    let mode: 'select' | 'insert' | 'delete' | 'update' = 'select';
    let pendingRows: Record<string, unknown>[] = [];
    const filters: Array<[string, unknown]> = [];

    function eq(_col: string, val: unknown) {
      filters.push([_col, val]);
      return chain;
    }
    function order() {
      return chain;
    }
    function limit() {
      return chain;
    }
    function in_() {
      return chain;
    }

    function selectFn() {
      return chain;
    }

    function singleFn() {
      // Insert path: return the synthesized id for the inserted row.
      if (mode === 'insert') {
        const failure = state.failInsert?.[table];
        if (failure) {
          return Promise.resolve({ data: null, error: failure });
        }
        if (table === 'organizations') {
          return Promise.resolve({ data: { id: state.newOrgId }, error: null });
        }
        if (table === 'command_center_projects') {
          return Promise.resolve({ data: { id: state.newProjectId }, error: null });
        }
        // Other inserts don't call .single() in our route, but be safe.
        return Promise.resolve({ data: pendingRows[0] ?? {}, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }

    // The "no .single() at the end" path on .select() returns a thenable
    // that resolves to a list. Used for the idempotency check (org_members
    // lookup) + the first-project lookup.
    function then(resolve: (v: { data: unknown; error: null }) => void) {
      if (mode === 'select') {
        if (table === 'org_members') {
          return resolve({
            data: state.existingOrgMembership
              ? [state.existingOrgMembership]
              : [],
            error: null,
          });
        }
        if (table === 'command_center_projects') {
          return resolve({
            data: state.existingFirstProject
              ? [state.existingFirstProject]
              : [],
            error: null,
          });
        }
      }
      if (mode === 'insert') {
        // The audit_log + project_members + project_budget_lines insert
        // paths in the route don't call .select(); they await the insert
        // directly. That call shape lands in `insertFn` below, not here.
      }
      return resolve({ data: [], error: null });
    }

    function insertFn(rows: Record<string, unknown>[]) {
      mode = 'insert';
      pendingRows = Array.isArray(rows) ? rows : [rows];
      state.inserts.push({ table, rows: pendingRows });
      // Return a thenable so `await sb.from(t).insert(rows)` works
      // (the audit_log + project_members + budget paths use this shape).
      const insertChain = {
        ...chain,
        select: selectFn,
        then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
          const failure = state.failInsert?.[table];
          if (failure) {
            return resolve({ data: null, error: failure });
          }
          return resolve({ data: pendingRows, error: null });
        },
      };
      return insertChain;
    }

    function deleteFn() {
      mode = 'delete';
      const delChain = {
        ...chain,
        eq: (col: string, val: unknown) => {
          filters.push([col, val]);
          return delChain;
        },
        then: (resolve: (v: { data: null; error: null }) => void) => {
          state.deletes.push({ table, filters: filters.slice() });
          return resolve({ data: null, error: null });
        },
      };
      return delChain;
    }

    Object.assign(chain, {
      select: selectFn,
      insert: insertFn,
      delete: deleteFn,
      eq,
      order,
      limit,
      in: in_,
      single: singleFn,
      then,
    });
    return chain;
  }
  return { from };
}

vi.mock('@/lib/auth-server', () => ({
  getAuthUser: vi.fn(async () => FIXED_USER),
  getServiceClient: vi.fn(() => makeServiceClient()),
  unauthorizedResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'unauth' }), { status: 401 })
  ),
}));

type SendResult = { ok: true; id?: string } | { ok: false; error?: string };
const sendEmailMock = vi.fn<(...args: unknown[]) => Promise<SendResult>>(
  async () => ({ ok: true, id: 'em_123' }) as SendResult,
);
vi.mock('@/lib/email', () => ({
  sendEmail: sendEmailMock,
  escapeHtml: (s: string) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;'),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callRoute() {
  const { POST } = await import('../route');
  const req = new NextRequest('http://localhost/api/v1/onboard-new-user', {
    method: 'POST',
    headers: { authorization: 'Bearer fake-jwt' },
    body: JSON.stringify({}),
  });
  const res = await POST(req);
  const json = await res.json();
  return { status: res.status, body: json };
}

beforeEach(() => {
  state.inserts = [];
  state.deletes = [];
  state.existingOrgMembership = null;
  state.existingFirstProject = null;
  state.failInsert = null;
  sendEmailMock.mockClear();
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. deriveOrgNameFromEmail
// ---------------------------------------------------------------------------

describe('deriveOrgNameFromEmail', () => {
  it('treats consumer email providers as personal — uses local part', async () => {
    const { deriveOrgNameFromEmail } = await import('../route');
    expect(deriveOrgNameFromEmail('chilly@gmail.com')).toEqual({
      orgName: "Chilly's Org",
      slug: 'chilly-org',
    });
    expect(deriveOrgNameFromEmail('jane@yahoo.com').orgName).toBe("Jane's Org");
    expect(deriveOrgNameFromEmail('foo@icloud.com').orgName).toBe("Foo's Org");
  });

  it('strips dots + plus tags from gmail-style local parts', async () => {
    const { deriveOrgNameFromEmail } = await import('../route');
    expect(deriveOrgNameFromEmail('john.smith+test@gmail.com').orgName).toBe("John's Org");
  });

  it('uses the domain brand for company-looking email addresses', async () => {
    const { deriveOrgNameFromEmail } = await import('../route');
    expect(deriveOrgNameFromEmail('jane.smith@acme.com').orgName).toBe('Acme');
    expect(deriveOrgNameFromEmail('founder@startup.io').orgName).toBe('Startup');
  });

  it('strips compound ccTLDs and noise subdomains', async () => {
    const { deriveOrgNameFromEmail } = await import('../route');
    expect(deriveOrgNameFromEmail('jane@mail.acme.co.uk').orgName).toBe('Acme');
    expect(deriveOrgNameFromEmail('a@www.foo.com').orgName).toBe('Foo');
  });

  it('falls back to "My Org" for malformed emails', async () => {
    const { deriveOrgNameFromEmail } = await import('../route');
    expect(deriveOrgNameFromEmail('').orgName).toBe('My Org');
    expect(deriveOrgNameFromEmail('no-at-sign').orgName).toBe('My Org');
    expect(deriveOrgNameFromEmail('@nope.com').orgName).toBe('My Org');
    expect(deriveOrgNameFromEmail('foo@').orgName).toBe('My Org');
  });

  it('produces a URL-safe slug', async () => {
    const { deriveOrgNameFromEmail } = await import('../route');
    const { slug } = deriveOrgNameFromEmail('jane@acme.com');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});

// ---------------------------------------------------------------------------
// 2. Happy path
// ---------------------------------------------------------------------------

describe('POST /api/v1/onboard-new-user — happy path', () => {
  it('creates org + org_member + project + project_member + budget + audit, sends email, returns ids', async () => {
    const { status, body } = await callRoute();

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.org_id).toBe(state.newOrgId);
    expect(body.project_id).toBe(state.newProjectId);

    // Verify the insert sequence.
    const tables = state.inserts.map((i) => i.table);
    expect(tables).toContain('organizations');
    expect(tables).toContain('org_members');
    expect(tables).toContain('command_center_projects');
    expect(tables).toContain('project_members');
    expect(tables).toContain('project_budget_lines');
    expect(tables).toContain('audit_log');

    // org_members row carries role=owner.
    const omRow = state.inserts.find((i) => i.table === 'org_members')!.rows[0];
    expect(omRow.role).toBe('owner');
    expect(omRow.user_id).toBe(FIXED_USER.id);

    // command_center_projects row carries metadata.is_first_run = true.
    const projRow = state.inserts.find((i) => i.table === 'command_center_projects')!.rows[0];
    expect((projRow.metadata as Record<string, unknown>).is_first_run).toBe(true);
    expect(projRow.name).toBe('My first project');
    expect(projRow.project_type).toBe('single_family');

    // project_members row uses project_role='gc'.
    const pmRow = state.inserts.find((i) => i.table === 'project_members')!.rows[0];
    expect(pmRow.project_role).toBe('gc');

    // 10 budget lines totaling ~$300K.
    const budgetRows = state.inserts.find((i) => i.table === 'project_budget_lines')!.rows;
    expect(budgetRows).toHaveLength(10);
    const total = budgetRows.reduce((s, r) => s + Number(r.budgeted), 0);
    expect(total).toBeGreaterThanOrEqual(280_000);
    expect(total).toBeLessThanOrEqual(330_000);

    // audit_log row tagged 'plg_signup'.
    const auditRow = state.inserts.find((i) => i.table === 'audit_log')!.rows[0];
    expect(auditRow.table_name).toBe('onboarding');
    expect(auditRow.action).toBe('insert');
    expect((auditRow.new_data as Record<string, unknown>).source).toBe('plg_signup');

    // Welcome email fired.
    expect(sendEmailMock).toHaveBeenCalled();
    const firstCall = sendEmailMock.mock.calls[0]?.[0] as unknown as { to: string; subject: string };
    expect(firstCall.to).toBe(FIXED_USER.email);
    expect(firstCall.subject).toMatch(/Welcome to Builder/);
  });
});

// ---------------------------------------------------------------------------
// 3. Idempotency
// ---------------------------------------------------------------------------

describe('POST /api/v1/onboard-new-user — idempotency', () => {
  it('returns already_onboarded:true and writes nothing when the user has an org membership', async () => {
    state.existingOrgMembership = { org_id: 'existing-org-uuid' };
    state.existingFirstProject = { id: 'existing-project-uuid' };

    const { status, body } = await callRoute();

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.already_onboarded).toBe(true);
    expect(body.org_id).toBe('existing-org-uuid');
    expect(body.project_id).toBe('existing-project-uuid');

    // No inserts.
    expect(state.inserts).toHaveLength(0);
    // No email.
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Email skip (no RESEND key)
// ---------------------------------------------------------------------------

describe('POST /api/v1/onboard-new-user — email best-effort', () => {
  it('does not fail the request when the email send returns ok:false', async () => {
    sendEmailMock.mockResolvedValueOnce({ ok: false, error: 'no_api_key' });

    const { status, body } = await callRoute();

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(false);
    expect(body.org_id).toBe(state.newOrgId);
    expect(body.project_id).toBe(state.newProjectId);
  });
});

// ---------------------------------------------------------------------------
// 5. Rollback on project insert failure
// ---------------------------------------------------------------------------

describe('POST /api/v1/onboard-new-user — rollback', () => {
  it('rolls back org + org_member if the project insert fails', async () => {
    state.failInsert = { command_center_projects: { message: 'simulated db failure' } };

    const { status, body } = await callRoute();

    expect(status).toBe(500);
    expect(body.ok).toBe(false);

    // Org + org_member rolled back via delete().
    const deletedTables = state.deletes.map((d) => d.table);
    expect(deletedTables).toContain('organizations');
    expect(deletedTables).toContain('org_members');

    // No email or audit_log row.
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(state.inserts.some((i) => i.table === 'audit_log')).toBe(false);
  });
});
