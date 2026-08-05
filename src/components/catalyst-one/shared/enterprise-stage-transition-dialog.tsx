"use client";

/**
 * CO-WF-006 — Enterprise Stage Transition Dialog.
 * Guide → Recommend → Confirm → Record. CHANAKYA advisory only.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnterpriseActivityComposer } from "@/components/catalyst-one/action-center/workspaces/enterprise-activity-composer";
import {
  eoleSubStageLabel,
  lenderSubStageLabel,
  listEoleSubStagesForStage,
  listLenderSubStagesForStage,
} from "@/constants/enterprise-stage-transition";
import {
  recommendStageTransitionSubStage,
  type StageTransitionRecommendContext,
} from "@/lib/enterprise-stage-transition";
import type { ConversationActivityComposerContext } from "@/types/enterprise-conversation-activity";
import type { LenderCaseStage } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

export type EnterpriseStageTransitionConfirm = {
  toStage: string;
  toStageLabel: string;
  toSubStageId: string | null;
  toSubStageLabel: string | null;
  fromStage: string;
  fromSubStage: string | null;
  reason: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engine: "lender_pipeline" | "opportunity_eole";
  fromStage: string;
  fromStageLabel: string;
  fromSubStage?: string | null;
  toStage: string;
  toStageLabel: string;
  recommendContext?: Partial<StageTransitionRecommendContext>;
  activityComposer: ConversationActivityComposerContext;
  actorUserId: string;
  actorLabel?: string;
  onConfirm: (result: EnterpriseStageTransitionConfirm) => void | Promise<void>;
  /** When false, hide activity composer (rare). Default true. */
  showActivityComposer?: boolean;
};

export function EnterpriseStageTransitionDialog({
  open,
  onOpenChange,
  engine,
  fromStage,
  fromStageLabel,
  fromSubStage,
  toStage,
  toStageLabel,
  recommendContext,
  activityComposer,
  actorUserId,
  actorLabel,
  onConfirm,
  showActivityComposer = true,
}: Props) {
  const subStages = useMemo(() => {
    if (engine === "opportunity_eole") return listEoleSubStagesForStage(toStage);
    return listLenderSubStagesForStage(toStage as LenderCaseStage);
  }, [engine, toStage]);

  const recommendation = useMemo(
    () =>
      recommendStageTransitionSubStage({
        engine,
        fromStage,
        toStage,
        fromSubStage,
        pendingTaskCount: recommendContext?.pendingTaskCount,
        pendingDocumentCount: recommendContext?.pendingDocumentCount,
        hasOpenQuery: recommendContext?.hasOpenQuery,
      }),
    [engine, fromStage, toStage, fromSubStage, recommendContext],
  );

  const [subStageId, setSubStageId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError(null);
    setSubStageId(recommendation.recommendedSubStageId ?? subStages[0]?.id ?? "");
  }, [open, toStage, recommendation.recommendedSubStageId, subStages]);

  const fromSubLabel =
    engine === "opportunity_eole"
      ? eoleSubStageLabel(fromStage, fromSubStage)
      : lenderSubStageLabel(fromStage, fromSubStage);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const sub = subStages.find((s) => s.id === subStageId) ?? null;
      await onConfirm({
        toStage,
        toStageLabel,
        toSubStageId: sub?.id ?? null,
        toSubStageLabel: sub?.label ?? null,
        fromStage,
        fromSubStage: fromSubStage ?? null,
        reason: reason.trim(),
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save transition.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Enterprise Stage Transition</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Current Stage</span>
              <span className="font-medium">{fromStageLabel}</span>
            </div>
            {fromSubLabel ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Current Sub-Stage</span>
                <span>{fromSubLabel}</span>
              </div>
            ) : null}
            <div className="my-2 border-t border-border/60" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">New Stage</span>
              <span className="font-semibold text-foreground">{toStageLabel}</span>
            </div>
          </div>

          <div className="rounded-md border border-teal-600/30 bg-teal-500/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
              CHANAKYA Recommendation
            </p>
            <p className="mt-1 text-xs font-medium">{recommendation.message}</p>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
              {recommendation.rationale.map((r) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Advisory only — you confirm the sub-stage below.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Recommended Sub-Stage</Label>
            {subStages.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No sub-stages for this stage. Stage-only transition is allowed.
              </p>
            ) : (
              <Select value={subStageId || undefined} onValueChange={setSubStageId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select sub-stage" />
                </SelectTrigger>
                <SelectContent>
                  {subStages.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.label}
                      {s.id === recommendation.recommendedSubStageId ? " · recommended" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Reason / Outcome</Label>
            <Textarea
              className="min-h-[72px] text-xs"
              placeholder="Business reason for this transition (audit trail)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {showActivityComposer ? (
            <div className={cn("rounded-md border border-border p-2")}>
              <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
                Activity · Voice Note (ECIE)
              </p>
              <EnterpriseActivityComposer
                presentation="inline"
                heading="Transition activity"
                composer={activityComposer}
                actorUserId={actorUserId}
                actorLabel={actorLabel}
              />
            </div>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={() => void submit()}>
            {busy ? "Saving…" : "Save Transition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
