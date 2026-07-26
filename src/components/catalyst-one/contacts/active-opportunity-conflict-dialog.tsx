"use client";

/**
 * CO-ARCH — Active Opportunity uniqueness prompt (Contact + Product + Active).
 */

import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";

export function ActiveOpportunityConflictDialog({
  open,
  productLabel,
  existing,
  message,
  canOverride,
  busy,
  onOpenExisting,
  onOverride,
  onCancel,
}: {
  open: boolean;
  productLabel: string;
  existing: EnterpriseOpportunityApiRecord;
  message: string;
  canOverride: boolean;
  busy?: boolean;
  onOpenExisting: () => void;
  onOverride: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-labelledby="active-opp-conflict-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-lg">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
          Active Opportunity
        </p>
        <h2
          id="active-opp-conflict-title"
          className="mt-1 text-base font-semibold tracking-tight text-foreground"
        >
          An active {productLabel} Opportunity already exists for this customer.
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{message}</p>
        <p className="mt-2 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-2 text-xs">
          <span className="font-medium text-foreground">
            {existing.opportunityNumber}
          </span>
          {existing.productLabel ? (
            <span className="text-muted-foreground"> · {existing.productLabel}</span>
          ) : null}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            className="h-9 w-full gap-1.5 text-xs"
            disabled={busy}
            onClick={onOpenExisting}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Open Existing Opportunity
          </Button>
          {canOverride ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full gap-1.5 text-xs"
              disabled={busy}
              onClick={onOverride}
            >
              <Plus className="h-3.5 w-3.5" />
              Create New Opportunity (Override)
            </Button>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Override requires Admin permission or an explicit confirmation workflow.
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-full text-xs"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
