"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, FileStack } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpportunityHealthBand } from "@/types/enterprise-opportunity-intelligence";
import { Button } from "@/components/ui/button";
import { buildOpportunityLoanWorkspaceHref } from "@/lib/opportunity-loan-continuity";
import { ROUTES } from "@/constants/routes";
import { OwGlassPanel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

const BAND_STYLES: Record<OpportunityHealthBand, string> = {
  excellent: "bg-emerald-500/15 text-emerald-300",
  good: "bg-teal-500/15 text-teal-200",
  needs_attention: "bg-amber-500/15 text-amber-200",
  critical: "bg-rose-500/15 text-rose-300",
};

/**
 * Prompt 017 — Compact fixed strategic header (presentation only).
 */
export function WorkspaceHeader() {
  const {
    opportunity,
    contact,
    stageCode,
    productLabel,
    selectedLender,
    intelligence,
  } = useOpportunityWorkspace();

  const band = intelligence?.health.band ?? "needs_attention";

  const loanHref = useMemo(() => {
    if (!opportunity?.id) return ROUTES.LOAN_FILES;
    return buildOpportunityLoanWorkspaceHref({
      opportunityId: opportunity.id,
      contact: contact
        ? {
            id: contact.id,
            name: contact.name,
            mobilePrimary: contact.mobilePrimary,
          }
        : null,
    });
  }, [opportunity?.id, contact]);

  const creditHref = useMemo(() => {
    const params = new URLSearchParams();
    if (opportunity?.id) params.set("opportunityId", opportunity.id);
    // Prefer deep-link into Credit Workbench with same continuity as loan href when file is known
    try {
      const loanUrl = new URL(loanHref, "https://local.invalid");
      const file = loanUrl.searchParams.get("file");
      if (file) params.set("file", file);
    } catch {
      /* ignore */
    }
    const q = params.toString();
    return q ? `${ROUTES.DOCUMENTS}?${q}` : ROUTES.DOCUMENTS;
  }, [opportunity?.id, loanHref]);

  return (
    <OwGlassPanel className="sticky top-0 z-30 space-y-3 !rounded-2xl shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-300/80">
            Opportunity Workspace · Strategic Planning
          </p>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
            {contact?.name ?? "Customer"}
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Plan and qualify this opportunity — execution continues in Credit Workbench and Loan Workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide",
              BAND_STYLES[band],
            )}
          >
            {band.replace(/_/g, " ")}
          </span>
          <Button asChild size="sm" variant="secondary" className="h-8 gap-1.5 rounded-lg text-xs">
            <Link href={creditHref}>
              <FileStack className="h-3.5 w-3.5" />
              Credit Workbench
              <ArrowUpRight className="h-3 w-3 opacity-70" />
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
            <Link href={loanHref}>
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Loan Workspace
              <ArrowUpRight className="h-3 w-3 opacity-70" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip label="Opportunity" value={opportunity?.opportunityCode ?? "—"} />
        <Chip label="Product" value={productLabel} />
        <Chip label="Status" value={stageCode.replace(/_/g, " ")} />
        <Chip label="Selected Lender" value={selectedLender?.lenderName ?? "Not selected"} />
      </div>
    </OwGlassPanel>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-[240px] flex-col rounded-lg border border-white/10 bg-zinc-950/50 px-2.5 py-1">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
      <span className="truncate text-[11px] font-semibold capitalize text-zinc-50">{value}</span>
    </span>
  );
}
