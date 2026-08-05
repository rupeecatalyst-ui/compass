"use client";

/**
 * CO-LW-005 — Lender brand mark from Enterprise Lender Registry branding.
 * Never hardcodes logos — consumes logoUrl / resolveLenderBranding SSOT.
 */
import { useState } from "react";
import { getLenderInitials } from "@/data/catalyst-one/dashboard";
import { resolveLenderBranding } from "@/lib/enterprise-lender-registry/branding";
import { cn } from "@/lib/utils";

interface LenderLogoProps {
  /** Display / brand name (backward compatible). */
  lender: string;
  /** Official logo URL from Enterprise Lender Registry. */
  logoUrl?: string | null;
  seedKey?: string | null;
  website?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: { box: "h-4 w-4 text-[7px]", img: "h-4 w-4" },
  md: { box: "h-5 w-5 text-[8px]", img: "h-5 w-5" },
  lg: { box: "h-7 w-7 text-[10px]", img: "h-7 w-7" },
} as const;

function PlaceholderMark({
  label,
  size,
  className,
}: {
  label: string;
  size: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded font-bold shrink-0 border border-border bg-muted text-muted-foreground",
        SIZE[size].box,
        className,
      )}
      title={label}
    >
      {getLenderInitials(label)}
    </span>
  );
}

export function LenderLogo({
  lender,
  logoUrl,
  seedKey,
  website,
  size = "sm",
  className,
}: LenderLogoProps) {
  const branding = resolveLenderBranding({
    displayName: lender,
    seedKey,
    website,
    logoUrl,
  });
  const [broken, setBroken] = useState(false);
  const resolvedLogo = branding.logoUrl;
  const title = branding.brandName || lender;

  if (!resolvedLogo || broken) {
    return <PlaceholderMark label={title} size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external brand assets from registry
    <img
      src={resolvedLogo}
      alt={title}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={cn(
        "inline-block shrink-0 rounded object-contain bg-white border border-border/40",
        SIZE[size].img,
        className,
      )}
    />
  );
}
