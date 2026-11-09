// Line icons of the zohelo design template: 18px, 1.5px stroke, round caps. Decorative: the control names itself.

export const ICONS = {
  home: "M3 8l6-5 6 5v7H11v-4H7v4H3z",
  undo: "M6 4L3 7l3 3M3 7h7.5a4.5 4.5 0 010 9H7",
  redo: "M12 4l3 3-3 3M15 7H7.5a4.5 4.5 0 000 9H11",
  explore: "M3 14l4-5 3 3 5-7M3 3v12h12",
  catalog: "M3 3h5v5H3zM10 3h5v5h-5zM3 10h5v5H3zM10 10h5v5h-5z",
  guide: "M3 3.5h5a2 2 0 012 2v10a1.5 1.5 0 00-1.5-1.5H3zM15 3.5h-5M15 3.5v10.5h-5",
  saved: "M5 2.5h8v13l-4-3-4 3z",
  watch: "M1.5 9s2.7-5 7.5-5 7.5 5 7.5 5-2.7 5-7.5 5-7.5-5-7.5-5zM9 11a2 2 0 100-4 2 2 0 000 4z",
  doc: "M4 2.5h7l3 3v10H4zM11 2.5v3h3M6.5 9h5M6.5 12h5",
  more: "M5 9h.01M9 9h.01M13 9h.01",
  search: "M8 13a5 5 0 100-10 5 5 0 000 10zM12 12l3.5 3.5",
  menu: "M3 5h12M3 9h12M3 13h12",
  close: "M4 4l10 10M14 4L4 14",
  chevronDown: "M5 7l4 4 4-4",
  chevronRight: "M7 5l4 4-4 4",
  collapse: "M2.5 3h13v12h-13zM7 3v12M12 7l-2 2 2 2",
  expand: "M2.5 3h13v12h-13zM7 3v12M10 7l2 2-2 2",
  dashboards: "M2.5 2.5h5.5v7H2.5zM10 2.5h5.5v4H10zM10 8.5h5.5v7H10zM2.5 11.5h5.5v4H2.5z",
  user: "M9 8.5a3 3 0 100-6 3 3 0 000 6zM3 15.5c0-3 2.7-5 6-5s6 2 6 5",
  clock: "M9 15.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM9 5.5V9l2.5 1.5",
  star: "M9 2.5l2 4.2 4.6.6-3.4 3.2.9 4.5L9 12.8 4.9 15l.9-4.5L2.4 7.3l4.6-.6z",
  copy: "M6 6V3.5A1 1 0 017 2.5h7.5a1 1 0 011 1V11a1 1 0 01-1 1H12M3.5 6h7.5a1 1 0 011 1v7.5a1 1 0 01-1 1H3.5a1 1 0 01-1-1V7a1 1 0 011-1z",
  info: "M9 15.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM9 8.5v4M9 5.75v.01",
  // domains
  economy: "M3 15V9M7 15V5M11 15v-4M15 15V3",
  finance: "M9 2.5v13M12 5.5H7.5a2 2 0 000 4h3a2 2 0 010 4H6",
  business: "M2.5 15.5h13M4 15.5V7l4 2.5V7l4 2.5V4h2v11.5",
  labour: "M3 6h12v8H3zM7 6V4h4v2",
  population: "M6.5 7a2 2 0 100-4 2 2 0 000 4zM2.5 15c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5M12 8a1.7 1.7 0 100-3.4M12.5 10.5c1.7.3 3 2 3 4.5",
  health: "M9 15s-6-3.5-6-8a3 3 0 016-1 3 3 0 016 1c0 4.5-6 8-6 8z",
  education: "M1.5 7L9 3.5 16.5 7 9 10.5zM5 9v3.5c2.5 2 5.5 2 8 0V9",
  society: "M4 4h10v7H8l-3 3v-3H4z",
  housing: "M3 9l6-5 6 5M5 8v7h8V8",
  environment: "M14.5 3.5C7 3.5 3.5 7 3.5 14.5c7.5 0 11-3.5 11-11zM3.5 14.5l6-6",
  transport: "M4 12V5a2 2 0 012-2h6a2 2 0 012 2v7zM4 12v2h2M14 12v2h-2M4 8h10",
  state: "M2.5 15.5h13M3.5 7h11M9 2.5l6 3.5H3zM5 7v7M9 7v7M13 7v7",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function domainIcon(domainKey: string): IconName {
  return (domainKey in ICONS ? domainKey : "economy") as IconName;
}

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      <rect x="2" y="4" width="18" height="3" rx="1.5" fill="var(--accent)" />
      <rect x="2" y="9.5" width="13" height="3" rx="1.5" fill="var(--accent)" />
      <rect x="2" y="15" width="8" height="3" rx="1.5" fill="var(--accent)" />
    </svg>
  );
}

/** Flag images for the language menu (a picture, not a colour token: the flags' own colours). */
export function Flag({ lang }: { lang: "pl" | "en" }) {
  return lang === "pl" ? (
    <svg className="t-flag" width="20" height="14" viewBox="0 0 20 14" aria-hidden="true" focusable="false">
      <rect width="20" height="7" fill="#FFFFFF" />
      <rect y="7" width="20" height="7" fill="#DC143C" />
      <rect x="0.5" y="0.5" width="19" height="13" fill="none" stroke="var(--line-strong)" />
    </svg>
  ) : (
    <svg className="t-flag" width="20" height="14" viewBox="0 0 60 42" aria-hidden="true" focusable="false">
      <rect width="60" height="42" fill="#012169" />
      <path d="M0 0l60 42M60 0L0 42" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0 0l60 42M60 0L0 42" stroke="#C8102E" strokeWidth="3" />
      <path d="M30 0v42M0 21h60" stroke="#FFFFFF" strokeWidth="12" />
      <path d="M30 0v42M0 21h60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  );
}
