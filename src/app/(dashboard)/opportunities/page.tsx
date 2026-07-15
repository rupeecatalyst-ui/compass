"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { OpportunityWorkspace } from "@/components/catalyst-one/opportunity-workspace";
import { OpportunityContextPicker } from "@/components/catalyst-one/shared/opportunity-context-picker";
import { ROUTES } from "@/constants/routes";
import { clearActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";

function StrategicWorkspaceGate() {
  const searchParams = useSearchParams();
  const file = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const hasContext = Boolean(file || opportunityId);

  useEffect(() => {
    if (!hasContext) clearActiveOpportunityContext();
  }, [hasContext]);

  if (!hasContext) {
    return (
      <OpportunityContextPicker
        targetHref={ROUTES.OPPORTUNITY_WORKSPACE}
        title="Select an opportunity for Strategic Workspace"
        description="Opening Strategic Workspace from navigation requires an active opportunity. Guided Save & Continue keeps context; closing returns you here."
      />
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
