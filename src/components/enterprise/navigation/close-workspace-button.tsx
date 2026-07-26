"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { WORKSPACE_EXIT_LABEL } from "@/constants/enterprise-workspace-ux";
import { cn } from "@/lib/utils";

/**
 * CO-UX-116 — Standard workspace exit control (✕ Close → User Home Dashboard).
 * Complements breadcrumbs; does not replace them.
 * Uses Link navigation so browser history is preserved.
 */
export function CloseWorkspaceButton({
  className,
  appearance = "default",
  label = WORKSPACE_EXIT_LABEL,
  href = ROUTES.DASHBOARD,
}: {
  className?: string;
  appearance?: "default" | "mission-control";
  /** Visible label — default platform “Close”. */
  label?: string;
  /** Exit destination — default User Home Dashboard. */
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
        appearance === "mission-control" &&
          "border border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-zinc-400 hover:bg-zinc-800 hover:text-zinc-50",
        appearance === "default" &&
          "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      aria-label="Close workspace"
      title="Close workspace — return to Dashboard"
      data-workspace-exit="close"
    >
      <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
