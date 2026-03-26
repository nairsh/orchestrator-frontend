/* Custom SVG icons — hand-crafted to match clean sidebar aesthetic.
 * All icons render at 18×18 by default. Stroke-based, 1.3px stroke, round caps.
 */

interface IconProps {
  size?: number;
  className?: string;
}

const defaults = { size: 18, className: '' };

/* ─── Navigation icons ─── */

export function IconPlus({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 5.5v7M5.5 9h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconSearch({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <circle cx="7.8" cy="7.8" r="5.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.6 11.6L16 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconCustomize({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7h14" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 10h3M5 12.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconTasks({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M5 3h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M1 5a2 2 0 0 1 2-2h2v12H3a2 2 0 0 1-2-2V5z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="3.5" cy="6.5" r="0.7" fill="currentColor" />
      <circle cx="3.5" cy="9" r="0.7" fill="currentColor" />
      <circle cx="3.5" cy="11.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function IconFiles({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h4.086a1.5 1.5 0 0 1 1.06.44l3.915 3.914A1.5 1.5 0 0 1 14 7.414V14.5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 3 14.5V3.5z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 2v4.5H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconConnectors({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M6.5 4v3a2.5 2.5 0 0 0 5 0V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 4h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 9.5V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 14h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconSkills({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <rect x="2" y="2" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.5" y="2" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="10.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function IconUseCases({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M5.5 6L8 9l-2.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="2" y="2" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function IconSidebarToggle({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 3v12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function IconMenu({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconSettings({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSun({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M4.1 4.1l1.1 1.1M12.8 12.8l1.1 1.1M4.1 13.9l1.1-1.1M12.8 5.2l1.1-1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconMoon({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M15 10.5A6.5 6.5 0 0 1 7.5 3a6.5 6.5 0 1 0 7.5 7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLogOut({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M11 13.5V15a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 2 15V3a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 11 3v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7 9h9M14 6l2 3-2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFolder({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3.172a1.5 1.5 0 0 1 1.06.44L9 5.706a1.5 1.5 0 0 0 1.06.44H14.5A1.5 1.5 0 0 1 16 7.647V13.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 2 13.5V5.5z" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function IconDownload({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M9 2v10M5.5 8.5L9 12l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronUpDown({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M6 7l3-3 3 3M6 11l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Connector brand icons ─── */

export function IconGitHub({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function IconLinear({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M.008 10C.008 4.478 4.478.008 10 .008s9.992 4.47 9.992 9.992-4.47 9.992-9.992 9.992S.008 15.52.008 10zm7.318-5.687 8.39 8.397a9.994 9.994 0 0 0 .957-1.16l-8.133-8.14a9.98 9.98 0 0 0-1.214.903zm-1.553 1.26 9.513 9.52a10.055 10.055 0 0 0 .74-.971L6.507 4.567a10.04 10.04 0 0 0-.734.006zM4.44 7.04l8.613 8.619a9.963 9.963 0 0 0 1.088-.796L5.28 5.976a9.958 9.958 0 0 0-.84 1.064zM3.24 9.16l7.625 7.631c.377-.09.743-.205 1.098-.344L3.58 8.072a9.98 9.98 0 0 0-.34 1.088z" />
    </svg>
  );
}

export function IconNotion({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-.84.84l-2.822.14c-.094-.187 0-.654.327-.747l.747-.233V9.92L7.822 9.8c-.094-.42.14-1.026.793-1.073l3.003-.187 4.763 7.28V9.8l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

export function IconCheck({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M4 9.5L7.5 13 14 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
