/**
 * /api/v1/onboard-new-user — PLG-SIGNUP (2026-05-22)
 * ===================================================
 *
 * Called server-side immediately after a successful sign-up + sign-in
 * (see `src/app/signup/page.tsx`). Bootstraps the user into a usable
 * state so they can do real work on the first page after auth:
 *
 *   1. Auto-create an `organizations` row + add caller as 'owner' in
 *      `org_members`.
 *   2. Create a starter `command_center_projects` row stamped with
 *      `metadata.is_first_run = true`.
 *   3. Add caller to `project_members` as 'gc' (the safe default for
 *      contractor-flavored signups; the welcome wizard re-maps DIY users
 *      after).
 *   4. Seed `project_budget_lines` with a 10-line CSI breakdown totaling
 *      ~$300K — a generic single-family residential template that gives
 *      the cockpit's Budget card real numbers to render on first load.
 *   5. Best-effort welcome email through Resend (skipped if the API key
 *      is missing or the domain isn't verified yet — never gates signup).
 *   6. Best-effort `audit_log` row for product analytics
 *      (`table_name='onboarding'`).
 *
 * Hard requirements:
 *   - **Auth-gated**: caller must be signed in (bearer token, same as
 *     the rest of /api/v1).
 *   - **Idempotent**: re-calling for a user who already has an
 *     `org_members` row returns `{ ok: true, already_onboarded: true,
 *     org_id, project_id }` without writing anything new. This means a
 *     double-fire from the client (slow network, retry, React StrictMode
 *     in dev) is harmless.
 *   - **Atomic-ish**: the four writes (org + member + project +
 *     project_member + budget) are sequenced with rollback-on-error so
 *     we never leave a half-onboarded user. We don't use a real PG
 *     transaction because each `.from(...).insert(...)` is its own HTTP
 *     round-trip to PostgREST; the compensating delete on failure is the
 *     pragmatic equivalent. The orchestrator can wrap this in a SECURITY
 *     DEFINER plpgsql function later if we need true atomicity.
 *   - **Service-role inserts**: organizations + project_members +
 *     project_budget_lines all have RLS policies that gate on
 *     `auth.uid()`. Calling them with the user's anon JWT works for some
 *     paths but not for `org_members` first-row creation (chicken-and-
 *     egg: the policy on `org_members` requires the caller to already be
 *     in `org_members`). Service-role bypasses RLS and keeps the route
 *     readable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { sendEmail, escapeHtml } from '@/lib/email';
import { captureServerEvent } from '@/lib/posthog';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const INTERNAL_BCC = [
  'charlie@theknowledgegardens.com',
  'bou@theknowledgegardens.com',
];

/**
 * Generic single-family-residence CSI breakdown. Numbers are rough but
 * realistic so the user's Budget card has non-zero rows to render on
 * first paint. They can re-run the AI estimator (Workflow → Estimating)
 * to overwrite with project-specific numbers — that flow already
 * upserts on (project_id, csi_division), so these seeds are safe to
 * over-write without manual deletes.
 *
 * Total: $304,000. Loosely calibrated to a 1,200 sqft remodel.
 */
const STARTER_BUDGET_LINES: Array<{
  csi_division: string;
  description: string;
  budgeted: number;
}> = [
  { csi_division: '01', description: 'General requirements (permits, supervision, dumpsters)', budgeted: 18_000 },
  { csi_division: '02', description: 'Site prep + demolition', budgeted: 12_000 },
  { csi_division: '03', description: 'Concrete (foundation, slab)', budgeted: 32_000 },
  { csi_division: '06', description: 'Wood framing + rough carpentry', budgeted: 58_000 },
  { csi_division: '07', description: 'Thermal + moisture (roof, insulation, siding)', budgeted: 38_000 },
  { csi_division: '08', description: 'Doors + windows', budgeted: 22_000 },
  { csi_division: '09', description: 'Finishes (drywall, flooring, paint, tile)', budgeted: 46_000 },
  { csi_division: '22', description: 'Plumbing', budgeted: 28_000 },
  { csi_division: '23', description: 'HVAC', budgeted: 22_000 },
  { csi_division: '26', description: 'Electrical', budgeted: 28_000 },
];

// ---------------------------------------------------------------------------
// Helpers (pure — exported for testing)
// ---------------------------------------------------------------------------

/**
 * Best-effort "company name" from an email address.
 *
 *   chilly@example.com              → "Chilly's Org"          (personal-looking)
 *   john.smith@acme.com             → "Acme"                  (company)
 *   jane@mail.acme.co.uk            → "Acme"                  (strip subdomain + ccTLD)
 *   founder@startup.io              → "Startup"
 *   x@gmail.com / @hotmail / @yahoo → "<localpart>'s Org"     (treat as personal)
 *
 * Returns { orgName, slug }. `slug` is lowercase-dashed, max 60 chars.
 *
 * Edge cases (intentional fallbacks rather than throws):
 *   - malformed email (no '@')   → "My Org" / "my-org"
 *   - empty localpart            → "My Org" / "my-org"
 *   - all-digit localpart        → still title-cased ("123's Org") — rare; the
 *     cockpit lets users rename the org from Settings so this is recoverable.
 */
export function deriveOrgNameFromEmail(email: string): { orgName: string; slug: string } {
  const safe = (email || '').toLowerCase().trim();
  const at = safe.indexOf('@');
  if (at <= 0 || at === safe.length - 1) {
    return { orgName: 'My Org', slug: 'my-org' };
  }
  const local = safe.slice(0, at);
  const domain = safe.slice(at + 1);

  // List of consumer email providers — treat as "personal" and use the
  // local part as the org name.
  const CONSUMER = new Set([
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.co.uk', 'ymail.com',
    'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
    'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'protonmail.com', 'proton.me',
    'fastmail.com', 'pm.me', 'duck.com',
  ]);

  let baseLabel: string;
  if (CONSUMER.has(domain)) {
    // Personal email — use local part. Strip dots/plus tags so
    // "john.smith+test@gmail.com" → "John".
    const cleaned = local.split('+')[0].split('.')[0].replace(/[^a-z0-9]/g, '');
    if (!cleaned) return { orgName: 'My Org', slug: 'my-org' };
    const titled = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return {
      orgName: `${titled}'s Org`,
      slug: slugify(`${titled}-org`),
    };
  }

  // Company-looking domain — strip TLD and known subdomains.
  // mail.acme.co.uk → acme    (drop "mail", drop "co", drop "uk")
  // acme.com        → acme
  // foo.bar.dev     → bar     (keep the apex-ish piece)
  const parts = domain.split('.').filter(Boolean);
  // Two-segment ccTLDs that we strip wholesale.
  const COMPOUND_TLDS = new Set([
    'co.uk', 'co.nz', 'co.in', 'co.jp', 'co.kr', 'com.au', 'com.br',
    'com.mx', 'com.ar', 'com.cn',
  ]);
  let tail = parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : '';
  let strip = 1; // default: drop just the TLD
  if (COMPOUND_TLDS.has(tail)) {
    strip = 2;
  }
  let candidate = parts.slice(0, Math.max(0, parts.length - strip));
  // Drop common subdomain prefixes if there are still multiple segments.
  const SUBDOMAIN_NOISE = new Set(['mail', 'www', 'email', 'smtp', 'send', 'inbox', 'mx']);
  while (candidate.length > 1 && SUBDOMAIN_NOISE.has(candidate[0])) {
    candidate = candidate.slice(1);
  }
  // Keep the last meaningful segment as the brand.
  baseLabel = candidate[candidate.length - 1] || parts[0] || 'My';
  baseLabel = baseLabel.replace(/[^a-z0-9]+/g, '');
  if (!baseLabel) baseLabel = 'My';
  const titled = baseLabel.charAt(0).toUpperCase() + baseLabel.slice(1);
  return {
    orgName: titled,
    slug: slugify(titled),
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'org';
}

/**
 * Append a short random suffix to a slug. Used when the natural slug
 * collides with an existing org (e.g. two users from the same company).
 */
function suffixSlug(slug: string): string {
  const rand = Math.random().toString(36).slice(2, 6);
  // Trim to keep under the 60-char cap after suffix.
  const trimmed = slug.length > 55 ? slug.slice(0, 55) : slug;
  return `${trimmed}-${rand}`;
}

// ---------------------------------------------------------------------------
// Welcome email
// ---------------------------------------------------------------------------

function buildWelcomeEmailHtml(args: {
  name: string;
  projectId: string;
  appBaseUrl: string;
}): string {
  const projectLink = `${args.appBaseUrl}/killerapp?project=${encodeURIComponent(args.projectId)}&first_run=1`;
  const aorLink = `${args.appBaseUrl}/killerapp/workflows/architect-of-record`;
  const safeName = escapeHtml(args.name);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#FAF8F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1A1A;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #D8D2C2;border-radius:10px;padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.14em;font-weight:700;color:#1D9E75;text-transform:uppercase;">Welcome to Builder's Garden</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#1A1A1A;">Hi ${safeName},</h1>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3D3D3D;">
        Thanks for signing up. Your first project is already set up —
        you can find it <a href="${projectLink}" style="color:#1D9E75;text-decoration:underline;">here</a>.
      </p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3D3D3D;">A few things to try:</p>
      <ol style="margin:0 0 18px 18px;padding:0;font-size:15px;line-height:1.7;color:#3D3D3D;">
        <li>Generate your first contract &mdash; we have CA-compliant Home Improvement templates.</li>
        <li>Add a vendor &mdash; pull in CSLB data automatically.</li>
        <li>Run a panel-schedule calc &mdash; NEC 220.83 done in 30 seconds.</li>
      </ol>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3D3D3D;">
        If you want a real architect-of-record matched to you,
        <a href="${aorLink}" style="color:#1D9E75;text-decoration:underline;">hit this link</a>.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3D3D3D;">
        Got questions? Just reply &mdash; Charlie &amp; Bou will see this.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#3D3D3D;">&mdash; Builder's Garden</p>
    </div>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

interface OnboardResponse {
  ok: boolean;
  org_id?: string;
  project_id?: string;
  already_onboarded?: boolean;
  emailed?: boolean;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<OnboardResponse>> {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse() as NextResponse<OnboardResponse>;

  const sb = getServiceClient();

  // ----- 1. Idempotency check ------------------------------------------------
  // If this user already has an org_members row, they're onboarded — return
  // the existing context so the caller can route them to their project.
  try {
    const { data: existing, error: existingErr } = await sb
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1);
    if (existingErr) {
      // Soft-log; treat as "no existing" rather than failing the whole flow.
      console.warn('[onboard-new-user] existing-check error (continuing):', existingErr);
    }
    if (existing && existing.length > 0) {
      // Find their first project too so the redirect target works.
      const { data: proj } = await sb
        .from('command_center_projects')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      return NextResponse.json({
        ok: true,
        already_onboarded: true,
        org_id: existing[0].org_id,
        project_id: proj?.[0]?.id,
      });
    }
  } catch (e) {
    console.warn('[onboard-new-user] idempotency check threw (continuing):', e);
  }

  // ----- 2. Derive org name from email --------------------------------------
  const { orgName, slug: baseSlug } = deriveOrgNameFromEmail(user.email);

  // ----- 3. Create the organization ----------------------------------------
  // Try the natural slug first; if it collides (rare — same company domain
  // signs up twice), retry once with a random suffix. After two tries we
  // bail and surface the error.
  let orgId: string | null = null;
  let usedSlug = baseSlug;
  for (let attempt = 0; attempt < 2; attempt++) {
    const trySlug = attempt === 0 ? baseSlug : suffixSlug(baseSlug);
    const { data: org, error: orgErr } = await sb
      .from('organizations')
      .insert([{
        slug: trySlug,
        legal_name: orgName,
        primary_email: user.email,
        created_by: user.id,
      }])
      .select('id')
      .single();
    if (!orgErr && org?.id) {
      orgId = org.id;
      usedSlug = trySlug;
      break;
    }
    const isDup = orgErr?.message?.toLowerCase().includes('duplicate key');
    if (!isDup) {
      console.error('[onboard-new-user] org insert failed:', orgErr);
      return NextResponse.json(
        { ok: false, error: 'Could not create your organization.' },
        { status: 500 }
      );
    }
    // Else: dup key, loop will retry with suffix.
  }
  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: 'Could not pick a unique organization slug.' },
      { status: 500 }
    );
  }

  // ----- 4. Add caller to org_members as owner ------------------------------
  const { error: omErr } = await sb
    .from('org_members')
    .insert([{
      org_id: orgId,
      user_id: user.id,
      role: 'owner',
      invited_by: user.id,
    }]);
  if (omErr) {
    console.error('[onboard-new-user] org_members insert failed:', omErr);
    // Rollback the org create — otherwise we leak an empty org.
    await sb.from('organizations').delete().eq('id', orgId);
    return NextResponse.json(
      { ok: false, error: 'Could not add you to your organization.' },
      { status: 500 }
    );
  }

  // ----- 5. Create the first project ----------------------------------------
  // user_id is text on command_center_projects (see schema). Stamp
  // metadata.is_first_run so the cockpit can show the welcome banner.
  const { data: proj, error: projErr } = await sb
    .from('command_center_projects')
    .insert([{
      user_id: user.id,
      name: 'My first project',
      project_type: 'single_family',
      phase: 'PLAN',
      progress: 0,
      budget_status: 'on-track',
      risk_level: 'medium',
      metadata: { is_first_run: true, plg_source: 'signup', plg_org_id: orgId },
    }])
    .select('id')
    .single();
  if (projErr || !proj?.id) {
    console.error('[onboard-new-user] project insert failed:', projErr);
    // Rollback org + member.
    await sb.from('org_members').delete().eq('org_id', orgId).eq('user_id', user.id);
    await sb.from('organizations').delete().eq('id', orgId);
    return NextResponse.json(
      { ok: false, error: 'Could not create your first project.' },
      { status: 500 }
    );
  }
  const projectId = proj.id as string;

  // ----- 6. Add caller to project_members ----------------------------------
  // project_members.project_id is text, project_members.user_id is uuid.
  // Default role is 'gc' — this matches the LEGACY_LANE_TO_PROJECT_ROLE
  // map ('builder' → 'gc') and is the safe contractor-friendly default.
  // The /welcome DIY-wizard can re-grant 'diy' later if the user picks
  // the homeowner path.
  const { error: pmErr } = await sb
    .from('project_members')
    .insert([{
      project_id: projectId,
      user_id: user.id,
      project_role: 'gc',
      invited_by: user.id,
      accepted_at: new Date().toISOString(),
    }]);
  if (pmErr) {
    console.error('[onboard-new-user] project_members insert failed:', pmErr);
    // Best-effort rollback. Leave the project_members row if it landed;
    // the project + org rollback below is the load-bearing cleanup.
    await sb.from('command_center_projects').delete().eq('id', projectId);
    await sb.from('org_members').delete().eq('org_id', orgId).eq('user_id', user.id);
    await sb.from('organizations').delete().eq('id', orgId);
    return NextResponse.json(
      { ok: false, error: 'Could not add you to your project.' },
      { status: 500 }
    );
  }

  // ----- 7. Seed budget lines (best-effort) --------------------------------
  // Failure here is NOT a signup-blocker — the user can re-run the
  // estimator to populate it themselves. We just log + keep going.
  try {
    const budgetRows = STARTER_BUDGET_LINES.map((l) => ({
      project_id: projectId,
      csi_division: l.csi_division,
      description: l.description,
      budgeted: l.budgeted,
      committed: 0,
      actual_spent: 0,
    }));
    const { error: blErr } = await sb
      .from('project_budget_lines')
      .insert(budgetRows);
    if (blErr) {
      console.warn('[onboard-new-user] budget-lines seed failed (non-fatal):', blErr);
    }
  } catch (e) {
    console.warn('[onboard-new-user] budget-lines seed threw (non-fatal):', e);
  }

  // ----- 8. Welcome email (best-effort) ------------------------------------
  let emailed = false;
  try {
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'app.theknowledgegardens.com';
    const appBaseUrl = `${proto}://${host}`;
    const html = buildWelcomeEmailHtml({
      name: user.name || user.email.split('@')[0],
      projectId,
      appBaseUrl,
    });
    const result = await sendEmail({
      to: user.email,
      subject: `Welcome to Builder's Garden, ${user.name || user.email.split('@')[0]}`,
      html,
      replyTo: 'charlie@theknowledgegardens.com',
    });
    emailed = !!result.ok;
    if (!result.ok) {
      console.warn('[onboard-new-user] welcome email skipped/failed:', result.error);
    }
    // Best-effort BCC-as-second-send so the internal team has visibility
    // into who's signing up without bcc-spamming the actual user email.
    if (result.ok && INTERNAL_BCC.length > 0) {
      void sendEmail({
        to: INTERNAL_BCC,
        subject: `[PLG] new signup: ${user.email}`,
        html: `<p>${escapeHtml(user.email)} just signed up. Org: <code>${escapeHtml(orgName)}</code> (slug <code>${escapeHtml(usedSlug)}</code>). First project: <code>${escapeHtml(projectId)}</code>.</p>`,
        replyTo: user.email,
      }).catch((e) => console.warn('[onboard-new-user] internal notification failed:', e));
    }
  } catch (e) {
    console.warn('[onboard-new-user] email send threw (non-fatal):', e);
  }

  // ----- 9. Audit log (best-effort) ----------------------------------------
  try {
    await sb.from('audit_log').insert([{
      table_name: 'onboarding',
      record_id: user.id, // audit_log.record_id is uuid; user.id IS a uuid string.
      action: 'insert',
      new_data: {
        org_id: orgId,
        project_id: projectId,
        source: 'plg_signup',
        email: user.email,
      },
      changed_by: user.id,
      source: 'api',
    }]);
  } catch (e) {
    console.warn('[onboard-new-user] audit_log insert threw (non-fatal):', e);
  }

  // ----- 10. Product analytics (best-effort) -------------------------------
  // OBSERVABILITY-WIRE: emits `signup_completed` to PostHog. user.id only;
  // never the email (PII rule). Try/catch is defensive — captureServerEvent
  // already swallows internally, but a belt-and-braces wrap costs nothing.
  try {
    await captureServerEvent(user.id, 'signup_completed', {
      lane: 'gc', // default lane set in project_members above
      org_id: orgId,
      project_id: projectId,
    });
  } catch {
    // Swallow — analytics must never block signup.
  }

  return NextResponse.json({
    ok: true,
    org_id: orgId,
    project_id: projectId,
    emailed,
  });
}
