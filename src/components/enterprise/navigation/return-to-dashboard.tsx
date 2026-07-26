"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { RETURN_TO_DASHBOARD_LABEL } from "@/constants/enterprise-exit-navigation";
import { cn } from "@/lib/utils";

/**
 * CO-UX-115 — Standard exit control to the User Home Dashboard.
 */
export function ReturnToDashboardLink({
  className,
  appearance = "default",
}: {
  className?: string;
  appearance?: "default" | "mission-control" | "subtle";
}) {
  return (
    <Link
      href={ROUTES.DASHBOARD}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors",
        appearance === "mission-control" &&
          "rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-50",
        appearance === "default" &&
          "rounded-md border border-border bg-background px-2.5 py-1.5 text-foreground hover:bg-muted",
        appearance === "subtle" && "text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label="Return to Dashboard"
    >
      {RETURN_TO_DASHBOARD_LABEL}
    </Link>
  );
}
