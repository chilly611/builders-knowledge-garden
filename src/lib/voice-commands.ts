/**
 * Voice Command Parser for Navigation
 * ====================================
 * Maps natural-language voice transcripts to structured navigation intents.
 *
 * Supports exactly 14 commands:
 * - Workflow: "estimating", "contracts", "code compliance", "sequencing", etc.
 * - Navigation: "home", "back to start", "all workflows"
 * - UI: "close", "cancel", "done"
 *
 * Strategy:
 * 1. Lowercase + trim.
 * 2. Literal regex for "home" / "back to start" → nav:home.
 * 3. Literal regex for "close"/"cancel"/"done" → ui:close_overlay.
 * 4. For each workflow, check if any keyword phrase appears as substring.
 * 5. If multiple matches, pick the phrase with LONGER length (more specific).
 * 6. Return null if no match.
 */

export type NavigationIntent =
  | { type: 'workflow'; workflowId: string; href: string }
  | { type: 'nav'; target: 'home'; href: string }
  | { type: 'ui'; action: 'close_overlay' };

export type VoiceNavError = 'no-match' | 'permission-denied' | 'not-supported' | 'no-speech';

/**
 * Command entries: each workflow with its keyword variations and target href.
 */
export interface CommandEntry {
  workflowId: string;
  phrases: string[];
  href: string;
}

export const COMMANDS: CommandEntry[] = [
  {
    workflowId: 'q2',
    phrases: ['estimating', 'take me to estimating'],
    href: '/killerapp/workflows/estimating',
  },
  {
    workflowId: 'q4',
    phrases: ['contracts', 'contract templates'],
    href: '/killerapp/workflows/contract-templates',
  },
  {
    workflowId: 'q5',
    phrases: ['code compliance', 'codes'],
    href: '/killerapp/workflows/code-compliance',
  },
  {
    workflowId: 'q6',
    phrases: ['sequencing', 'job sequencing'],
    href: '/killerapp/workflows/job-sequencing',
  },
  {
    workflowId: 'q7',
    phrases: ['crew', 'crew sizing', 'workers'],
    href: '/killerapp/workflows/worker-count',
  },
  {
    workflowId: 'q8',
    phrases: ['permits', 'permit applications'],
    href: '/killerapp/workflows/permit-applications',
  },
  {
    workflowId: 'q9',
    phrases: ['subs', 'subcontractors'],
    href: '/killerapp/workflows/sub-management',
  },
  {
    workflowId: 'q10',
    phrases: ['equipment', 'rent or buy'],
    href: '/killerapp/workflows/equipment',
  },
  {
    workflowId: 'q11',
    phrases: ['supply', 'supply ordering', 'order supplies'],
    href: '/killerapp/workflows/supply-ordering',
  },
  {
    workflowId: 'q14',
    phrases: ['weather', 'weather schedule'],
    href: '/killerapp/workflows/weather-scheduling',
  },
  {
    workflowId: 'q15',
    phrases: ['daily log', 'log today'],
    href: '/killerapp/workflows/daily-log',
  },
  {
    workflowId: 'q17',
    phrases: ['expenses', 'receipts'],
    href: '/killerapp/workflows/expenses',
  },
];

/**
 * Matches a transcript against known commands.
 * Returns the matching NavigationIntent or null.
 *
 * Strategy:
 * 1. Lowercase + trim input.
 * 2. Check literal patterns for "home" / "back to start" → nav:home.
 * 3. Check literal patterns for "close" / "cancel" / "done" → ui:close_overlay.
 * 4. For workflows, find all matching phrases (substring match).
 * 5. If multiple matches, pick the longest phrase (most specific).
 * 6. Return the intent or null.
 */
export function matchCommand(transcript: string): NavigationIntent | null {
  if (!transcript || transcript.trim().length === 0) {
    return null;
  }

  const lower = transcript.toLowerCase().trim();

  // Check for home navigation (literal patterns)
  if (/\bhome\b|\bback to start\b|\ball workflows\b/i.test(lower)) {
    return {
      type: 'nav',
      target: 'home',
      href: '/killerapp',
    };
  }

  // Check for close/cancel/done UI action
  if (/\bclose\b|\bcancel\b|\bdone\b/i.test(lower)) {
    return {
      type: 'ui',
      action: 'close_overlay',
    };
  }

  // Match workflows: find all matching phrases, pick the longest one
  let bestMatch: { command: CommandEntry; phrase: string } | null = null;

  for (const command of COMMANDS) {
    for (const phrase of command.phrases) {
      // Check if phrase appears as substring in transcript
      if (lower.includes(phrase.toLowerCase())) {
        // Pick the longest matching phrase for specificity
        if (!bestMatch || phrase.length > bestMatch.phrase.length) {
          bestMatch = { command, phrase };
        }
      }
    }
  }

  if (bestMatch) {
    return {
      type: 'workflow',
      workflowId: bestMatch.command.workflowId,
      href: bestMatch.command.href,
    };
  }

  return null;
}
