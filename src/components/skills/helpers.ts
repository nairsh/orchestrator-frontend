/** Convert a slug like "weekly-status-report" → "Weekly Status Report" */
export function formatSkillName(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convert a human name like "Weekly Status Report" → "weekly-status-report" */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
}

export const SKILL_ID_REGEX = /^[a-z0-9-]{1,64}$/;
