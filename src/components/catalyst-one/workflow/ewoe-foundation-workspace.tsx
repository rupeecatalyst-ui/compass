"use client";

import { useEffect, useMemo, useState } from "react";
import {
  advanceEwoeWorkflowStage,
  getEwoeRegistrySnapshot,
  getEwoeWorkflowVisualization,
  initializeEwoeDefaultDefinitions,
  listEwoeEvents,
  listEwoeWorkflowDefinitions,
  startEwoeWorkflowInstance,
} from "@/lib/enterprise-workflow-orchestration-engine";
import { registerEcgSection, listEcgSections } from "@/lib/enterprise-interface-configuration-grants";
import type { EwoeVisualizationStatus } from "@/types/enterprise-workflow-orchestration-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEMO_OPP = "opp-ewoe-demo-001";

const STATUS_STYLE: Record<EwoeVisualizationStatus, string> = {
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  current: "border-teal-400/50 bg-teal-500/15 text-teal-900 dark:text-teal-100",
  pending: "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  upcoming: "border-border bg-muted/40 text-muted-foreground",
};

function ensureEcgWorkflowSection() {
  if (listEcgSections().some((s) => s.sectionCode === "ECG-EWOE-CONFIG")) return;
  registerEcgSection({
    sectionCode: "ECG-EWOE-CONFIG",
    sectionName: "EWOE Workflow Configuration",
    kind: "configuration",
    description:
      "Future ECG surface for stages, sub-stages, completion rules, triggers, validation, and escalation.",
    enabled: true,
    createdBy: "system",
  });
}

export function EwoeFoundationWorkspace() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    initializeEwoeDefaultDefinitions("ewoe-ui");
    ensureEcgWorkflowSection();
    startEwoeWorkflowInstance({
      opportunityId: DEMO_OPP,
      actorId: "ewoe-ui",
      stageCode: "intake",
    });
    setTick((t) => t + 1);
  }, []);

  const definitions = useMemo(() => {
    void tick;
    return listEwoeWorkflowDefinitions();
  }, [tick]);
  const visualization = useMemo(() => {
    void tick;
    return getEwoeWorkflowVisualization(DEMO_OPP);
  }, [tick]);
  const events = useMemo(() => {
    void tick;
    return listEwoeEvents(DEMO_OPP);
  }, [tick]);
  const snapshot = useMemo(() => {
    void tick;
    return getEwoeRegistrySnapshot();
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);

  const onAdvance = (toStageCode: string) => {
    advanceEwoeWorkflowStage({
      opportunityId: DEMO_OPP,
      toStageCode,
      reason: "EWOE foundation workspace advance",
      actorId: "ewoe-ui",
      syncEole: false,
    });
    refresh();
  };

  const next = visualization.nodes.find((n) => n.status === "pending");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          EWOE · SPR-004
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Enterprise Workflow Orchestration Engine
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Orchestration layer above EOLE. Coordinates stages, triggers (EDIE / ETE / ENCE / LIFE),
          Dialogue events, and Opportunity Intelligence progress — without replacing lifecycle
          ownership.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold">Workflow visualization</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {visualization.definitionCode} · v{visualization.definitionVersion} ·{" "}
            {Math.round(visualization.progressRatio * 100)}% complete
          </p>
          <div className="mt-4 space-y-3">
            {visualization.nodes.map((node) => (
              <div
                key={node.stageCode}
                className={cn("rounded-lg border px-3 py-2", STATUS_STYLE[node.status])}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{node.stageName}</p>
                  <span className="text-[10px] uppercase tracking-wide">{node.status}</span>
                </div>
                {node.subStages.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {node.subStages.map((s) => (
                      <span
                        key={s.subStageCode}
                        className={cn("rounded border px-1.5 py-0.5 text-[10px]", STATUS_STYLE[s.status])}
                      >
                        {s.subStageName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {next && (
            <Button size="sm" className="mt-4" onClick={() => onAdvance(next.stageCode)}>
              Advance to {next.stageName}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Definitions</h2>
            <ul className="mt-2 space-y-2 text-xs">
              {definitions.map((d) => (
                <li key={d.id} className="rounded-lg border bg-muted/40 p-2">
                  <p className="font-medium">{d.name}</p>
                  <p className="text-muted-foreground">
                    {d.definitionCode} · v{d.version} · {d.scope.productRef}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Registry snapshot</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Definitions</dt>
                <dd className="font-semibold">{snapshot.definitions.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Instances</dt>
                <dd className="font-semibold">{snapshot.instances.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Transitions</dt>
                <dd className="font-semibold">{snapshot.transitions.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Events</dt>
                <dd className="font-semibold">{snapshot.events.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Workflow events</h2>
        <div className="mt-2 space-y-2">
          {events.map((e) => (
            <div key={e.id} className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
              <p className="font-medium">
                {e.eventType} · {e.title}
              </p>
              <p className="text-muted-foreground">
                {e.description} · {new Date(e.occurredOn).toLocaleString()}
              </p>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground">No events yet — advance the workflow.</p>
          )}
        </div>
      </div>
    </div>
  );
}
