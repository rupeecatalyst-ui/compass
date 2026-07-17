"use client";

import type { ReactNode } from "react";
import {
  WORKSPACE_SPLIT_MIN_HEIGHT,
  type EnterpriseWorkspaceScrollMode,
} from "@/constants/enterprise-workspace-ux";
import { useWorkspaceChromeCollapse } from "@/hooks/use-workspace-chrome-collapse";
import { cn } from "@/lib/utils";

export interface EnterpriseWorkspaceShellProps {
  /** Sticky / collapsible chrome (navigator, insights, header). */
  chrome: ReactNode;
  children: ReactNode;
  /**
   * document (default): natural page scroll — no viewport lock.
   * locked-split: work surface fills remaining viewport with internal pane scroll
   * (document preview desks). Outer page still scrolls so chrome can collapse.
   */
  scrollMode?: EnterpriseWorkspaceScrollMode;
  /** Collapse navigator / secondary chrome after scroll. Default true. */
  collapseOnScroll?: boolean;
  className?: string;
  /** Applied to the sticky chrome wrapper. */
  chromeClassName?: string;
  /** Applied to the primary work region. */
  bodyClassName?: string;
}

/**
 * Platform-wide Enterprise Workspace Shell.
 * Maximises working area, collapses chrome on scroll, enables natural page scrolling.
 */
export function EnterpriseWorkspaceShell({
  chrome,
  children,
  scrollMode = "document",
  collapseOnScroll = true,
  className,
  chromeClassName,
  bodyClassName,
}: EnterpriseWorkspaceShellProps) {
  const { sentinelRef, collapsed } = useWorkspaceChromeCollapse(collapseOnScroll);
  const lockedSplit = scrollMode === "locked-split";

  return (
    <div
      className={cn("enterprise-workspace-shell group/ews flex w-full flex-col", className)}
      data-chrome-collapsed={collapsed ? "true" : "false"}
      data-scroll-mode={scrollMode}
    >
      <div ref={sentinelRef} className="pointer-events-none h-0 w-full" aria-hidden />
      <div
        className={cn(
          "sticky top-0 z-20 shrink-0 border-b border-border/70 bg-background/95 backdrop-blur",
          "supports-[backdrop-filter]:bg-background/90",
          "transition-[box-shadow] duration-200",
          collapsed && "shadow-md shadow-black/5 dark:shadow-black/25",
          chromeClassName,
        )}
        data-workspace-chrome=""
        data-collapsed={collapsed ? "true" : "false"}
      >
        {chrome}
      </div>
      <div
        className={cn(
          "enterprise-workspace-body flex w-full flex-col",
          lockedSplit
            ? cn(WORKSPACE_SPLIT_MIN_HEIGHT, "min-h-0 flex-1")
            : "min-h-0 flex-1",
          bodyClassName,
        )}
        data-workspace-body=""
      >
        {children}
      </div>
    </div>
  );
}
