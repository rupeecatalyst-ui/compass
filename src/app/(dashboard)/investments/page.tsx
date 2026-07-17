"use client";

import { LineChart } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";

/**
 * Investments — future product-line placeholder (Architecture Freeze).
 * Do not build loan workflows here.
 */
export default function InvestmentsPlaceholderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Investments"
        description="Future product line — Mutual Funds, Insurance, Fixed Deposits, Bonds, PMS/AIF, and advisory."
      />
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-20 text-center">
        <LineChart className="mx-auto h-9 w-9 text-muted-foreground/60" aria-hidden />
        <p className="mt-4 text-sm font-medium text-foreground">Coming soon</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Investments will use the same enterprise pattern: CHANAKYA Radar for prioritisation,
          My Deals for execution queues, and dedicated workspaces per product line.
        </p>
      </div>
    </div>
  );
}
