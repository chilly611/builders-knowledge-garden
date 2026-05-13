// Builder's Knowledge Garden — Voice Fingerprint (Brief 2)
//
// Server-side helper that turns the contractor's last ~200 outbound SMS into
// a four-axis tone vector + a handful of example phrases. The draft-reply
// specialist eats this so the AI replies sound like *them*, not like a
// chatbot.
//
// Heuristics, not embeddings (v1). A future embedding-based version can
// drop in behind the same interface — `getOrBuildVoiceFingerprint(userId)`
// is the only consumer.
//
// Storage: `crm_voice_fingerprint` row keyed by user_id, refreshed at most
// once every 24h. If the user has fewer than 5 outbound human-written
// messages, we return a warm default instead.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────

export interface VoiceFingerprint {
  userId: string;
  sampleSize: number;
  toneVector: {
    warmth: number;        // 0-1
    brevity: number;       // 0-1 (1 = very short)
    formality: number;     // 0-1
    questionRate: number;  // 0-1
  };
  examplePhrases: string[]; // 3-5 short phrases the contractor uses
  signoff?: string;          // detected signature pattern, e.g. "— Carlos"
  refreshedAt: string;
}

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MIN_SAMPLE_SIZE = 5;
const MAX_SAMPLE_SIZE = 200;

// ─── Defaults ─────────────────────────────────────────────────────────────

/**
 * Returns a "warm, medium-brevity, low-formality, no-signoff" fingerprint
 * for users with insufficient history.
 */
export function defaultFingerprint(userId: string): VoiceFingerprint {
  return {
    userId,
    sampleSize: 0,
    toneVector: {
      warmth: 0.6,
      brevity: 0.6,
      formality: 0.3,
      questionRate: 0.2,
    },
    examplePhrases: [],
    signoff: undefined,
    refreshedAt: new Date().toISOString(),
  };
}

// ─── Supabase admin client (graceful fallback) ────────────────────────────

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder')) {
    return null;
  }
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

// ─── Heuristic feature extractors ─────────────────────────────────────────

const WARM_TOKENS = [
  'thanks',
  'thank you',
  'appreciate',
  'sounds good',
  'no worries',
  'no problem',
  'sweet',
  'awesome',
  'love it',
  ':)',
  '😊',
];

const FORMAL_TOKENS = [
  'mr.',
  'mrs.',
  'ms.',
  'sir',
  'madam',
  'sincerely',
  'regards',
  'good morning',
  'good afternoon',
  'good evening',
];

const CONTRACTIONS = [
  "don't",
  "won't",
  "i'll",
  "i'm",
  "we'll",
  "we're",
  "you're",
  "can't",
  "didn't",
  "couldn't",
  "should've",
  "would've",
];

const SIGNOFF_REGEX = /\s*[—\-]\s*([A-Z][a-zA-Z]+)\s*$/m;

function avgWordCount(messages: string[]): number {
  if (messages.length === 0) return 0;
  const totalWords = messages.reduce(
    (sum, m) => sum + m.trim().split(/\s+/).filter(Boolean).length,
    0
  );
  return totalWords / messages.length;
}

function computeWarmth(messages: string[]): number {
  if (messages.length === 0) return 0.6;
  let warmHits = 0;
  for (const m of messages) {
    const lower = m.toLowerCase();
    const hit =
      WARM_TOKENS.some((t) => lower.includes(t)) ||
      /!/.test(m); // exclamation marks count as warmth
    if (hit) warmHits++;
  }
  return Math.min(1, warmHits / messages.length);
}

function computeBrevity(messages: string[]): number {
  if (messages.length === 0) return 0.6;
  const avg = avgWordCount(messages);
  return 1 - Math.min(avg / 30, 1);
}

function computeFormality(messages: string[]): number {
  if (messages.length === 0) return 0.3;
  let formalHits = 0;
  for (const m of messages) {
    const lower = m.toLowerCase();
    const formalToken = FORMAL_TOKENS.some((t) => lower.includes(t));
    const hasContractions = CONTRACTIONS.some((c) => lower.includes(c));
    // Formal = uses formal markers OR avoids contractions
    if (formalToken || !hasContractions) formalHits++;
  }
  // Formality is a weak signal — soft-clamp so it doesn't dominate
  return Math.min(1, formalHits / (messages.length * 1.5));
}

function computeQuestionRate(messages: string[]): number {
  if (messages.length === 0) return 0.2;
  const qs = messages.filter((m) => m.trim().endsWith('?')).length;
  return qs / messages.length;
}

function detectSignoff(messages: string[]): string | undefined {
  // Look at the most recent messages first; signoffs settle late.
  const tally = new Map<string, number>();
  for (const m of messages.slice().reverse().slice(0, 50)) {
    const match = m.match(SIGNOFF_REGEX);
    if (match) {
      const sig = `— ${match[1]}`;
      tally.set(sig, (tally.get(sig) ?? 0) + 1);
    }
  }
  if (tally.size === 0) return undefined;
  // Pick the most frequent signoff that appears in >= 30% of the last 50.
  let best: [string, number] | null = null;
  for (const entry of tally.entries()) {
    if (!best || entry[1] > best[1]) best = entry;
  }
  if (best && best[1] >= 5) return best[0];
  return undefined;
}

function extractExamplePhrases(messages: string[]): string[] {
  // Cheap heuristic: take the 3-5 shortest non-trivial messages.
  const filtered = messages
    .map((m) => m.trim())
    .filter((m) => m.length > 0 && m.length <= 80)
    .filter((m, i, arr) => arr.indexOf(m) === i); // dedupe
  // Sort by length ascending — shortest first
  filtered.sort((a, b) => a.length - b.length);
  return filtered.slice(0, 5);
}

// ─── Build vector from bodies ─────────────────────────────────────────────

function buildVector(userId: string, bodies: string[]): VoiceFingerprint {
  if (bodies.length < MIN_SAMPLE_SIZE) {
    return defaultFingerprint(userId);
  }
  return {
    userId,
    sampleSize: bodies.length,
    toneVector: {
      warmth: round2(computeWarmth(bodies)),
      brevity: round2(computeBrevity(bodies)),
      formality: round2(computeFormality(bodies)),
      questionRate: round2(computeQuestionRate(bodies)),
    },
    examplePhrases: extractExamplePhrases(bodies),
    signoff: detectSignoff(bodies),
    refreshedAt: new Date().toISOString(),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Persistence helpers ──────────────────────────────────────────────────

interface FingerprintRow {
  user_id: string;
  sample_size: number;
  tone_vector: VoiceFingerprint['toneVector'];
  example_phrases: string[];
  signoff: string | null;
  refreshed_at: string;
}

function rowToFingerprint(row: FingerprintRow): VoiceFingerprint {
  return {
    userId: row.user_id,
    sampleSize: row.sample_size ?? 0,
    toneVector: row.tone_vector ?? defaultFingerprint(row.user_id).toneVector,
    examplePhrases: row.example_phrases ?? [],
    signoff: row.signoff ?? undefined,
    refreshedAt: row.refreshed_at,
  };
}

function isFresh(row: FingerprintRow): boolean {
  const refreshedAt = Date.parse(row.refreshed_at);
  if (!Number.isFinite(refreshedAt)) return false;
  return Date.now() - refreshedAt < REFRESH_INTERVAL_MS;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Returns a fingerprint for this user, refreshing from the last
 * ~MAX_SAMPLE_SIZE human-written outbound messages if the cached row is
 * stale (or absent). Returns a default fingerprint if Supabase is not
 * configured or the user has too few messages.
 */
export async function getOrBuildVoiceFingerprint(
  userId: string
): Promise<VoiceFingerprint> {
  if (!userId) return defaultFingerprint('anon');
  const admin = getAdminClient();
  if (!admin) return defaultFingerprint(userId);

  // 1. Try the cache.
  try {
    const { data: cached } = await admin
      .from('crm_voice_fingerprint')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (cached && isFresh(cached as FingerprintRow)) {
      return rowToFingerprint(cached as FingerprintRow);
    }
  } catch {
    // table may not exist yet, or no row — fall through to rebuild
  }

  // 2. Pull last MAX_SAMPLE_SIZE human-written outbound messages.
  let bodies: string[] = [];
  try {
    const { data, error } = await admin
      .from('crm_messages')
      .select('body')
      .eq('direction', 'outbound')
      .eq('ai_drafted', false)
      .order('created_at', { ascending: false })
      .limit(MAX_SAMPLE_SIZE);
    if (!error && Array.isArray(data)) {
      bodies = data
        .map((d) => (typeof d.body === 'string' ? d.body : ''))
        .filter((b) => b.length > 0);
    }
  } catch (err) {
    console.warn('[voice-fingerprint] message fetch failed:', err);
  }

  const fingerprint = buildVector(userId, bodies);

  // 3. Upsert.
  try {
    await admin.from('crm_voice_fingerprint').upsert(
      {
        user_id: userId,
        sample_size: fingerprint.sampleSize,
        tone_vector: fingerprint.toneVector,
        example_phrases: fingerprint.examplePhrases,
        signoff: fingerprint.signoff ?? null,
        refreshed_at: fingerprint.refreshedAt,
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('[voice-fingerprint] upsert failed:', err);
  }

  return fingerprint;
}
