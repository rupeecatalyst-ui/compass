"use client";

import { useEffect, useRef, useState } from "react";
import { DealControlPanel } from "@/components/catalyst-one/execution/deal-control-panel";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { persistDealPipelineLenders, resolvePipelineDealId, toDealPipelineRuntime } from "@/lib/enterprise-deal/deal-pipeline-runtime";
import { grossStageToLenderCaseStage } from "@/lib/enterprise-deal/deal-lender-stage-map";
import { permittedDeskStageTargets } from "@/lib/case-workbench/operational-desk";
import type { DealPipelineRuntime } from "@/types/deal-pipeline-runtime";

/** The existing Deal editor and persistence path, scoped to exactly one authorized Deal. */
export function WorkbenchDealControl({ dealId, actorUserId, actorLabel, onDirty }: {
  dealId: string;
  actorUserId: string;
  actorLabel?: string;
  onDirty: (dirty: boolean) => void;
}) {
  const [runtime, setRuntime] = useState<DealPipelineRuntime | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const saving = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setRuntime(null);
    setError(null);
    void enterpriseDealApiClient.getDeal(dealId, { forceRefresh: true }).then(deal => {
      if (deal.id !== dealId) throw new Error("Selected Deal identity did not match the authorized response.");
      if (!cancelled) setRuntime(toDealPipelineRuntime(deal));
    }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Deal could not be loaded."); });
    return () => { cancelled = true; };
  }, [dealId, actorUserId, refresh]);
  if (error) return <p role="alert" className="text-xs text-destructive">{error}</p>;
  if (!runtime) return <p role="status" className="text-xs text-muted-foreground">Loading Deal Control…</p>;
  const execution = runtime.lenders[0];
  return <>{saveError ? <p role="alert" className="text-xs text-destructive">{saveError}</p> : null}<DealControlPanel
    presentation="inline"
    open
    onOpenChange={() => undefined}
    caseExecution={execution}
    context={runtime.context}
    actorUserId={actorUserId}
    actorLabel={actorLabel}
    onDirtyChange={onDirty}
    allowedStages={[grossStageToLenderCaseStage(runtime.deal.grossStage), ...permittedDeskStageTargets(runtime.deal.grossStage)]}
    onContextPatch={() => { setRefresh(tick => tick + 1); }}
    onPatch={async (caseId, patch) => {
      if (saving.current) throw new Error("A Deal save is already in progress.");
      if (caseId !== dealId || runtime.deal.id !== dealId || resolvePipelineDealId(execution) !== dealId || runtime.siblingDeals.length !== 1) {
        throw new Error("Selected Deal identity changed. Reopen Deal Control before saving.");
      }
      saving.current = true;
      setSaveError(null);
      try {
        const updated = await persistDealPipelineLenders(runtime, [{ ...execution, ...patch }]);
        setRuntime(updated);
      } catch (reason) {
        setSaveError(reason instanceof Error ? reason.message : "Deal could not be saved.");
        // A transition can succeed before a later field PATCH fails: reread SSOT before retry.
        setRefresh(tick => tick + 1);
        throw reason;
      } finally { saving.current = false; }
    }}
  /></>;
}
