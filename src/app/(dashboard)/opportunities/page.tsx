"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OpportunityWorkspace } from "@/components/catalyst-one/opportunity-workspace";
import { OpportunityBoundStage } from "@/components/catalyst-one/opportunity-workspace/opportunity-bound-stage";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import {
  clearActiveOpportunityContext,
  getActiveOpportunityContext,
  isDashboardNavEntry,
} from "@/lib/lead-opportunity-journey/active-context";
import { useRequirementCapturedGate } from "@/lib/loan-journey/use-requirement-captured-gate";

/**
 * LIFE (Strategy) — Opportunity Workspace stage.
 * Consumes shared Opportunity Context (Registry SSOT). No independent LoanFile pick.
 * ADR-018 Wave 3 — gated until Requirement Captured.
 */
function StrategicWorkspaceGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const file = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const dashboardEntry = isDashboardNavEntry(searchParams);
  const hasUrlContext = Boolean(file || opportunityId);
  const gate = useRequirementCapturedGate(dashboardEntry ? null : opportunityId);

  useEffect(() => {
    if (dashboardEntry) {
      clearActiveOpportunityContext();
      return;
    }
    if (hasUrlContext) return;
    const active = getActiveOpportunityContext();
    if (active?.opportunityId) {
      router.replace(
        buildCanonicalJourneyStageHref("life", {
          fileId: active.fileId ?? null,
          opportunityId: active.opportunityId,
        }),
      );
    }
  }, [dashboardEntry, hasUrlContext, router]);

  if (dashboardEntry || (!hasUrlContext && !getActiveOpportunityContext()?.opportunityId)) {
    return <OpportunityBoundStage stage="strategy_workbench" />;
  }

  if (!hasUrlContext) {
    return (
      <ChanakyaLoadingExperience
        module="opportunity"
        statusLabel="Restoring active Opportunity..."
        density="panel"
      />
    );
  }

  if (gate.status === "loading" || gate.status === "redirecting") {
    return (
      <ChanakyaLoadingExperience
        module="opportunity"
        statusLabel={
          gate.status === "redirecting"
            ? "Requirement not captured — opening Lead Information..."
            : "Loading LIFE..."
        }
        density="panel"
      />
    );
  }

  // Prefer full LIFE workspace when opportunityId is present (Registry-backed).
  if (opportunityId) {
    return <OpportunityWorkspace />;
  }

  return <OpportunityBoundStage stage="strategy_workbench" />;
}

export default function OpportunityWorkspacePage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="opportunity"
          statusLabel="Loading LIFE..."
          density="panel"
        />
      }
    >
      <StrategicWorkspaceGate />
    </Suspense>
  );
}
