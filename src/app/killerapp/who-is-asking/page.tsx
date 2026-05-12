// Builder's Knowledge Garden — "Who's asking?" (Brief 1)
// Server Component. Reads recent contacts from Supabase, hands them to the
// client component. URL slug is plain-language per Goal 1; Pro Toggle flips
// the header text to "Contacts" without changing the URL.

import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import WhoIsAskingClient, { type InitialContact } from './WhoIsAskingClient';

export const metadata: Metadata = {
  title: "Who's asking? | Builder's Knowledge Garden",
  description:
    'Voice and photo capture for new leads. Hold the mic or snap a photo — the contact lands on your journey strip at "Lead" with name, address, and intent inferred.',
  openGraph: {
    title: "Who's asking?",
    description: 'Voice + photo contact capture for builders meeting leads in the field.',
  },
};

interface CrmContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  lane: string | null;
  lifecycle_stage: string | null;
  project_location: string | null;
  source: string | null;
  confidence: number | null;
  last_contact_at: string | null;
  created_at: string | null;
}

async function loadRecentContacts(projectId?: string): Promise<InitialContact[]> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder')) {
    return [];
  }
  try {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let query = admin
      .from('crm_contacts')
      .select(
        'id, first_name, last_name, company, email, phone, lane, lifecycle_stage, project_location, source, confidence, last_contact_at, created_at'
      )
      .eq('archived', false)
      .order('last_contact_at', { ascending: false, nullsFirst: false })
      .limit(20);
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return (data as CrmContactRow[]).map((r) => ({
      id: r.id,
      firstName: r.first_name ?? 'Unknown',
      lastName: r.last_name ?? undefined,
      company: r.company ?? undefined,
      email: r.email ?? undefined,
      phone: r.phone ?? undefined,
      lane: r.lane ?? undefined,
      lifecycleStage: r.lifecycle_stage ?? 'lead',
      projectLocation: r.project_location ?? undefined,
      source: r.source ?? 'manual',
      confidence: r.confidence ?? undefined,
      lastContactAt: r.last_contact_at ?? r.created_at ?? undefined,
    }));
  } catch (err) {
    console.error('[who-is-asking] load failed:', err);
    return [];
  }
}

export default async function WhoIsAskingPage({
  searchParams,
}: {
  searchParams?: Promise<{ project?: string | string[] }>;
}): Promise<JSX.Element> {
  const resolved = (await searchParams) ?? {};
  const raw = resolved.project;
  const projectId = Array.isArray(raw) ? raw[0] : raw;

  const initialContacts = await loadRecentContacts(projectId);

  return (
    <WhoIsAskingClient
      initialContacts={initialContacts}
      initialProjectId={projectId}
    />
  );
}
