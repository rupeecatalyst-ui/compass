import Link from "next/link";
import Image from "next/image";
import { Compass } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo.asset.json";

interface CompassLogoProps {
  className?: string;
  showTagline?: boolean;
}

export function CompassLogo({ className, showTagline = false }: CompassLogoProps) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${siteConfig.name} home`}>
      <Image
        src={logoAsset.url}
        alt="Rupee Catalyst"
        width={26}
        height={26}
        className="rounded-sm opacity-90"
        priority
      />
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm transition-transform group-hover:scale-[1.02]">
        <Compass className="h-5 w-5 text-primary-foreground" aria-hidden />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold tracking-tight">{siteConfig.name}</span>
        {showTagline ? (
          <span className="text-[11px] text-muted-foreground leading-tight">
            <span className="font-medium text-foreground/80">{siteConfig.tagline}</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}
