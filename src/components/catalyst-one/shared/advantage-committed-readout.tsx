"use client";

import { ADVANTAGE_COMMITTED_LABEL } from "@/constants/advantage-committed";
import { resolveAdvantageCommittedDisplay } from "@/lib/advantage-committed";
import { cn } from "@/lib/utils";

export function AdvantageCommittedReadout({
  amount,
  productCode,
  productLabel,
  committedProductCode,
  display: displayOverride,
  className,
  compact = false,
}: {
  amount?: unknown;
  productCode?: string | null;
  productLabel?: string | null;
  committedProductCode?: string | null;
  display?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const resolved = resolveAdvantageCommittedDisplay({
    productCode,
    productLabel,
    committedProductCode,
    amount,
  });
  const value = displayOverride?.trim() || resolved.display;
  return (
    <div
      className={cn("min-w-0", className)}
      data-field="advantage-committed"
      data-status={resolved.status}
    >
      <p
        className={cn(
          "text-muted-foreground",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        {ADVANTAGE_COMMITTED_LABEL}
      </p>
      <p
        className={cn(
          "font-medium tabular-nums",
          compact ? "text-[11px]" : "text-sm",
          resolved.status === "committed"
            ? "text-teal-800 dark:text-teal-200"
            : "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
