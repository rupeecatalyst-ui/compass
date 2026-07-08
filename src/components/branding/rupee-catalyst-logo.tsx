import { cn } from "@/lib/utils";

interface RupeeCatalystLogoProps {
  className?: string;
  size?: number;
}

export function RupeeCatalystLogo({ className, size = 28 }: RupeeCatalystLogoProps) {
  const s = Math.max(16, size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Rupee Catalyst"
      className={cn("text-primary", className)}
    >
      <defs>
        <linearGradient id="rcGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#rcGrad)" opacity="0.9" />
      <path
        d="M11 22V10h5.6c2.2 0 3.6 1.1 3.6 3 0 1.6-.9 2.6-2.2 3l2.6 6h-2.7l-2.3-5.5H13.4V22H11Zm2.4-7.6h3c1.1 0 1.7-.5 1.7-1.4 0-.9-.6-1.4-1.7-1.4h-3v2.8Z"
        fill="#06080d"
        opacity="0.95"
      />
    </svg>
  );
}

