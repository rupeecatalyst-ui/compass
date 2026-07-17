"use client";

import { useMemo, useState } from "react";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import { PhaseReadinessDashboard } from "@/components/catalyst-one/phase-readiness-dashboard";
import { derivePhaseReadiness } from "@/lib/enterprise-phase-readiness";
import type { LoanFile } from "@/types/catalyst-one";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TransactionInsightsPanelProps {
  file?: LoanFile | null;
  fileId?: string | null;
  lifeFinalized?: boolean;
  hasContact?: boolean;
  hasOpportunity?: boolean;
  customerName?: string;
  productLabel?: string;
  /** Default collapsed — Workspace First. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Transaction Insights — collapsible information area (≈20% when expanded).
 * Collapsed by default so the primary workspace stays ~80% work area.
 */
export function TransactionInsightsPanel({
  file,
  fileId,
  lifeFinalized,
  hasContact,
  hasOpportunity,
  customerName,
  productLabel,
  defaultOpen = false,
  className,
}: TransactionInsightsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  const snapshot = useMemo(
    () =>
      derivePhaseReadiness({
        file: file ?? null,
        lifeFinalized,
        hasContact: hasContact ?? Boolean(customerName || file?.customerName),
        hasOpportunity: hasOpportunity ?? Boolean(fileId || file),
        customerName: customerName ?? file?.customerName,
        productLabel: productLabel ?? file?.loanProduct,
      }),
    [
      file,
      fileId,
      lifeFinalized,
      hasContact,
      hasOpportunity,
      customerName,
      productLabel,
    ],
  );

  if (!file && !fileId) return null;

  return (
    <div
      className={cn(
        "shrink-0 border-b border-border/60 bg-muted/10",
        className,
      )}
      data-transaction-insights={open ? "expanded" : "collapsed"}
    >
      <Button
        type="button"
        variant="ghost"
        className="flex h-8 w-full items-center justify-between gap-2 rounded-none px-3 py-0 text-left hover:bg-muted/40 sm:px-5"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="transaction-insights-body"
      >
        <span className="flex min-w-0 items-center gap-2">
          <LayoutDashboard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[11px] font-semibold tracking-tight text-foreground">
            Transaction Insights
          </span>
          <span className="truncate text-[10px] text-muted-foreground">
            Overall {snapshot.overallPct}% · {snapshot.nextBusinessAction}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </Button>

      <div
        id="transaction-insights-body"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          {open ? (
            <PhaseReadinessDashboard
              file={file ?? undefined}
              fileId={fileId ?? undefined}
              lifeFinalized={lifeFinalized}
              hasContact={hasContact}
              hasOpportunity={hasOpportunity}
              customerName={customerName}
              productLabel={productLabel}
              className="border-b-0 bg-transparent"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** One-line Chanakya Live — never dominates vertical space. */
export function ChanakyaCompactLive({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-7 min-w-0 max-w-xl items-center gap-2 rounded-md border border-emerald-600/20",
        "bg-emerald-500/5 px-2.5",
        className,
      )}
      title={message}
    >
      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
        Chanakya Live
      </span>
      <p className="min-w-0 truncate text-[11px] text-foreground/90">{message}</p>
    </div>
  );
}
