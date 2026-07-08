import Link from "next/link";
import { Compass } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

function RupeeCatalystMark({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 32 32"
      role="img"
      aria-label="Rupee Catalyst"
      className={cn("text-primary", className)}
    >
      <defs>
        <linearGradient id="rcGradCompass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#rcGradCompass)" opacity="0.9" />
      <path
        d="M11 22V10h5.6c2.2 0 3.6 1.1 3.6 3 0 1.6-.9 2.6-2.2 3l2.6 6h-2.7l-2.3-5.5H13.4V22H11Zm2.4-7.6h3c1.1 0 1.7-.5 1.7-1.4 0-.9-.6-1.4-1.7-1.4h-3v2.8Z"
        fill="#06080d"
        opacity="0.95"
      />
    </svg>
  );
}

interface CompassLogoProps {
  className?: string;
  showTagline?: boolean;
}

export function CompassLogo({ className, showTagline = false }: CompassLogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2 sm:max-w-none sm:gap-2.5 rounded-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={`${siteConfig.name} home`}
    >
      <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 sm:flex">
        <RupeeCatalystMark />
      </span>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm transition-transform group-hover:scale-[1.02]">
        <Compass className="h-5 w-5 text-primary-foreground" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-base font-semibold tracking-tight sm:text-lg">
          {siteConfig.name}
        </span>
        {showTagline ? (
          <span className="hidden truncate text-[11px] leading-tight text-muted-foreground sm:block">
            <span className="font-medium text-foreground/80">{siteConfig.tagline}</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}
