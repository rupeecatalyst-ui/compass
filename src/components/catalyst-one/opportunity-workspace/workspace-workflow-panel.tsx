"use client";

import { useMemo } from "react";
import {
  advanceEwoeWorkflowStage,
  getEwoeWorkflowVisualization,
  listEwoeEvents,
} from "@/lib/enterprise-workflow-orchestration-engine";
import type { EwoeVisualizationStatus } from "@/types/enterprise-workflow-orchestration-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

const STATUS_STYLE: Record<EwoeVisualizationStatus, string> = {
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  current: "border-teal-400/50 bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/40",
  pending: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  upcoming: "border-white/10 bg-zinc-950/40 text-zinc-400",
};

export function WorkspaceWorkflowPanel() {
  const { opportunityId, refresh, refreshKey, stageCode } = useOpportunityWorkspace();

  const visualization = useMemo(() => {
    if (!opportunityId) {
      return {
        opportunityId: "",
        progressRatio: 0,
        nodes: [],
        recentTransitions: [],
      };
    }
    return getEwoeWorkflowVisualization(opportunityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey]);

  const events = useMemo(() => {
    if (!opportunityId) return [];
    return listEwoeEvents(opportunityId).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey]);

  const onAdvance = (toStageCode: string) => {
    if (!opportunityId) return;
    advanceEwoeWorkflowStage({
      opportunityId,
      toStageCode,
      reason: `Workspace advance to ${toStageCode}`,
      actorId: "workspace",
    });
    refresh();
  };

  const nextNode = visualization.nodes.find((n) => n.status === "pending");

  return (
    <OwGlassPanel className="h-full">
      <OwPanelHeader
        title="Workflow · EWOE"
        badge={visualization.definitionCode ?? "EWOE"}
        description="Orchestration above EOLE — current, completed, pending, upcoming"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[6rem]">
          <p className="text-[9px] uppercase tracking-wider text-zinc-400">Progress</p>
          <p className="text-2xl font-semibold tabular-nums text-zinc-50">
            {Math.round(visualization.progressRatio * 100)}%
          </p>
        </div>
        <div className="min-w-[8rem]">
          <p className="text-[9px] uppercase tracking-wider text-zinc-400">Current</p>
          <p className="text-sm font-medium capitalize text-teal-200">
            {(visualization.currentStageCode ?? stageCode).replace(/_/g, " ")}
          </p>
        </div>
        {visualization.definitionVersion != null && (
          <div>
            <p className="text-[9px] uppercase tracking-wider text-zinc-400">Version</p>
            <p className="text-sm font-medium text-zinc-200">v{visualization.definitionVersion}</p>
          </div>
        )}
      </div>

      <div className="relative space-y-0">
        {visualization.nodes.map((node, index) => (
          <div key={node.stageCode} className="relative flex gap-3 pb-4 last:pb-0">
            {index < visualization.nodes.length - 1 && (
              <div className="absolute left-[0.85rem] top-7 h-[calc(100%-0.5rem)] w-px bg-white/10" />
            )}
            <div
              className={cn(
                "relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2",
                node.status === "completed" && "border-emerald-400 bg-emerald-400",
                node.status === "current" && "border-teal-300 bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.45)]",
                node.status === "pending" && "border-amber-400 bg-amber-400/40",
                node.status === "upcoming" && "border-zinc-600 bg-zinc-800",
              )}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "rounded-xl border px-3 py-2",
                  STATUS_STYLE[node.status],
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{node.stageName}</p>
                  <span className="text-[9px] uppercase tracking-wide opacity-80">{node.status}</span>
                </div>
                {node.subStages.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {node.subStages.map((sub) => (
                      <span
                        key={sub.subStageCode}
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[10px]",
                          STATUS_STYLE[sub.status],
                        )}
                      >
                        {sub.subStageName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {nextNode && (
        <Button
          size="sm"
          className="mt-4"
          onClick={() => onAdvance(nextNode.stageCode)}
        >
          Advance to {nextNode.stageName}
        </Button>
      )}

      {visualization.recentTransitions.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Recent transitions
          </p>
          {visualization.recentTransitions.slice(0, 4).map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-white/10 bg-zinc-950/40 px-2.5 py-2 text-[11px] text-zinc-300"
            >
              <p className="font-medium text-zinc-100">
                {t.previousStageCode} → {t.currentStageCode}
              </p>
              <p className="text-zinc-400">
                {t.reason} · {new Date(t.occurredOn).toLocaleString()} · {t.actorId}
              </p>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Workflow events
          </p>
          {events.map((e) => (
            <p key={e.id} className="text-[11px] text-zinc-400">
              <span className="text-teal-300">{e.eventType}</span> · {e.title}
            </p>
          ))}
        </div>
      )}
    </OwGlassPanel>
  );
}
