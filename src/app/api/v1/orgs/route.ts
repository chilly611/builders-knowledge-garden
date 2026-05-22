/**
 * /api/v1/orgs — list + create organizations for the caller.
 *
 * GET   → returns { orgs: Organization[] } where each row is one the
 *         caller is a member of, with the caller's role attached.
 * POST  → creates a new org and adds the caller as 'owner'.
 *         body: { slug, legal_name, dba?, primary_email?, ... }
 *
 * RLS handles read enforcement on its own, but we use the service
 * client here so we can attach org_members in a single transaction
 * and bypass the chicken-and-egg of "you can't read an org until
 * you're a member, but you can't be added as a member until the org
 * exists" without leaning on RLS write paths.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';

interface OrgRow {
  id: string;
  slug: string;
  legal_name: string;
  dba: string | null;
  ein: string | null;
  cslb_number: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  phone: string | null;
  primary_email: string | null;
  website: string | null;
  logo_url: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const sb = getServiceClient();

  const { data: memberships, error: mErr } = await sb
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id);
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const ids = (memberships || []).map((m: { org_id: string }) => m.org_id);
  if (!ids.length) return NextResponse.json({ orgs: [] });

  const { data: orgs, error: oErr } = await sb
    .from('organizations')
    .select('*')
    .in('id', ids)
    .order('legal_name', { ascending: true });
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  const roleByOrg = new Map(
    (memberships || []).map((m: { org_id: string; role: string }) => [m.org_id, m.role])
  );
  const withRole = (orgs || []).map((o: OrgRow) => ({
    ...o,
    role: roleByOrg.get(o.id) || 'member',
  }));
  return NextResponse.json({ orgs: withRole });
}

const ORG_FIELDS = [
  'slug',
  'legal_name',
  'dba',
  'ein',
  'cslb_number',
  'address_street',
  'address_city',
  'address_state',
  'address_zip',
  'phone',
  'primary_email',
  'website',
  'logo_url',
] as const;

function pickOrgFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ORG_FIELDS) if (k in body) out[k] = body[k];
  return out;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const legalName = typeof body.legal_name === 'string' ? body.legal_name.trim() : '';
    if (!legalName) {
      return NextResponse.json(
        { error: 'legal_name is required' },
        { status: 400 }
      );
    }
    const rawSlug = typeof body.slug === 'string' && body.slug.trim()
      ? body.slug.trim()
      : slugify(legalName);
    if (!rawSlug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    const sb = getServiceClient();
    const payload = {
      ...pickOrgFields(body),
      slug: rawSlug,
      legal_name: legalName,
      created_by: user.id,
    };

    const { data: org, error: insertErr } = await sb
      .from('organizations')
      .insert([payload])
      .select()
      .single();
    if (insertErr) {
      const msg = insertErr.message.includes('duplicate key')
        ? 'An organization with that slug already exists.'
        : insertErr.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { error: memberErr } = await sb
      .from('org_members')
      .insert([{ org_id: org.id, user_id: user.id, role: 'owner', invited_by: user.id }]);
    if (memberErr) {
      // Roll back the org create so we don't leave orphans.
      await sb.from('organizations').delete().eq('id', org.id);
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }

    return NextResponse.json({ org: { ...org, role: 'owner' } }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
