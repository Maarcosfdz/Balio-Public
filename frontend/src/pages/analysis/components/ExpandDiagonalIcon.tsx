import { cn } from "@/lib/utils";

interface ExpandDiagonalIconProps {
  className?: string;
}

export default function ExpandDiagonalIcon({ className }: ExpandDiagonalIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("analysis-expand-icon", className)}
      aria-hidden="true"
    >
      <path className="analysis-expand-icon__nw" d="M8 3H3v5" />
      <path className="analysis-expand-icon__nw" d="M3 3l7 7" />
      <path className="analysis-expand-icon__se" d="M16 21h5v-5" />
      <path className="analysis-expand-icon__se" d="M21 21l-7-7" />
    </svg>
  );
}