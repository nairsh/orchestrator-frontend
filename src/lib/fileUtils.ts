/** Shared file path / extension utilities. */

/** Extract the leaf filename from a path (e.g. "src/App.tsx" → "App.tsx"). */
export function getFileName(path: string, fallback = 'file'): string {
  return path.split('/').pop() || fallback;
}

/** Extract the uppercase extension from a filename (e.g. "App.tsx" → "TSX"). Returns '' if none. */
export function getFileExtension(filename: string): string {
  if (!filename.includes('.')) return '';
  return filename.split('.').pop()?.toUpperCase() ?? '';
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
  json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown',
  css: 'css', scss: 'scss', html: 'html', sql: 'sql',
  sh: 'bash', bash: 'bash', zsh: 'bash',
};

/** Guess a Prism/highlight.js language from a filename. */
export function guessLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return LANGUAGE_MAP[ext] ?? 'text';
}

const IMAGE_EXTENSIONS = new Set(['PNG', 'JPG', 'JPEG', 'GIF', 'SVG', 'WEBP']);

/** Check whether a file extension represents an image. */
export function isImageExtension(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext.toUpperCase());
}
