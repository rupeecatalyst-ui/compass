"use client";

import { getLenderInitials } from "@/data/catalyst-one/dashboard";
import { cn } from "@/lib/utils";

/** Brand marks for major lenders — initials fallback when no asset */
const LENDER_BRANDS: Record<string, { bg: string; fg: string; abbr: string }> = {
  "HDFC Bank": { bg: "#004C8F", fg: "#FFFFFF", abbr: "HDFC" },
  "ICICI Bank": { bg: "#F37E20", fg: "#FFFFFF", abbr: "ICICI" },
  "Axis Bank": { bg: "#971237", fg: "#FFFFFF", abbr: "AXIS" },
  SBI: { bg: "#22409A", fg: "#FFFFFF", abbr: "SBI" },
  "Kotak Mahindra": { bg: "#ED1C24", fg: "#FFFFFF", abbr: "KM" },
  "IndusInd Bank": { bg: "#98272A", fg: "#FFFFFF", abbr: "IN" },
  "Bajaj Finserv": { bg: "#005DAA", fg: "#FFFFFF", abbr: "BJ" },
  "Federal Bank": { bg: "#004E8C", fg: "#FFFFFF", abbr: "FB" },
  "IDFC First Bank": { bg: "#9D2235", fg: "#FFFFFF", abbr: "ID" },
  "PNB Housing": { bg: "#0A3D91", fg: "#FFFFFF", abbr: "PN" },
  "Tata Capital": { bg: "#1E3A8A", fg: "#FFFFFF", abbr: "TC" },
  "LIC Housing": { bg: "#FFD700", fg: "#1E3A5F", abbr: "LH" },
};

interface LenderLogoProps {
  lender: string;
  size?: "sm" | "md";
  className?: string;
}

export function LenderLogo({ lender, size = "sm", className }: LenderLogoProps) {
  const brand = LENDER_BRANDS[lender];
  const dim = size === "sm" ? "h-4 w-4 text-[7px]" : "h-5 w-5 text-[8px]";

  if (brand) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded font-bold shrink-0 border border-border/40",
          dim,
          className,
        )}
        style={{ backgroundColor: brand.bg, color: brand.fg }}
        title={lender}
      >
        {brand.abbr.slice(0, size === "sm" ? 2 : 3)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded font-bold shrink-0 border border-border bg-muted text-muted-foreground",
        dim,
        className,
      )}
      title={lender}
    >
      {getLenderInitials(lender)}
    </span>
  );
}
