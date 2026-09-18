import type { SVGProps } from "react";

/** Symbolsatz der App: 24er-Raster, Strich 1.75, keine Füllung (Design-System §8). */
const PATHS: Record<string, string> = {
  plus:      "M12 5v14M5 12h14",
  search:    "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM20 20l-3.5-3.5",
  send:      "M12 19V5M5 12l7-7 7 7",
  settings:  "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
  doc:       "M14 3H6v18h12V7l-4-4ZM14 3v4h4",
  bolt:      "M13 2 3 14h9l-1 8 10-12h-9l1-8Z",
  image:     "M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M16 9h.01",
  close:     "M6 6l12 12M18 6 6 18",
  chevron:   "m9 6 6 6-6 6",
  check:     "m5 12 5 5 9-10",
  sun:       "M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  moon:      "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  monitor:   "M3 5h18v11H3zM8 20h8M12 16v4",
  logout:    "M10 4H5v16h5M14 8l4 4-4 4M8 12h10",
  panel:     "M3 4h18v16H3zM9 4v16",
  trash:     "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  copy:      "M9 9h11v11H9zM5 15H4V4h11v1",
  download:  "M12 4v11M7 10l5 5 5-5M4 20h16",
  alert:     "M12 8v5M12 16.5h.01M12 3 2 20h20L12 3Z",
  zoom:      "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM20 20l-3.5-3.5M11 8v6M8 11h6",
  shield:    "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z",
  user:      "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  refresh:   "M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5",
  upload:    "M12 16V5M7 10l5-5 5 5M4 20h16",
  dots:      "M12 6h.01M12 12h.01M12 18h.01",
  back:      "m15 6-6 6 6 6",
  clock:     "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2",
  book:      "M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2V5ZM4 19a2 2 0 0 1 2-2h14",
  minimize:  "M5 12h14",
  maximize:  "M5 5h14v14H5z",
  restore:   "M8 8h12v12H8zM4 16V4h12",
};

export type IconName = keyof typeof PATHS;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size, style, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={size ? { width: size, height: size, ...style } : style}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
