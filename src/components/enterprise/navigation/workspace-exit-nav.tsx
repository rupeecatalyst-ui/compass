"use client";

import type { BreadcrumbItem } from "@/types/navigation";
import { EnterpriseBreadcrumbs } from "./enterprise-breadcrumbs";
import { ReturnToDashboardLink } from "./return-to-dashboard";
import { cn } from "@/lib/utils";

/**
 * CO-UX-115 — Compact band: breadcrumbs + Return to Dashboard.
 */
export function WorkspaceExitNav({
  breadcrumbs,
  className,
  appearance = "default",
  showReturn = true,
}: {
  breadcrumbs: BreadcrumbItem[];
  className?: string;
  appearance?: "default" | "mission-control";
  showReturn?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        appearance === "default" && "border-b border-border/60 bg-muted/20 px-3 py-1.5 sm:px-4",
        appearance === "mission-control" && "border-b border-zinc-800/80 px-1 pb-2",
        className,
      )}
      data-enterprise-exit-nav=""
    >
      <EnterpriseBreadcrumbs items={breadcrumbs} appearance={appearance} />
      {showReturn ? (
        <ReturnToDashboardLink
          appearance={appearance === "mission-control" ? "mission-control" : "default"}
        />
      ) : null}
    </div>
  );
}
