/**
 * error-messages.ts
 * =================
 * Maps common error shapes to foreman-friendly prose.
 *
 * Brand voice: plainspoken, builder-first, blame-free on errors.
 */

export type ErrorLike = { status?: number; error?: string; message?: string } | Error | unknown;

export type ErrorContext = 'fetch' | 'voice' | 'stream' | 'form';

/**
 * Converts an error to a friendly message suitable for end-user display.
 * @param err The error to convert
 * @param context The context in which the error occurred
 * @returns A plain-English message ready to show to the user
 */
export function toFriendlyMessage(err: ErrorLike, context: ErrorContext): string {
  if (!err) {
    return context === 'voice'
      ? "Didn't catch that — try speaking slowly and clearly."
      : "Something didn't land — try again?";
  }

  // Extract status code if present
  let status: number | undefined;
  if (err instanceof Error) {
    // Try to parse status from error message like "Request failed (404)"
    const match = (err.message || '').match(/\((\d{3})\)/);
    status = match ? parseInt(match[1], 10) : undefined;
  } else if (typeof err === 'object' && err !== null) {
    status = (err as { status?: number }).status;
  }

  // Network / offline errors
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return "Can't reach the garden right now — check your connection.";
  }

  // HTTP status codes
  if (status === 404) {
    return "Couldn't find what you asked for.";
  }

  if (status === 429 || (typeof err === 'object' && err !== null && (err as { error?: string }).error === 'rate_limit')) {
    return 'Hold on a beat — we\'re moving fast. Try again in a second.';
  }

  if (status && status >= 500 && status < 600) {
    return "The garden's having a moment — try again in a few seconds.";
  }

  // Voice-specific fallbacks
  if (context === 'voice') {
    if (typeof err === 'object' && err !== null && (err as { error?: string }).error === 'no-speech') {
      return "Didn't hear anything — try speaking louder or move closer.";
    }
    return "Didn't catch that — try speaking slowly and clearly.";
  }

  // Stream context
  if (context === 'stream') {
    return 'The stream stumbled — reconnecting...';
  }

  // Form context (validation-like errors)
  if (context === 'form') {
    return 'Something in that form still needs fixing — check above.';
  }

  // Fallback for any other error
  return "Something didn't land — try again?";
}
