"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LoanWorkbenchLayoutProps {
  workbench: ReactNode;
  onWorkbenchScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  className?: string;
}

/**
 * Enterprise Reference Workspace layout — full-width primary workbench.
 * Space on the trailing edge is reserved for temporary Context Workspaces
 * (Action Center), not a permanent intelligence side panel.
 */
export function LoanWorkbenchLayout({
  workbench,
  onWorkbenchScroll,
  className,
}: LoanWorkbenchLayoutProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div
        onScroll={onWorkbenchScroll}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin"
      >
        {workbench}
      </div>
    </div>
  );
}
