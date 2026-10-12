import type { SVGProps } from "react";

/**
 * Small hand-rolled line-icon set — this app doesn't pull in admin's
 * icon pipeline (svgr + a large pre-made SVG library) since it only needs
 * a dozen simple glyphs. Every path uses stroke="currentColor" explicitly
 * (never relies on an inherited fill) — admin's REACT_REENTRY_API_GUIDE.md
 * documents a real bug class where SVGs with no explicit fill/stroke
 * silently render invisible; these are written to avoid that from the start.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H9.5v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5h3a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function HeadphonesIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="14" width="4" height="6" rx="1.5" />
      <rect x="17.5" y="14" width="4" height="6" rx="1.5" />
    </svg>
  );
}

/**
 * An actual open-book shape (two facing pages meeting at a center spine),
 * not a single lopsided cover — the previous version's asymmetric arc
 * didn't read as "book" at a glance, which is the whole point of an icon.
 */
export function BookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 6.04a9 9 0 0 0-6-2.29c-1.05 0-2.06.18-3 .51v14.25a9 9 0 0 1 3-.51c2.3 0 4.41.87 6 2.29m0-14.25a9 9 0 0 1 6-2.29c1.05 0 2.06.18 3 .51v14.25a9 9 0 0 0-3-.51 9 9 0 0 0-6 2.29m0-14.25v14.25" />
    </svg>
  );
}

export function CardsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7" width="13" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 7a5 5 0 0 0 5 5 5 5 0 0 0-5 5 5 5 0 0 0-5-5 5 5 0 0 0 5-5Z" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" viewBox="0 0 24 24" {...props}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" viewBox="0 0 24 24" {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function DropletIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
    </svg>
  );
}

export function StretchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M12 7v6M12 13l-4 6M12 13l4 6M12 9 6 6M12 9l6-3" />
    </svg>
  );
}

export function AppleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 8c-3.5-2-7 0-7 5s3 8 5.5 8c1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-3 5-6.5 0-2.5-1.5-4-3-4.5" />
      <path d="M12 8c0-2 1-3.5 2.5-4" />
    </svg>
  );
}

export function BreatheIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="8" strokeDasharray="4 3" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" viewBox="0 0 24 24" {...props}>
      <path d="M12 20s-7-4.35-9.5-8.5C.7 8 2.3 4.5 6 4.5c2 0 3.5 1.2 6 3.8 2.5-2.6 4-3.8 6-3.8 3.7 0 5.3 3.5 3.5 7C19 15.65 12 20 12 20Z" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

export function PanelToggleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/** Same path as admin/src/components/header/NotificationDropdown.tsx's bell — reused exactly, not redrawn. */
export function BellIcon(props: IconProps) {
  return (
    <svg fill="currentColor" stroke="none" viewBox="0 0 20 20" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
      />
    </svg>
  );
}

export function HorizontaLDots(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" viewBox="0 0 24 24" {...props}>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function AudioIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11v2M8 8v8M12 5v14M16 8v8M20 11v2" />
    </svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </svg>
  );
}

export function MugIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 3c0 1-1 1-1 2M12 3c0 1-1 1-1 2" />
    </svg>
  );
}
