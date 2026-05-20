#!/usr/bin/env node
/**
 * seed-trial-accounts.mjs — 2026-05-20 SF investor demo / handover
 *
 * Creates 5 throwaway contractor trial accounts via Supabase admin API.
 * Each account is pre-attached to one of the 3 demo projects via
 * `user_metadata.demo_project_id` so /welcome can route them straight
 * into their canonical project on first sign-in.
 *
 * Idempotent: existing accounts (matched by email) are skipped, not
 * overwritten. Run as many times as you want.
 *
 * Run from app/ root:
 *
 *   node scripts/seed-trial-accounts.mjs
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');

// Tiny dotenv shim so this works without installing the dependency.
function loadEnv(path) {
  try {
    for (const raw of readFileSync(path, 'utf-8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (e) {
    console.warn(`[seed] note: could not read ${path}: ${e.message}`);
  }
}
loadEnv(envPath);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('[seed] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TRIALS = [
  {
    email: 'gc-trial-01@theknowledgegardens.com',
    password: 'BuildersGarden!01',
    lane: 'builder',
    role: 'gc',
    project: '55730cd3-5225-493d-8b5c-49086d942565',
    projectLabel: 'Marin farmhouse',
  },
  {
    email: 'gc-trial-02@theknowledgegardens.com',
    password: 'BuildersGarden!02',
    lane: 'builder',
    role: 'gc',
    project: 'aa11b22c-1111-4d78-aaaa-bbccdd112233',
    projectLabel: 'ADU in Sausalito',
  },
  {
    email: 'gc-trial-03@theknowledgegardens.com',
    password: 'BuildersGarden!03',
    lane: 'builder',
    role: 'gc',
    project: 'bb22c33d-2222-4d78-bbbb-ccddee223344',
    projectLabel: 'Commercial TI in SoMa',
  },
  {
    email: 'specialty-trial-01@theknowledgegardens.com',
    password: 'BuildersGarden!04',
    lane: 'specialist',
    role: 'specialty',
    project: '55730cd3-5225-493d-8b5c-49086d942565',
    projectLabel: 'Marin farmhouse',
  },
  {
    email: 'diy-trial-01@theknowledgegardens.com',
    password: 'BuildersGarden!05',
    lane: 'dreamer',
    role: 'diy',
    project: 'aa11b22c-1111-4d78-aaaa-bbccdd112233',
    projectLabel: 'ADU in Sausalito',
  },
];

async function findByEmail(email) {
  // The admin.listUsers API doesn't support a server-side email filter,
  // so we paginate and match client-side. With < 1000 users this is fine.
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = (data?.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (!data || !data.users || data.users.length < 200) return null;
    page += 1;
    if (page > 20) return null; // safety
  }
}

async function seed() {
  console.log('[seed] creating trial accounts...');
  const results = [];
  for (const t of TRIALS) {
    const existing = await findByEmail(t.email);
    if (existing) {
      console.log(`[seed]  ~ already exists: ${t.email} (id=${existing.id})`);
      // Backfill user_metadata if it's missing the demo_project_id.
      const meta = existing.user_metadata || {};
      if (meta.demo_project_id !== t.project || meta.lane !== t.lane) {
        const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
          user_metadata: {
            ...meta,
            lane: t.lane,
            role: t.role,
            demo_project_id: t.project,
            is_trial: true,
            name: meta.name || t.email.split('@')[0],
          },
        });
        if (updErr) console.warn(`[seed]    ! could not backfill metadata: ${updErr.message}`);
        else console.log(`[seed]    + backfilled demo_project_id=${t.project}`);
      }
      results.push({ ...t, status: 'existed', id: existing.id });
      continue;
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: t.email,
      password: t.password,
      email_confirm: true,
      user_metadata: {
        name: t.email.split('@')[0],
        lane: t.lane,
        role: t.role,
        demo_project_id: t.project,
        is_trial: true,
      },
    });
    if (error) {
      console.error(`[seed]  ! ${t.email}: ${error.message}`);
      results.push({ ...t, status: 'error', error: error.message });
      continue;
    }
    console.log(`[seed]  + created: ${t.email} (id=${data.user.id}) → ${t.projectLabel}`);
    results.push({ ...t, status: 'created', id: data.user.id });
  }

  console.log('\n--- trial account credentials (for the handover doc) ---\n');
  console.log('| Email | Password | Lane | Project |');
  console.log('|---|---|---|---|');
  for (const r of results) {
    console.log(`| \`${r.email}\` | \`${r.password}\` | ${r.lane} | ${r.projectLabel} |`);
  }
  console.log();
}

seed().catch((e) => {
  console.error('[seed] fatal:', e);
  process.exit(1);
});
