"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, FileStack, Pencil, Plus, UserRound } from "lucide-react";
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
 * Prompt 017 — Compact fixed enterprise header (implementation target).
 */
export function WorkspaceHeader({
  onAddContact,
  onEditContact,
}: {
  onAddContact: () => void;
  onEditContact: () => void;
}) {
  const {
    opportunity,
    contact,
    stageCode,
    productLabel,
    selectedLender,
    intelligence,
  } = useOpportunityWorkspace();

  const band = intelligence?.health.band ?? "needs_attention";
  const ownerName = contact?.ownerName?.trim() || "RM-001";

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
    <OwGlassPanel className="shrink-0 space-y-3 !rounded-2xl !py-3 shadow-lg shadow-black/25">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-300/85">
            Opportunity Workspace · Strategic Workflow
          </p>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
            {contact?.name ?? "Customer / Company"}
          </h1>
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-lg border-white/15 bg-zinc-950/40 text-xs text-zinc-100 hover:bg-white/5"
            onClick={onAddContact}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Contact
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-lg border-white/15 bg-zinc-950/40 text-xs text-zinc-100 hover:bg-white/5"
            onClick={onEditContact}
            disabled={!contact}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Contact
          </Button>
          <Button asChild size="sm" variant="secondary" className="h-8 gap-1.5 rounded-lg text-xs">
            <Link href={creditHref}>
              <FileStack className="h-3.5 w-3.5" />
              Open Credit Workbench
              <ArrowUpRight className="h-3 w-3 opacity-70" />
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
            <Link href={loanHref}>
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Open Loan Workspace
              <ArrowUpRight className="h-3 w-3 opacity-70" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip label="Opportunity" value={opportunity?.opportunityCode ?? "—"} />
        <Chip label="Product" value={productLabel} />
        <Chip label="Opportunity Status" value={stageCode.replace(/_/g, " ")} />
        <Chip label="Opportunity Owner" value={ownerName} icon />
        <Chip label="Selected Lender" value={selectedLender?.lenderName ?? "Not selected"} />
      </div>
    </OwGlassPanel>
  );
}

function Chip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: boolean;
}) {
  return (
    <span className="inline-flex max-w-[240px] items-start gap-1.5 rounded-lg border border-white/10 bg-zinc-950/55 px-2.5 py-1">
      {icon && <UserRound className="mt-0.5 h-3 w-3 shrink-0 text-zinc-400" />}
      <span className="min-w-0">
        <span className="block text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
          {label}
        </span>
        <span className="block truncate text-[11px] font-semibold capitalize text-zinc-50">
          {value}
        </span>
      </span>
    </span>
  );
}
