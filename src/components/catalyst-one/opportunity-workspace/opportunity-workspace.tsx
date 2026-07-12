"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  OpportunityWorkspaceProvider,
  useOpportunityWorkspace,
  type WorkspaceFocus,
} from "./opportunity-workspace-context";
import { WorkspaceChanakyaAdvisory } from "./workspace-chanakya-advisory";
import { WorkspaceChanakyaInsightsPanel } from "./workspace-chanakya-insights";
import { WorkspaceCompassCentrepiece } from "./workspace-compass-centrepiece";
import { WorkspaceContactSummary } from "./workspace-contact-summary";
import { WorkspaceDialoguePanel } from "./workspace-dialogue-panel";
import { WorkspaceDocumentsPanel } from "./workspace-documents-panel";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceKpiStrip } from "./workspace-kpi-strip";
import { WorkspaceLifePanel } from "./workspace-life-panel";
import { WorkspaceQuickActions } from "./workspace-quick-actions";
import { WorkspaceStagePanel } from "./workspace-stage-panel";
import { WorkspaceTasksPanel } from "./workspace-tasks-panel";
import { WorkspaceWorkflowPanel } from "./workspace-workflow-panel";

function OpportunityWorkspaceShell() {
  const { opportunityId, focus } = useOpportunityWorkspace();

  const contactRef = useRef<HTMLDivElement>(null);
  const lifeRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const dialogueRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);
  const chanakyaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map: Partial<Record<WorkspaceFocus, HTMLDivElement | null>> = {
      life: lifeRef.current,
      documents: documentsRef.current,
      tasks: tasksRef.current,
      dialogue: dialogueRef.current,
      timeline: dialogueRef.current,
      insights: insightsRef.current,
      stage: stageRef.current,
      workflow: workflowRef.current,
      overview: contactRef.current,
    };
    const el = map[focus];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focus]);

  if (!opportunityId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-muted-foreground backdrop-blur-xl">
        Loading opportunity workspace…
      </div>
    );
  }

  return (
    <div className="dark relative space-y-4 rounded-3xl border border-white/5 bg-zinc-950/40 p-3 pb-6 sm:p-4 md:p-5">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.16),transparent_55%)]" />

      <WorkspaceHeader />
      <WorkspaceCompassCentrepiece />
      <div ref={chanakyaRef}>
        <WorkspaceChanakyaAdvisory />
      </div>
      <WorkspaceKpiStrip />
      <WorkspaceQuickActions />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4 md:grid-cols-2">
          <div
            ref={contactRef}
            className={cn(focus === "overview" && "ring-2 ring-teal-400/40 rounded-2xl")}
          >
            <WorkspaceContactSummary />
          </div>
          <div
            ref={lifeRef}
            className={cn(focus === "life" && "ring-2 ring-emerald-400/40 rounded-2xl")}
          >
            <WorkspaceLifePanel />
          </div>
          <div
            ref={documentsRef}
            className={cn(focus === "documents" && "ring-2 ring-cyan-400/40 rounded-2xl")}
          >
            <WorkspaceDocumentsPanel />
          </div>
          <div
            ref={tasksRef}
            className={cn(focus === "tasks" && "ring-2 ring-amber-400/40 rounded-2xl")}
          >
            <WorkspaceTasksPanel />
          </div>
          <div
            ref={workflowRef}
            className={cn(
              "md:col-span-2",
              focus === "workflow" && "ring-2 ring-teal-400/40 rounded-2xl",
            )}
          >
            <WorkspaceWorkflowPanel />
          </div>
        </div>

        <div
          ref={insightsRef}
          className={cn(
            "xl:sticky xl:top-4 xl:self-start",
            focus === "insights" && "ring-2 ring-violet-400/40 rounded-2xl",
          )}
        >
          <WorkspaceChanakyaInsightsPanel />
        </div>
      </div>

      <div
        ref={dialogueRef}
        className={cn(
          (focus === "dialogue" || focus === "timeline") && "ring-2 ring-violet-400/40 rounded-2xl",
        )}
      >
        <WorkspaceDialoguePanel />
      </div>

      {focus === "stage" && (
        <div ref={stageRef} className="ring-2 ring-amber-400/40 rounded-2xl">
          <WorkspaceStagePanel />
        </div>
      )}
    </div>
  );
}

export function OpportunityWorkspace() {
  return (
    <OpportunityWorkspaceProvider>
      <OpportunityWorkspaceShell />
    </OpportunityWorkspaceProvider>
  );
}
