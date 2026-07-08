import Link from "next/link";
import { Compass } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface CompassLogoProps {
  className?: string;
  showTagline?: boolean;
}

export function CompassLogo({ className, showTagline = false }: CompassLogoProps) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${siteConfig.name} home`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm transition-transform group-hover:scale-[1.02]">
        <Compass className="h-5 w-5 text-primary-foreground" aria-hidden />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold tracking-tight">{siteConfig.name}</span>
        {showTagline ? (
          <span className="text-[11px] text-muted-foreground leading-tight">
            Powered by <span className="font-medium text-primary">{siteConfig.company}</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}
