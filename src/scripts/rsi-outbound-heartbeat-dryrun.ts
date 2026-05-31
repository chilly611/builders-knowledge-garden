/**
 * rsi-outbound-heartbeat-dryrun.ts — VERIFY runner for Stage 4a OUTBOUND heartbeat
 * ---------------------------------------------------------------------------
 * Exercises the full engine in DRY-RUN mode (no external network, deterministic
 * synthetic signatures, never auto-applies). Prints the heartbeat_reports row
 * and improvement_ledger candidates it produces.
 *
 *   - If Supabase creds are present (NEXT_PUBLIC_SUPABASE_URL + service key),
 *     it also PERSISTS the run (rows are tagged report_data.mode='dry_run' /
 *     metadata.dry_run=true so they are trivially identifiable and removable).
 *   - Otherwise it runs fully offline with persistence disabled and emits the
 *     exact payloads it would have written, for inspection / manual insert.
 *
 * Run:
 *   npx tsx src/scripts/rsi-outbound-heartbeat-dryrun.ts
 *   (optionally with: --env-file=.env.local)
 */
import { runOutboundHeartbeat } from '@/lib/rsi-outbound/heartbeat';
import { isSupabaseConfigured } from '@/lib/supabase';

async function main(): Promise<void> {
  const persist = isSupabaseConfigured();
  const result = await runOutboundHeartbeat({ dryRun: true, trigger: 'dryrun', persist });

  // Full machine-readable result (payloads + per-source classification).
  console.log(JSON.stringify(result, null, 2));

  // Human summary.
  console.log('\n──────────────────────────────────────────────────────────────');
  console.log(`[dryrun] supabase_configured = ${persist}`);
  console.log(`[dryrun] persisted           = ${result.persisted}`);
  console.log(`[dryrun] alert_level         = ${result.alertLevel}`);
  console.log(`[dryrun] heartbeat_report.id = ${result.heartbeatReportId}`);
  console.log(
    `[dryrun] counts              = scanned ${result.counts.scanned}, ` +
      `changed ${result.counts.changed}, new ${result.counts.new}, ` +
      `unchanged ${result.counts.unchanged}, errors ${result.counts.errors}`,
  );
  console.log(`[dryrun] candidates enqueued = ${result.counts.candidatesEnqueued}`);
  for (const c of result.candidates) {
    console.log(`         • ${c.id}  ${c.loop}/${c.action_type}  (conf ${c.confidence})  — ${c.description.slice(0, 90)}…`);
  }
  console.log('──────────────────────────────────────────────────────────────');
}

main().catch((e) => {
  console.error('[dryrun] failed:', e);
  process.exit(1);
});
