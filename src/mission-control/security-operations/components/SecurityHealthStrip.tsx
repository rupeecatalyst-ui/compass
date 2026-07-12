"use client";

import type { SecurityHealthIndicator } from "../types";
import { HealthIndicatorStrip } from "../../shared/ui";
import { SecurityHealthBadge } from "./StatusBadges";

export function SecurityHealthStrip({
  indicators,
}: {
  indicators: readonly SecurityHealthIndicator[];
}) {
  return (
    <HealthIndicatorStrip
      title="Security Health"
      indicators={indicators}
      renderBadge={(item) => <SecurityHealthBadge status={item.status} />}
    />
  );
}
