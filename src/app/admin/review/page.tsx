/**
 * /admin/review (LOOP 2 / Slice B "B5", docs/code-ingestion-hitl.md §6)
 * =====================================================================
 * The reviewer-facing approval queue over the B2 gate API: lists the
 * review / needs_changes inbox and lets an owner/admin approve (= attest +
 * publish), request changes, or reject — recording the §3 review event.
 *
 * Sibling to the legacy /admin/verify (which attests already-published rows
 * under the pre-gate model). Consolidating the two surfaces is a deliberate
 * follow-up; this is the home for the new gate's states. The API enforces the
 * owner/admin allowlist server-side regardless of the UI.
 *
 * Note: this queue is fed by rows entering `review` — going-forward ingestion
 * (B2.1) and the backlog wave (§5). It renders the Invitation empty state until
 * then. `?demo=1` shows seeded sample rows for design review.
 */
import ReviewQueueClient from './ReviewQueueClient';

export const metadata = {
  title: 'Review queue · BKG admin',
  description: 'Owner/admin human-in-the-loop approval queue for knowledge entering the graph.',
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <ReviewQueueClient />;
}
