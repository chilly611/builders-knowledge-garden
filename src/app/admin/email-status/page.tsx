/**
 * /admin/email-status (EMAIL-VERIFICATION, 2026-05-22)
 * =====================================================
 * Admin-facing DNS setup wizard + health dashboard for outbound email.
 * Surfaces the current Resend domain status (verified / pending / failed
 * / not added) and, when not verified, prints the exact DNS records to
 * paste at the user's DNS provider with copy-to-clipboard buttons.
 *
 * Bare URL — there is no /admin layout (yet) per the EMAIL-VERIFICATION
 * brief. LaneGate-gated to `owner` so only org owners see the wizard.
 */

import EmailStatusClient from './EmailStatusClient';

export const metadata = {
  title: 'Email status · BKG admin',
  description:
    'Verification status and DNS setup wizard for outbound email from the Builder\'s Knowledge Garden.',
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <EmailStatusClient />;
}
