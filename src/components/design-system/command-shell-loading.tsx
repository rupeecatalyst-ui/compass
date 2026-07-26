"use client";

/**
 * Dark command-shell loading surface (Mission Control, Horizon).
 * CO-UX-024 — CHANAKYA Insight instead of plain “Preparing…”.
 */

import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import type { ChanakyaLoadingModule } from "@/types/chanakya-loading";
import { cn } from "@/lib/utils";

export function CommandShellLoading({
  label,
  className,
  module = "mission-control",
}: {
  label?: string;
  className?: string;
  module?: ChanakyaLoadingModule;
}) {
  return (
    <ChanakyaLoadingExperience
      module={module}
      statusLabel={label}
      surface="command"
      density="panel"
      className={cn("min-h-[12rem] rounded-2xl", className)}
    />
  );
}
