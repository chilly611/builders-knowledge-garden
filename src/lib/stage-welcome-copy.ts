/**
 * Stage Welcome — Foreman voice copy per stage
 *
 * Copy in foreman-on-the-phone voice: plain English, short sentences.
 * Each stage gets: title, description, and ctaPrefix ("Start with").
 *
 * Suggested workflow IDs map to LIVE_WORKFLOWS in StageWelcome.tsx
 * for CTA navigation.
 */

export const STAGE_WELCOME = {
  1: {
    title: 'Size up the job.',
    description: 'Before you bid, know what you\'re walking into. Pull a quick risk score, a rough estimate, and a client lookup. Trust but verify.',
    ctaPrefix: 'Start with',
    suggestedWorkflowId: 'q2',
  },
  2: {
    title: 'Lock the scope.',
    description: 'Get contracts drafted, check which codes apply, and nail down what gets approved. Paper beats promises.',
    ctaPrefix: 'Start with',
    suggestedWorkflowId: 'q4',
  },
  3: {
    title: 'Plan the work so it plans itself.',
    description: 'Sequence the job, size the crew, line up subs and suppliers. The more you plan, the less you curse.',
    ctaPrefix: 'Start with',
    suggestedWorkflowId: 'q6',
  },
  4: {
    title: 'Build clean. Log everything.',
    description: 'Daily logs, weather calls, safety talks, expenses. What gets written down gets paid for.',
    ctaPrefix: 'Start with',
    suggestedWorkflowId: 'q15',
  },
  5: {
    title: 'Things change. Adapt clean.',
    description: 'Change orders, schedule shifts, field conditions. Price it, paper it, move on.',
    ctaPrefix: 'Start with',
    suggestedWorkflowId: 'q20',
  },
  6: {
    title: 'Get paid.',
    description: 'Draw requests, lien waivers, chase retainage. Your job isn\'t done when the work is done — it\'s done when you\'re paid.',
    ctaPrefix: 'Start with',
    suggestedWorkflowId: 'q21',
  },
  7: {
    title: 'Close the book, lift the next one.',
    description: 'Warranty, retro, referrals. The jobs that pay twice are the ones you reflect on once.',
    ctaPrefix: 'Start with',
    suggestedWorkflowId: 'q27',
  },
} as const satisfies Record<1 | 2 | 3 | 4 | 5 | 6 | 7, {
  title: string;
  description: string;
  ctaPrefix: string;
  suggestedWorkflowId: string;
}>;
