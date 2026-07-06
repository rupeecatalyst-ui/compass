"use client";

import { CUSTOMER_HEALTH_LABELS, CUSTOMER_HEALTH_STYLES } from "@/constants/customer-360";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CustomerHealth } from "@/types/catalyst-one";

interface CustomerHealthBadgeProps {
  health: CustomerHealth;
  className?: string;
  showDot?: boolean;
}

export function CustomerHealthBadge({
  health,
  className,
  showDot = true,
}: CustomerHealthBadgeProps) {
  const style = CUSTOMER_HEALTH_STYLES[health];
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 text-[10px] font-medium gap-1 border",
        style.className,
        className,
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dotClass)} />}
      {CUSTOMER_HEALTH_LABELS[health]}
    </Badge>
  );
}
