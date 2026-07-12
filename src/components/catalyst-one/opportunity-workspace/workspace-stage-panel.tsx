"use client";

import { Button } from "@/components/ui/button";
import { advanceEwoeWorkflowStage } from "@/lib/enterprise-workflow-orchestration-engine";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

export function WorkspaceStagePanel() {
  const { opportunityId, stageCode, changeStage, refresh } = useOpportunityWorkspace();

  const advanceViaEwoe = (toStageCode: string, eoleAction: string) => {
    if (!opportunityId) return;
    advanceEwoeWorkflowStage({
      opportunityId,
      toStageCode,
      reason: `Stage change · ${eoleAction}`,
      actorId: "workspace",
      syncEole: false,
    });
    changeStage(eoleAction, toStageCode);
    refresh();
  };

  return (
    <OwGlassPanel>
      <OwPanelHeader
        title="Change Stage"
        badge={stageCode.replace(/_/g, " ")}
        description="EOLE lifecycle + EWOE orchestration (Dialogue + triggers)"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => advanceViaEwoe("lender_review", "submit_to_lender")}
        >
          Submit to lender
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => advanceViaEwoe("approved", "approve")}
        >
          Approve
        </Button>
      </div>
    </OwGlassPanel>
  );
}
