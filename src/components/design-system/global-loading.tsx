"use client";

/**
 * CO-UX-008 — Global loading delegates to CHANAKYA Loading Experience.
 */

import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import type { ChanakyaLoadingModule } from "@/types/chanakya-loading";
import { cn } from "@/lib/utils";

interface GlobalLoadingProps {
  className?: string;
  /** @deprecated Prefer module-scoped CHANAKYA insights; kept as optional status line. */
  message?: string;
  fullScreen?: boolean;
  module?: ChanakyaLoadingModule;
}

export function GlobalLoading({
  className,
  message,
  fullScreen = false,
  module = "enterprise",
}: GlobalLoadingProps) {
  return (
    <ChanakyaLoadingExperience
      module={module}
      statusLabel={message}
      fullScreen={fullScreen}
      density={fullScreen ? "page" : "panel"}
      className={cn(className)}
    />
  );
}
