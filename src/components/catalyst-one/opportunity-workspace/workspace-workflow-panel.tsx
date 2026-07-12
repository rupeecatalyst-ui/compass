"use client";

import { useMemo, useState } from "react";
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
import {
  getSelectedStageDetail,
  getWorkflowBlockers,
  placeholderEvaluateStageTransition,
  placeholderResolveBlocker,
  placeholderSelectStageDetail,
} from "./providers/workspace-placeholder-provider";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";

const STATUS_STYLE: Record<EwoeVisualizationStatus, string> = {
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  current: "border-teal-400/50 bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/40",
  pending: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  upcoming: "border-white/10 bg-zinc-950/40 text-zinc-400",
};

export function WorkspaceWorkflowPanel() {
  const {
    opportunityId,
    refresh,
    refreshKey,
    stageCode,
    documentStats,
    selectedLender,
    overdueTaskCount,
    setFocus,
  } = useOpportunityWorkspace();
  const [showBlockers, setShowBlockers] = useState(true);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [, bump] = useState(0);

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

  const blockers = useMemo(() => {
    if (!opportunityId) return [];
    return getWorkflowBlockers(opportunityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey, documentStats.pendingCount, selectedLender, overdueTaskCount]);

  const stageDetail = opportunityId ? getSelectedStageDetail(opportunityId) : null;

  const onAdvance = (toStageCode: string) => {
    if (!opportunityId) return;
    const evalResult = placeholderEvaluateStageTransition(opportunityId, toStageCode, {
      uploadedDocs: [...documentStats.uploaded],
      verifiedDocs: [...documentStats.verified],
      requiredDocs: documentStats.requiredDocs,
      hasLender: Boolean(selectedLender),
      overdueTaskCount,
    });
    if (!evalResult.allowed) {
      setTransitionError(`Transition blocked: ${evalResult.missing.join("; ")}`);
      bump((n) => n + 1);
      refresh();
      return;
    }
    setTransitionError(null);
    advanceEwoeWorkflowStage({
      opportunityId,
      toStageCode,
      reason: `Workspace advance to ${toStageCode}`,
      actorId: "workspace",
    });
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType: "workflow",
      title: "Workflow transition",
      description: `Advanced toward ${toStageCode}`,
      actorId: "workspace",
      expandablePayload: { toStageCode, source: "opportunity-workspace-workflow" },
    });
    refresh();
  };

  const completed = visualization.nodes.filter((n) => n.status === "completed");
  const pending = visualization.nodes.filter((n) => n.status === "pending");
  const upcoming = visualization.nodes.filter((n) => n.status === "upcoming");
  const current = visualization.nodes.find((n) => n.status === "current");
  const nextNode = pending[0];
  const activeBlockers = blockers.filter((b) => !b.resolved && b.id !== "blk-clear");

  return (
    <OwGlassPanel className="h-full">
      <OwPanelHeader
        title="Workflow · EWOE"
        badge={visualization.definitionCode ?? "EWOE"}
        description="Orchestration — current, completed, pending, upcoming"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[6rem]">
          <p className="text-[9px] uppercase tracking-wider text-zinc-400">Progress</p>
          <p className="text-2xl font-semibold tabular-nums text-zinc-50">
            {Math.round(visualization.progressRatio * 100)}%
          </p>
        </div>
        <div className="min-w-[8rem]">
          <p className="text-[9px] uppercase tracking-wider text-zinc-400">Current stage</p>
          <p className="text-sm font-medium capitalize text-teal-200">
            {(current?.stageName ?? visualization.currentStageCode ?? stageCode).replace(/_/g, " ")}
          </p>
        </div>
        <div className="min-w-[8rem]">
          <p className="text-[9px] uppercase tracking-wider text-zinc-400">Pending stage</p>
          <p className="text-sm font-medium capitalize text-zinc-300">
            {nextNode?.stageName ?? upcoming[0]?.stageName ?? "—"}
          </p>
        </div>
        {visualization.definitionVersion != null && (
          <div>
            <p className="text-[9px] uppercase tracking-wider text-zinc-400">Version</p>
            <p className="text-sm font-medium text-zinc-200">v{visualization.definitionVersion}</p>
          </div>
        )}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Completed stages" value={String(completed.length)} />
        <MiniStat label="Pending actions" value={String(pending.length)} />
        <MiniStat label="Triggered events" value={String(events.length)} />
      </div>

      <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            Pending actions / blockers
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setShowBlockers((v) => !v)}
          >
            {showBlockers ? "Hide" : "Show"}
          </Button>
        </div>
        {showBlockers && (
          <ul className="space-y-2 text-[11px] text-amber-100/90">
            {blockers.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className={b.resolved ? "line-through opacity-60" : ""}>· {b.label}</span>
                {!b.resolved && b.id !== "blk-clear" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px]"
                    onClick={() => {
                      if (!opportunityId) return;
                      placeholderResolveBlocker(opportunityId, b.id);
                      bump((n) => n + 1);
                      refresh();
                    }}
                  >
                    Resolve
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {transitionError && (
          <p className="mt-2 text-xs text-rose-300">{transitionError}</p>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setFocus("stage")}>
          Open stage details
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setFocus("tasks")}>
          Open task
        </Button>
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
              <button
                type="button"
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left",
                  STATUS_STYLE[node.status],
                  stageDetail === node.stageCode && "ring-2 ring-white/30",
                )}
                onClick={() => {
                  if (!opportunityId) return;
                  placeholderSelectStageDetail(
                    opportunityId,
                    stageDetail === node.stageCode ? null : node.stageCode,
                  );
                  bump((n) => n + 1);
                  refresh();
                }}
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
              </button>
              {stageDetail === node.stageCode && (
                <div className="mt-2 rounded-lg border border-white/10 bg-zinc-950/50 p-2 text-[11px] text-zinc-300">
                  <p>Stage code: {node.stageCode}</p>
                  <p>Status: {node.status}</p>
                  <p>Sub-stages: {node.subStages.length || "none"}</p>
                  {activeBlockers.length > 0 && node.status === "current" && (
                    <p className="mt-1 text-amber-200">
                      Active blockers: {activeBlockers.map((b) => b.label).join("; ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {nextNode && (
        <Button size="sm" className="mt-4" onClick={() => onAdvance(nextNode.stageCode)}>
          Trigger next transition → {nextNode.stageName}
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
            Triggered events
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/40 px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-zinc-100">{value}</p>
    </div>
  );
}
