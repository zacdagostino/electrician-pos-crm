import type { SVGProps } from "react";

type RoleIconProps = SVGProps<SVGSVGElement> & {
  role?: "electrician" | "apprentice" | "office" | null;
};

export default function RoleIcon({ role, className, ...rest }: RoleIconProps) {
  if (!role) return null;

  switch (role) {
    case "electrician":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...rest}
        >
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "apprentice":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...rest}
        >
          <path d="M2 12h5l2 3h6l2-3h5" />
          <path d="M7 12l2-6h6l2 6" />
        </svg>
      );
    case "office":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...rest}
        >
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 12h18" />
        </svg>
      );
    default:
      return null;
  }
}
