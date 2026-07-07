"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LoanWorkbenchLayoutProps {
  workbench: ReactNode;
  intelligence: ReactNode;
  onWorkbenchScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  /** UX-04D — Hide right intelligence panel (e.g. Lender Pipeline tab). */
  hideIntelligence?: boolean;
  className?: string;
}

/** UX-01C — Split loan workspace: scrollable workbench (left) + sticky intelligence panel (right). */
export function LoanWorkbenchLayout({
  workbench,
  intelligence,
  onWorkbenchScroll,
  hideIntelligence = false,
  className,
}: LoanWorkbenchLayoutProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row", className)}>
      <div
        onScroll={onWorkbenchScroll}
        className="min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin"
      >
        {!hideIntelligence && (
          <div className="border-b border-border/60 bg-muted/10 p-4 lg:hidden">{intelligence}</div>
        )}
        {workbench}
      </div>

      {!hideIntelligence && (
        <aside
          aria-label="Loan Intelligence Panel"
          className={cn(
            "hidden shrink-0 flex-col border-l border-border/60 lg:flex lg:w-[30%] xl:w-[28%]",
            "bg-gradient-to-b from-muted/25 via-background to-background",
            "overflow-y-auto overscroll-contain scrollbar-thin",
          )}
        >
          {intelligence}
        </aside>
      )}
    </div>
  );
}
