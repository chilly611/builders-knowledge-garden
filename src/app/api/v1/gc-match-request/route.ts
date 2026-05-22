import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient } from '@/lib/auth-server';
import { sendEmail, escapeHtml } from '@/lib/email';

/**
 * POST /api/v1/gc-match-request (DIY-LANE, 2026-05-22)
 *
 * Public endpoint behind /killerapp/workflows/find-a-gc. Captures
 * structured project info from a homeowner/dreamer who wants to be
 * matched with a vetted general contractor. Mirrors the architect-
 * request pattern exactly:
 *
 *   1. Service-role insert into `gc_match_requests` so anon visitors
 *      can submit even without auth (RLS policy `gc_match_requests_anon_insert`
 *      also allows this client-side, but we go through service role for
 *      consistency with the architect form).
 *   2. Best-effort fires two Resend emails:
 *        - internal notification to charlie@ + bou@ + chillyd@gmail.com
 *          (per agent brief — Charlie/Bou/John triage these by hand for
 *          the early lane). replyTo points back to the submitter.
 *        - confirmation to the submitter with the 2-business-day SLA.
 *   3. Stamps `notified_at = now()` on the row when the internal email
 *      send returned ok.
 *
 * Email is best-effort. Without `RESEND_API_KEY` the row is still saved
 * and the route returns 201 — the team can scan `gc_match_requests
 * where notified_at is null` to back-fill.
 *
 * Schema reference: supabase/migrations/20260522b_ship_round3_schema.sql
 *   table `gc_match_requests` columns:
 *     contact_name, contact_email, contact_phone, project_address,
 *     project_type, scope_description, budget_range, timeline,
 *     status, notes, created_at, notified_at, user_id, project_id
 */

const INTERNAL_RECIPIENTS = [
  'charlie@theknowledgegardens.com',
  'bou@theknowledgegardens.com',
  'chillyd@gmail.com',
];

const PROJECT_TYPES = ['ADU', 'Addition', 'Remodel', 'New SFR', 'Other'] as const;
type ProjectType = (typeof PROJECT_TYPES)[number];

function clean(v: unknown, max = 2000): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const name = clean(body.name, 200);
    const email = clean(body.email, 200);
    const phone = clean(body.phone, 50);
    const project_address = clean(body.project_address, 500);
    const project_type =
      typeof body.project_type === 'string' &&
      (PROJECT_TYPES as readonly string[]).includes(body.project_type)
        ? (body.project_type as ProjectType)
        : null;
    const scope = clean(body.scope, 4000);
    const budget_range = clean(body.budget_range, 100);
    const timeline = clean(body.timeline, 200);
    const concerns = clean(body.concerns, 4000);

    if (!name) {
      return NextResponse.json(
        { error: 'Please tell us your name.' },
        { status: 400 }
      );
    }
    if (!email) {
      return NextResponse.json(
        { error: 'Please give us an email so we can reach back out.' },
        { status: 400 }
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { error: 'That email address looks malformed. Mind double-checking?' },
        { status: 400 }
      );
    }

    // Optional auth — public endpoint. Captured for cross-reference.
    const user = await getAuthUser(request).catch(() => null);
    const source_path = clean(body.source_path, 500);

    // Stash "concerns" inside notes since the table has no dedicated column.
    const notes =
      [
        concerns ? `Specific concerns: ${concerns}` : null,
        source_path ? `Source: ${source_path}` : null,
      ]
        .filter(Boolean)
        .join('\n\n') || null;

    const supabase = getServiceClient();
    const { data: row, error } = await supabase
      .from('gc_match_requests')
      .insert({
        contact_name: name,
        contact_email: email,
        contact_phone: phone,
        project_address,
        project_type,
        scope_description: scope,
        budget_range,
        timeline,
        notes,
        user_id: user?.id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[gc-match-request] insert error:', error);
      return NextResponse.json(
        { error: 'Could not save your request. Try again in a minute?' },
        { status: 500 }
      );
    }

    // ---- email (best-effort) ----
    const internalHtml = buildInternalEmailHtml({
      name,
      email,
      phone,
      project_address,
      project_type,
      scope,
      budget_range,
      timeline,
      concerns,
      requestId: row?.id ?? null,
    });
    const confirmHtml = buildConfirmationEmailHtml({
      name,
      project_address,
    });

    const [internalSend, confirmSend] = await Promise.all([
      sendEmail({
        to: INTERNAL_RECIPIENTS,
        subject: `GC match request — ${name}${project_type ? ` · ${project_type}` : ''}${project_address ? ` · ${project_address}` : ''}`,
        html: internalHtml,
        replyTo: email,
      }),
      sendEmail({
        to: email,
        subject: 'We received your contractor-matching request',
        html: confirmHtml,
        replyTo: 'charlie@theknowledgegardens.com',
      }),
    ]);

    // Stamp notified_at if the internal team email landed; a bouncing
    // confirmation to a busted submitter address shouldn't gate the flag.
    if (internalSend.ok && row?.id) {
      const { error: stampErr } = await supabase
        .from('gc_match_requests')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', row.id);
      if (stampErr) {
        console.warn(
          '[gc-match-request] failed to stamp notified_at:',
          stampErr
        );
      }
    }

    return NextResponse.json(
      {
        request: row,
        emailed: {
          internal: internalSend.ok,
          confirmation: confirmSend.ok,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[gc-match-request] POST error:', e);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Email body builders — plain HTML, all user-typed strings go through
// escapeHtml so a stray < doesn't break the layout.
// ---------------------------------------------------------------------------

interface InternalEmailFields {
  name: string;
  email: string;
  phone: string | null;
  project_address: string | null;
  project_type: string | null;
  scope: string | null;
  budget_range: string | null;
  timeline: string | null;
  concerns: string | null;
  requestId: string | null;
}

function buildInternalEmailHtml(f: InternalEmailFields): string {
  const row = (label: string, val: string | null) =>
    val
      ? `<tr>
           <td style="padding:6px 12px 6px 0;color:#6B6962;font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
           <td style="padding:6px 0;color:#1A1A1A;font-size:14px;">${escapeHtml(val).replace(/\n/g, '<br/>')}</td>
         </tr>`
      : '';
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#FAF8F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1A1A;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #D8D2C2;border-radius:10px;padding:28px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.14em;font-weight:700;color:#C4A44A;text-transform:uppercase;">New GC match request</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#1A1A1A;">${escapeHtml(f.name)} needs a contractor</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#3D3D3D;">
        Submitted via the Builder's Knowledge Garden DIY-lane find-a-GC form.
        Reply to this email to write back to ${escapeHtml(f.name)} directly.
        Target SLA: matches within 2 business days.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        ${row('Name', f.name)}
        ${row('Email', f.email)}
        ${row('Phone', f.phone)}
        ${row('Project type', f.project_type)}
        ${row('Project address', f.project_address)}
        ${row('Budget range', f.budget_range)}
        ${row('Timeline', f.timeline)}
        ${row('Scope', f.scope)}
        ${row('Concerns', f.concerns)}
        ${row('Request ID', f.requestId)}
      </table>
      <p style="margin:0;font-size:12px;color:#B8B5AC;">
        Sent by the Knowledge Gardens app. Reply directly — the replyTo header points back to ${escapeHtml(f.email)}.
      </p>
    </div>
  </body>
</html>`;
}

function buildConfirmationEmailHtml(f: {
  name: string;
  project_address: string | null;
}): string {
  const area = f.project_address ? escapeHtml(f.project_address) : 'your area';
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#FAF8F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1A1A;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #D8D2C2;border-radius:10px;padding:32px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.14em;font-weight:700;color:#1D9E75;text-transform:uppercase;">We got it</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#1A1A1A;">Hi ${escapeHtml(f.name)} —</h1>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3D3D3D;">
        Thanks for telling us about your project. Your request landed with
        the Knowledge Gardens team — Charlie, Bou, and John all saw it.
      </p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3D3D3D;">
        We&rsquo;ll email you <strong>within 2 business days</strong> with
        2&ndash;3 vetted general contractors who&rsquo;ve done work like
        yours in ${area}. We don&rsquo;t ghost-list every contractor with a
        license — these are the ones we&rsquo;d hire ourselves. If something
        is on fire, just reply to this email and we&rsquo;ll move faster.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3D3D3D;">
        — The Knowledge Gardens team
      </p>
      <hr style="border:none;border-top:1px solid #D8D2C2;margin:0 0 16px;" />
      <p style="margin:0;font-size:12px;color:#B8B5AC;line-height:1.5;">
        This is a confirmation only — no action needed from you. If you didn&rsquo;t
        fill out the GC-matching form at theknowledgegardens.com, you can safely
        ignore this email.
      </p>
    </div>
  </body>
</html>`;
}
