"use client";

import { CommandShellLoading } from "@/components/design-system/command-shell-loading";
import { cn } from "../cn";

/**
 * Standard Mission Control workspace loading surface.
 * Matches existing “Preparing …” blocks across centers.
 */
export function WorkspaceLoadingState({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return <CommandShellLoading label={label} className={cn(className)} />;
}
