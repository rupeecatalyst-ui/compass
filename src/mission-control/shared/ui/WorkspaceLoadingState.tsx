"use client";

import { CommandShellLoading } from "@/components/design-system/command-shell-loading";
import { cn } from "../cn";

/**
 * Standard Mission Control workspace loading surface.
 * CO-UX-024 — CHANAKYA contextual insights.
 */
export function WorkspaceLoadingState({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <CommandShellLoading
      label={label}
      module="mission-control"
      className={cn(className)}
    />
  );
}
