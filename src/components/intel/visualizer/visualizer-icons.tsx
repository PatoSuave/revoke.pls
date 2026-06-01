import type { SVGProps } from "react";

type IconName =
  | "back"
  | "copy"
  | "expand"
  | "fit"
  | "image"
  | "lock"
  | "minus"
  | "plus"
  | "search"
  | "settings";

const ICON_PATHS: Record<IconName, string[]> = {
  back: ["M15 18l-6-6 6-6", "M9 12h12"],
  copy: ["M9 9h10v10H9z", "M5 5h10v4"],
  expand: ["M8 3H3v5", "M16 3h5v5", "M21 16v5h-5", "M3 16v5h5"],
  fit: ["M4 8V4h4", "M16 4h4v4", "M20 16v4h-4", "M8 20H4v-4", "M8 12h8"],
  image: ["M4 5h16v14H4z", "M7 15l3-3 3 3 3-4 3 4", "M8 8h.01"],
  lock: ["M7 11V8a5 5 0 0 1 10 0v3", "M6 11h12v10H6z"],
  minus: ["M5 12h14"],
  plus: ["M12 5v14", "M5 12h14"],
  search: ["M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z", "M21 21l-4.3-4.3"],
  settings: [
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    "M19.4 15a1.8 1.8 0 0 0 .36 1.98l.03.03a2 2 0 0 1-2.83 2.83l-.03-.03a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 0 1-4 0v-.09a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.03.03a2 2 0 1 1-2.83-2.83l.03-.03A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H3a2 2 0 0 1 0-4h.09A1.8 1.8 0 0 0 4.74 8.8a1.8 1.8 0 0 0-.36-1.98l-.03-.03a2 2 0 1 1 2.83-2.83l.03.03a1.8 1.8 0 0 0 1.98.36h.01A1.8 1.8 0 0 0 10.9 2.7V3a2 2 0 0 1 4 0v-.09a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.03-.03a2 2 0 1 1 2.83 2.83l-.03.03a1.8 1.8 0 0 0-.36 1.98v.01a1.8 1.8 0 0 0 1.65 1.1H21a2 2 0 0 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15z",
  ],
};

export function VisualizerIcon({
  name,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      {ICON_PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
