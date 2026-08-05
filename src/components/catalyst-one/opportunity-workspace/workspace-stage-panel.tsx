"use client";

/**
 * CO-WF-006 — Opportunity Workspace stage panel with Enterprise Transition Dialog.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  EnterpriseStageTransitionDialog,
  type EnterpriseStageTransitionConfirm,
} from "@/components/catalyst-one/shared/enterprise-stage-transition-dialog";
import { eoleSubStageLabel } from "@/constants/enterprise-stage-transition";
import { EOLE_DEFAULT_STAGES } from "@/constants/enterprise-opportunity-lifecycle-engine/pipeline-stages";
import { advanceEwoeWorkflowStage } from "@/lib/enterprise-workflow-orchestration-engine";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import { EDC_EVENT_TYPES } from "@/constants/enterprise-dialogue-center/lifecycle";
import { displayOpportunityRequirementStageLabel } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import {
  getQuickIntent,
  getStagePlaceholderDraft,
  placeholderCancelStageDialog,
  placeholderConfirmStageDialog,
  placeholderConsumeQuickIntent,
  placeholderEvaluateStageTransition,
  placeholderOpenStageDialog,
  placeholderUpdateStageDraft,
  STAGE_OPTIONS_PLACEHOLDER,
} from "./providers/workspace-placeholder-provider";

const EOLE_ACTION_BY_STAGE: Record<string, string> = {
  document_collection: "submit_documents",
  processing: "begin_processing",
  lender_review: "submit_to_lender",
  approved: "approve",
  disbursement: "full_disburse",
};

function eoleStageLabel(code: string): string {
  return (
    EOLE_DEFAULT_STAGES.find((s) => s.stageCode === code)?.stageName ??
    STAGE_OPTIONS_PLACEHOLDER.find((s) => s.code === code)?.label ??
    displayOpportunityRequirementStageLabel(code)
  );
}

export function WorkspaceStagePanel() {
  const {
    opportunityId,
    stageCode,
    changeStage,
    refresh,
    refreshKey,
    documentStats,
    selectedLender,
    overdueTaskCount,
  } = useOpportunityWorkspace();
  const [, bump] = useState(0);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [pendingToStage, setPendingToStage] = useState<string>("lender_review");
  const [currentSubStage, setCurrentSubStage] = useState<string | null>(null);

  const draft = useMemo(
    () => (opportunityId ? getStagePlaceholderDraft(opportunityId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opportunityId, refreshKey],
  );

  const sync = () => {
    bump((n) => n + 1);
    refresh();
  };

  const stageCtx = {
    uploadedDocs: [...documentStats.uploaded],
    verifiedDocs: [...documentStats.verified],
    requiredDocs: documentStats.requiredDocs,
    hasLender: Boolean(selectedLender),
    overdueTaskCount,
  };

  const openTransition = (toStageCode: string) => {
    if (!opportunityId) return;
    setPendingToStage(toStageCode);
    placeholderOpenStageDialog(opportunityId, stageCode);
    placeholderUpdateStageDraft(opportunityId, { nextStageCode: toStageCode });
    placeholderEvaluateStageTransition(opportunityId, toStageCode, stageCtx);
    setTransitionOpen(true);
    sync();
  };

  useEffect(() => {
    if (!opportunityId) return;
    if (getQuickIntent(opportunityId) !== "open_stage_dialog") return;
    placeholderConsumeQuickIntent(opportunityId);
    openTransition(
      getStagePlaceholderDraft(opportunityId).nextStageCode || "lender_review",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey]);

  const commitTransition = async (result: EnterpriseStageTransitionConfirm) => {
    if (!opportunityId) return;
    const reason = result.reason.trim() || "Confirmed via Enterprise Stage Transition";
    placeholderUpdateStageDraft(opportunityId, {
      nextStageCode: result.toStage,
      remarks: reason,
    });
    const confirmed = placeholderConfirmStageDialog(opportunityId, stageCtx);
    if (!confirmed) {
      const draftNow = getStagePlaceholderDraft(opportunityId);
      throw new Error(draftNow.validationMessage || "Unable to confirm stage transition.");
    }

    const action = EOLE_ACTION_BY_STAGE[result.toStage] ?? "submit_to_lender";
    advanceEwoeWorkflowStage({
      opportunityId,
      toStageCode: result.toStage,
      reason,
      actorId: "workspace",
      syncEole: false,
    });
    changeStage(action, result.toStage);
    setCurrentSubStage(result.toSubStageId);

    try {
      appendEdcTimelineEntry({
        contextRef: { type: "opportunity", id: opportunityId },
        eventType: EDC_EVENT_TYPES.STAGE_CHANGE,
        title: `Stage: ${eoleStageLabel(result.fromStage)} → ${result.toStageLabel}`,
        description: [
          `Previous sub-stage: ${eoleSubStageLabel(result.fromStage, result.fromSubStage) || "Not Specified"}`,
          `New sub-stage: ${result.toSubStageLabel || "Not Specified"}`,
          `Reason: ${reason}`,
        ].join(" · "),
        actorId: "workspace",
        expandablePayload: {
          previousStage: result.fromStage,
          newStage: result.toStage,
          previousSubStage: result.fromSubStage,
          newSubStage: result.toSubStageId,
          opportunityId,
          reason,
          source: "CO-WF-006",
        },
      });
    } catch {
      /* non-blocking */
    }

    sync();
  };

  return (
    <OwGlassPanel>
      <OwPanelHeader
        title="Change Stage"
        badge={displayOpportunityRequirementStageLabel(stageCode)}
        description="Guide · Recommend · Confirm · Record (EOLE + EWOE + ECIE)"
      />

      <div className="mb-3 grid gap-2 rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Current stage</span>
          <span className="font-medium capitalize">
            {displayOpportunityRequirementStageLabel(stageCode)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Current sub-stage</span>
          <span className="font-medium">
            {eoleSubStageLabel(stageCode, currentSubStage) || "Not Specified"}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Selected lender</span>
          <span className="font-medium">{selectedLender?.lenderName ?? "Not selected"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Doc completion</span>
          <span className="font-medium">{documentStats.completionPct}%</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => openTransition(draft?.nextStageCode || "lender_review")}
        >
          Open transition dialog
        </Button>
        <Button size="sm" onClick={() => openTransition("lender_review")}>
          Submit to lender
        </Button>
        <Button size="sm" variant="secondary" onClick={() => openTransition("approved")}>
          Approve
        </Button>
      </div>

      {draft?.validationMessage && !transitionOpen ? (
        <p className="mt-2 text-xs text-destructive">{draft.validationMessage}</p>
      ) : null}

      <EnterpriseStageTransitionDialog
        open={transitionOpen}
        onOpenChange={(open) => {
          setTransitionOpen(open);
          if (!open && opportunityId) {
            placeholderCancelStageDialog(opportunityId);
            sync();
          }
        }}
        engine="opportunity_eole"
        fromStage={stageCode}
        fromStageLabel={eoleStageLabel(stageCode)}
        fromSubStage={currentSubStage}
        toStage={pendingToStage}
        toStageLabel={eoleStageLabel(pendingToStage)}
        recommendContext={{
          pendingDocumentCount: Math.max(
            0,
            (documentStats.requiredDocs?.length ?? 0) - (documentStats.verified?.size ?? 0),
          ),
          pendingTaskCount: overdueTaskCount,
        }}
        activityComposer={{
          contextType: "opportunity",
          contextId: opportunityId || "opportunity",
          entityLabel: "Opportunity",
          opportunityId: opportunityId ?? null,
          stage: pendingToStage,
        }}
        actorUserId="workspace"
        actorLabel="Workspace"
        onConfirm={commitTransition}
      />
    </OwGlassPanel>
  );
}
