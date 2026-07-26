"use client";

import { cn } from "@/lib/utils";
import {
  ACCOUNTING_WORKBENCHES,
  type AccountingWorkbenchId,
} from "@/constants/accounting-workbench";

/**
 * Accounting workbench navigation band — Workspace Standard layer:
 * Workspace chrome → this nav → workbench content.
 * Pattern peers: Loan Workspace tabs, Strategic Workspace tabs, Credit section chips.
 */
export function AccountingWorkbenchNav({
  active,
  onChange,
}: {
  active: AccountingWorkbenchId;
  onChange: (id: AccountingWorkbenchId) => void;
}) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border/50 bg-muted/10 px-2 py-1.5 scrollbar-thin"
      aria-label="Accounting workbenches"
    >
      {ACCOUNTING_WORKBENCHES.map((wb) => (
        <button
          key={wb.id}
          type="button"
          title={wb.description}
          onClick={() => onChange(wb.id)}
          className={cn(
            "shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-medium leading-snug transition-colors",
            active === wb.id
              ? "bg-teal-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {wb.label}
        </button>
      ))}
    </nav>
  );
}
