"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { advanceEwoeWorkflowStage } from "@/lib/enterprise-workflow-orchestration-engine";
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

  useEffect(() => {
    if (!opportunityId) return;
    if (getQuickIntent(opportunityId) !== "open_stage_dialog") return;
    placeholderConsumeQuickIntent(opportunityId);
    placeholderOpenStageDialog(opportunityId, stageCode);
    placeholderEvaluateStageTransition(
      opportunityId,
      getStagePlaceholderDraft(opportunityId).nextStageCode,
      stageCtx,
    );
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey]);

  const advanceViaEwoe = (toStageCode: string, eoleAction: string) => {
    if (!opportunityId) return;
    const evalResult = placeholderEvaluateStageTransition(opportunityId, toStageCode, stageCtx);
    if (!evalResult.allowed) {
      placeholderOpenStageDialog(opportunityId, stageCode);
      placeholderUpdateStageDraft(opportunityId, { nextStageCode: toStageCode });
      const d = getStagePlaceholderDraft(opportunityId);
      d.validationMessage = `Transition blocked: ${evalResult.missing.join("; ")}`;
      d.missingRequirements = evalResult.missing;
      sync();
      return;
    }
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

  const onConfirmDialog = () => {
    if (!opportunityId) return;
    const confirmed = placeholderConfirmStageDialog(opportunityId, stageCtx);
    if (!confirmed) {
      sync();
      return;
    }
    const action = EOLE_ACTION_BY_STAGE[confirmed.nextStageCode] ?? "submit_to_lender";
    advanceEwoeWorkflowStage({
      opportunityId,
      toStageCode: confirmed.nextStageCode,
      reason: confirmed.remarks || `Stage dialog · ${confirmed.nextStageCode}`,
      actorId: "workspace",
      syncEole: false,
    });
    changeStage(action, confirmed.nextStageCode);
    sync();
  };

  const evaluation = opportunityId
    ? placeholderEvaluateStageTransition(
        opportunityId,
        draft?.nextStageCode ?? "lender_review",
        stageCtx,
      )
    : null;

  return (
    <OwGlassPanel>
      <OwPanelHeader
        title="Change Stage"
        badge={stageCode.replace(/_/g, " ")}
        description="EOLE lifecycle + EWOE orchestration (Dialogue + validations)"
      />

      <div className="mb-3 grid gap-2 rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Current stage</span>
          <span className="font-medium capitalize">{stageCode.replace(/_/g, " ")}</span>
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
          onClick={() => {
            if (!opportunityId) return;
            placeholderOpenStageDialog(opportunityId, stageCode);
            placeholderEvaluateStageTransition(
              opportunityId,
              getStagePlaceholderDraft(opportunityId).nextStageCode,
              stageCtx,
            );
            sync();
          }}
        >
          Open stage dialog
        </Button>
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

      {draft?.open && (
        <div className="mt-4 space-y-3 rounded-xl border border-teal-500/25 bg-teal-500/5 p-3">
          <div className="space-y-1.5">
            <Label>Possible next stages</Label>
            <Select
              value={draft.nextStageCode}
              onValueChange={(v) => {
                if (!opportunityId) return;
                placeholderUpdateStageDraft(opportunityId, { nextStageCode: v });
                placeholderEvaluateStageTransition(opportunityId, v, stageCtx);
                sync();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS_PLACEHOLDER.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-white/10 bg-background/40 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Transition rules
            </p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              {(draft.transitionRules ?? evaluation?.rules ?? []).map((r) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-white/10 bg-background/40 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Mandatory requirements / missing validations
            </p>
            {(draft.missingRequirements ?? evaluation?.missing ?? []).length === 0 ? (
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-300">
                All mandatory checks currently pass
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-[11px] text-rose-600 dark:text-rose-300">
                {(draft.missingRequirements ?? evaluation?.missing ?? []).map((m) => (
                  <li key={m}>· {m}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input
              value={draft.remarks}
              placeholder="Required for audit trail"
              onChange={(e) => {
                if (!opportunityId) return;
                placeholderUpdateStageDraft(opportunityId, { remarks: e.target.value });
                sync();
              }}
            />
          </div>
          {draft.validationMessage && (
            <p className="text-xs text-destructive">{draft.validationMessage}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onConfirmDialog}>
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!opportunityId) return;
                placeholderCancelStageDialog(opportunityId);
                sync();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </OwGlassPanel>
  );
}
