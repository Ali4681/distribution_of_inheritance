import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "cases"
  | "calendar"
  | "plus"
  | "tree"
  | "calculator"
  | "file"
  | "users"
  | "logout"
  | "search"
  | "sun"
  | "moon"
  | "globe"
  | "settings"
  | "arrow"
  | "trash"
  | "edit"
  | "user"
  | "shield"
  | "download";

const paths: Record<IconName, string[]> = {
  home: ["M3 10.5 12 3l9 7.5", "M5 10v10h14V10", "M9 20v-6h6v6"],
  cases: ["M7 7h10", "M7 12h10", "M7 17h6", "M5 3h14a2 2 0 0 1 2 2v16H3V5a2 2 0 0 1 2-2Z"],
  calendar: ["M7 3v4", "M17 3v4", "M4 9h16", "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z", "M8 13h3", "M13 13h3", "M8 17h3"],
  plus: ["M12 5v14", "M5 12h14"],
  tree: ["M12 4v5", "M6 20v-5h12v5", "M6 15l6-6 6 6", "M4 20h4", "M16 20h4"],
  calculator: ["M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M8 7h8", "M8 11h2", "M12 11h2", "M16 11h0", "M8 15h2", "M12 15h2", "M16 15h0"],
  file: ["M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z", "M14 3v6h6", "M8 13h8", "M8 17h6"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2", "M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  logout: ["M10 17l5-5-5-5", "M15 12H3", "M21 3v18"],
  search: ["M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z", "M21 21l-4.35-4.35"],
  sun: ["M12 4V2", "M12 22v-2", "M4 12H2", "M22 12h-2", "m5 5-1.5 1.5", "m20.5 3.5-1.5 1.5", "m5 7-1.5-1.5", "m20.5 20.5-1.5-1.5", "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
  moon: ["M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"],
  globe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M2 12h20", "M12 2a15 15 0 0 1 0 20", "M12 2a15 15 0 0 0 0 20"],
  settings: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.07a2 2 0 1 1-2.83 2.83l-.07-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.05a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.07.06a2 2 0 1 1-2.83-2.83l.06-.07A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.05a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.07a2 2 0 1 1 2.83-2.83l.07.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.05a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.07-.06a2 2 0 1 1 2.83 2.83l-.06.07A1.7 1.7 0 0 0 19.4 9c.33.61.96 1 1.55 1H21a2 2 0 1 1 0 4h-.05a1.7 1.7 0 0 0-1.55 1Z"],
  arrow: ["M5 12h14", "m12 5 7 7-7 7"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 15H6L5 6", "M10 11v6", "M14 11v6"],
  edit: ["M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z", "M13.5 6.5l4 4"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
