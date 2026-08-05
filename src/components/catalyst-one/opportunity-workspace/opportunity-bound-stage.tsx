"use client";

/**
 * Opportunity-bound stage — consumes shared Opportunity Context (Registry SSOT).
 * Used when Opportunity Workspace stages open without a Deal/LoanFile attachment.
 */

import { useEffect } from "react";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import { OpportunityContextPicker } from "@/components/catalyst-one/shared/opportunity-context-picker";
import { useOpportunityWorkspaceContext } from "@/hooks/use-opportunity-workspace-context";
import type { OpportunityWorkspaceStageId } from "@/constants/opportunity-workspace-stages";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import { isDashboardNavEntry } from "@/lib/lead-opportunity-journey/active-context";
import { useSearchParams } from "next/navigation";
import { useRequirementCapturedGate } from "@/lib/loan-journey/use-requirement-captured-gate";
import { displayOpportunityRequirementStageLabel } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

const STAGE_COPY: Record<
  OpportunityWorkspaceStageId,
  {
    title: string;
    body: string;
    moduleId:
      | "credit_bench"
      | "document_center"
      | "credit_workbench"
      | "strategic_workspace";
    pickerTitle: string;
    targetHref: string;
  }
> = {
  opportunity_creation: {
    title: "Lead Creation",
    body: "Capture and maintain the customer requirement for this Opportunity.",
    moduleId: "credit_bench",
    pickerTitle: "Select an opportunity for Lead Creation",
    targetHref: "/credit-bench",
  },
  document_center: {
    title: "Documents",
    body: "Collect documents for this Opportunity. Checklist depth grows as product structure is captured.",
    moduleId: "document_center",
    pickerTitle: "Select an opportunity for Documents",
    targetHref: "/document-center",
  },
  credit_workbench: {
    title: "Credit Bench",
    body: "Evaluate eligibility for this Opportunity. Verification attaches as the case matures.",
    moduleId: "credit_workbench",
    pickerTitle: "Select an opportunity for Credit Bench",
    targetHref: "/credit-workbench",
  },
  strategy_workbench: {
    // CO-UX-012 — "LIFE" is the journey stage only; never the page title.
    title: "Strategy Workbench",
    body: "Select execution strategy for this Opportunity before Deal creation.",
    moduleId: "strategic_workspace",
    pickerTitle: "Select an opportunity for Strategy Workbench",
    targetHref: "/opportunities",
  },
};

const CANONICAL_BY_OW: Record<
  OpportunityWorkspaceStageId,
  "lead_creation" | "documents" | "credit_bench" | "life"
> = {
  opportunity_creation: "lead_creation",
  document_center: "documents",
  credit_workbench: "credit_bench",
  strategy_workbench: "life",
};

export function OpportunityBoundStage({
  stage,
}: {
  stage: OpportunityWorkspaceStageId;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardEntry = isDashboardNavEntry(searchParams);
  const { loading, error, context, needsSelection } = useOpportunityWorkspaceContext();
  const gateOpportunityId =
    !dashboardEntry && !needsSelection
      ? searchParams.get("opportunityId")?.trim() || context?.opportunityId || null
      : null;
  const gate = useRequirementCapturedGate(gateOpportunityId);
  const copy = STAGE_COPY[stage];

  useEffect(() => {
    if (dashboardEntry || needsSelection || !context?.opportunityId) return;
    const hasUrl = Boolean(searchParams.get("opportunityId") || searchParams.get("file"));
    if (hasUrl) return;
    router.replace(
      buildCanonicalJourneyStageHref(CANONICAL_BY_OW[stage], {
        fileId: context.fileId ?? null,
        opportunityId: context.opportunityId,
      }),
    );
  }, [dashboardEntry, needsSelection, context, searchParams, router, stage]);

  if (needsSelection || dashboardEntry) {
    return (
      <OpportunityContextPicker
        targetHref={copy.targetHref}
        title={copy.pickerTitle}
        description="Opened from main navigation with no active Opportunity — pick a case from the Opportunity Registry. While you work inside Opportunity Workspace, every stage keeps this same context."
      />
    );
  }

  if (gate.status === "loading" || gate.status === "redirecting") {
    return (
      <ChanakyaLoadingExperience
        module="opportunity"
        density="panel"
        statusLabel={
          gate.status === "redirecting"
            ? "Requirement not captured — opening Lead Information…"
            : `Opening ${copy.title}…`
        }
      />
    );
  }

  if (loading && !context) {
    return (
      <ChanakyaLoadingExperience
        module="opportunity"
        density="panel"
        statusLabel={`Opening ${copy.title}…`}
      />
    );
  }

  if (error && !context) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Opportunity unavailable</p>
        <p className="mt-2 text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!context?.opportunityId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-xs text-muted-foreground">
        Restoring active Opportunity…
      </div>
    );
  }

  // CO-UX-012 — primary heading is borrower / customer from Opportunity context (SSOT).
  // Never fall back to the journey stage label ("LIFE").
  const customer = context.customer?.trim() || "Not Specified";
  const product = context.product || "—";
  const reference = context.opportunityReference || context.opportunityId;
  const stageLabel = displayOpportunityRequirementStageLabel(context.stage) || "—";
  const owner = context.owner || "—";

  return (
    <div className="-mx-4 flex min-h-0 flex-col md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId={copy.moduleId}
        density="compact"
        hideContextChips
        hidePhaseReadiness
        opportunityWorkspaceStage={stage}
        title={customer}
        titleFullyVisible
        identityLine={[reference, product, stageLabel, owner !== "—" ? `RM ${owner}` : null]
          .filter(Boolean)
          .join(" · ")}
        context={{
          opportunity: reference,
          customer,
          product,
          stage: stageLabel,
          rm: context.owner,
        }}
        fileId={context.fileId}
        opportunityId={context.opportunityId}
      >
        <div className="space-y-4 px-4 pb-8 pt-3 sm:px-5">
          <p className="text-xs text-muted-foreground">{copy.body}</p>
          <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Shared Opportunity Context — same Opportunity across Lead Creation, Documents,
              Credit Bench, and Strategy Workbench (LIFE stage).
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Opportunity Reference" value={reference} mono />
              <Field label="Customer" value={customer} />
              <Field label="Contact Id" value={context.contactId || "—"} mono />
              <Field label="Product" value={product} />
              <Field label="Stage" value={stageLabel} />
              <Field label="Owner" value={owner} />
            </div>
          </section>
        </div>
      </LeadOpportunityJourneyChrome>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <Input
        readOnly
        value={value}
        className={`h-9 text-xs ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
