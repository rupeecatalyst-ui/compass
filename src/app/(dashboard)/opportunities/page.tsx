"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OpportunityWorkspace } from "@/components/catalyst-one/opportunity-workspace";
import { OpportunityContextPicker } from "@/components/catalyst-one/shared/opportunity-context-picker";
import { ROUTES } from "@/constants/routes";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import {
  clearActiveOpportunityContext,
  getActiveOpportunityContext,
  isDashboardNavEntry,
} from "@/lib/lead-opportunity-journey/active-context";

function StrategicWorkspaceGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const file = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const dashboardEntry = isDashboardNavEntry(searchParams);
  const hasContext = Boolean(file || opportunityId);

  useEffect(() => {
    if (dashboardEntry) {
      clearActiveOpportunityContext();
      return;
    }
    if (hasContext) return;
    const active = getActiveOpportunityContext();
    if (active?.fileId) {
      router.replace(
        buildJourneyHref(ROUTES.OPPORTUNITY_WORKSPACE, {
          fileId: active.fileId,
          opportunityId: active.opportunityId,
        }),
      );
    }
  }, [dashboardEntry, hasContext, router]);

  if (dashboardEntry || (!hasContext && !getActiveOpportunityContext()?.fileId)) {
    return (
      <OpportunityContextPicker
        targetHref={ROUTES.OPPORTUNITY_WORKSPACE}
        title="Select an opportunity for Strategic Workspace"
        description="Opened from main navigation — pick a case to begin. While you work inside a transaction, related workspaces keep that same context."
      />
    );
  }

  if (!hasContext) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-xs text-muted-foreground">
        Restoring active opportunity…
      </div>
    );
  }

  return <OpportunityWorkspace />;
}

export default function OpportunityWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-xs text-muted-foreground">
          Loading Strategic Workspace…
        </div>
      }
    >
      <StrategicWorkspaceGate />
    </Suspense>
  );
}
