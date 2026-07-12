"use client";

import type { PlatformHealthIndicator } from "../types";
import { HealthIndicatorStrip } from "../../shared/ui";
import { ObservabilityHealthBadge } from "./StatusBadges";

export function PlatformHealthStrip({
  indicators,
}: {
  indicators: readonly PlatformHealthIndicator[];
}) {
  return (
    <HealthIndicatorStrip
      title="Platform Health"
      indicators={indicators}
      renderBadge={(item) => <ObservabilityHealthBadge status={item.status} />}
    />
  );
}
