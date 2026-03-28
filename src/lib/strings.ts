/** Truncate `text` to `maxLen` characters, appending `…` if truncated. */
export function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}
