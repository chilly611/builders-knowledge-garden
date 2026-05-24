/**
 * /admin/verify (ATTEST-WIRE, 2026-05-24)
 * =======================================
 * Owner-only verification queue. Lists knowledge_entities rows where
 * manually_verified_at IS NULL AND status='published'. For each row the
 * reviewer opens it in UpCodes (or another licensed source), compares the
 * canonical text against what BKG stored, and clicks Verify ✓. That
 * stamps the trio (manually_verified_at, _by, _source) via
 * POST /api/v1/knowledge-entities/:id/attest, removes the row from the
 * queue, and audit_log captures the change.
 *
 * Math: ~2,256 unverified rows × ~30s/row ≈ 19h of work, ~100/week → full
 * corpus in ~23 weeks of part-time review. Documented in
 * docs/UPCODES-VERIFICATION.md.
 *
 * LaneGate guards the page client-side; the API route enforces the real
 * (server-side) owner allowlist regardless of whether the UI is visible.
 */

import VerifyQueueClient from './VerifyQueueClient';

export const metadata = {
  title: 'Verify knowledge entities · BKG admin',
  description:
    'Owner-only queue for manually verifying knowledge_entities rows against licensed external sources (UpCodes Essentials, ICC Digital Codes Premium, etc.).',
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <VerifyQueueClient />;
}
