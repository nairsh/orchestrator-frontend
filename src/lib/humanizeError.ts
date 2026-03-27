/**
 * Translates technical backend error strings into plain-language messages
 * that a non-technical user can understand and act on.
 */

const ERROR_PATTERNS: [RegExp, string][] = [
  [/all models failed/i, 'We couldn\'t reach any AI service right now'],
  [/connection error/i, 'There was a connection problem — please check your internet and try again'],
  [/connection refused/i, 'Couldn\'t connect to the server — it may be offline or restarting'],
  [/timeout|timed out/i, 'The request took too long — please try again'],
  [/rate limit/i, 'Too many requests — please wait a moment and try again'],
  [/insufficient.*(funds|quota|credits|balance)/i, 'Your account balance is too low to run this task'],
  [/context.*(length|window|too long)/i, 'The conversation is too long — try starting a new task'],
  [/invalid api key/i, 'The AI service key is invalid — check your settings'],
  [/unauthorized|authentication/i, 'You need to sign in to continue'],
  [/model not found/i, 'The selected AI is not available — try choosing a different one'],
  [/500|internal server error/i, 'Something went wrong on our end — please try again'],
  [/bad gateway|502/i, 'The AI service is temporarily unavailable — please try again in a moment'],
  [/service unavailable|503/i, 'The AI service is temporarily down — please try again shortly'],
];

export function humanizeError(raw: string): string {
  if (!raw) return 'Something went wrong. Please try again.';
  for (const [pattern, friendly] of ERROR_PATTERNS) {
    if (pattern.test(raw)) return friendly;
  }
  // If we can't match a pattern, clean up common technical prefixes
  return raw
    .replace(/^(Error|Exception|Failure):\s*/i, '')
    .replace(/litellm\.\w+Error:\s*/i, '')
    .replace(/httpx?\.\w+Error:\s*/i, '');
}

export function humanizeErrorDescription(raw: string): string {
  return humanizeError(raw);
}
