"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  OpportunityWorkspaceProvider,
  useOpportunityWorkspace,
  type WorkspaceFocus,
} from "./opportunity-workspace-context";
import { WorkspaceContactSummary } from "./workspace-contact-summary";
import { WorkspaceDialoguePanel } from "./workspace-dialogue-panel";
import { WorkspaceDocumentsPanel } from "./workspace-documents-panel";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceLifePanel } from "./workspace-life-panel";
import { WorkspaceTasksPanel } from "./workspace-tasks-panel";
import { WorkspaceWorkflowPanel } from "./workspace-workflow-panel";
import { WorkspaceOverviewPanel } from "./workspace-overview-panel";
import {
  WorkspaceProductPanel,
  WorkspaceRelationshipsPanel,
  WorkspaceRequirementPanel,
} from "./workspace-planning-panels";
import { WorkspaceChanakyaTabGuide } from "./workspace-chanakya-tab-guide";
import {
  OW_SECONDARY_TABS,
  OW_STRATEGIC_TABS,
  type OwStrategicTabId,
} from "./strategic-tabs";

function OpportunityWorkspaceShell() {
  const { opportunityId, focus, setFocus } = useOpportunityWorkspace();
  const [tab, setTab] = useState<OwStrategicTabId>("overview");

  // Sync when child panels request a WorkspaceFocus change (e.g. Workflow → Tasks).
  // Do not map overview → tab, so Customer / Product / Relationships stay selected.
  useEffect(() => {
    const map: Partial<Record<WorkspaceFocus, OwStrategicTabId>> = {
      life: "funding_strategy",
      documents: "documents",
      tasks: "tasks",
      dialogue: "notes",
      timeline: "timeline",
      workflow: "workflow",
      stage: "requirement",
    };
    const next = map[focus];
    if (next) setTab(next);
  }, [focus]);

  const openTab = (next: OwStrategicTabId) => {
    setTab(next);
    const focusMap: Partial<Record<OwStrategicTabId, WorkspaceFocus>> = {
      overview: "overview",
      customer: "overview",
      requirement: "stage",
      product: "overview",
      funding_strategy: "life",
      relationships: "overview",
      notes: "dialogue",
      timeline: "timeline",
      documents: "documents",
      tasks: "tasks",
      workflow: "workflow",
    };
    const mapped = focusMap[next];
    if (mapped) setFocus(mapped);
  };

  if (!opportunityId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-muted-foreground backdrop-blur-xl">
        Loading opportunity workspace…
      </div>
    );
  }

  return (
    <div className="dark relative flex h-[calc(100vh-4rem)] flex-col gap-3 overflow-hidden rounded-3xl border border-white/5 bg-zinc-950/40 p-3 sm:p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.16),transparent_55%)]" />

      <WorkspaceHeader />

      {/* Primary strategic tabs — single active workspace */}
      <div className="shrink-0 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {OW_STRATEGIC_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => openTab(t.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all",
                  active
                    ? "bg-teal-500 text-zinc-950 shadow-md shadow-teal-900/30"
                    : "border border-white/10 bg-zinc-950/50 text-zinc-300 hover:border-teal-500/40 hover:text-zinc-50",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Also
          </span>
          {OW_SECONDARY_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => openTab(t.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                  active
                    ? "bg-white/15 text-zinc-50"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="min-h-0 overflow-y-auto rounded-2xl">
          {tab === "overview" && <WorkspaceOverviewPanel onOpenTab={openTab} />}
          {tab === "customer" && <WorkspaceContactSummary />}
          {tab === "requirement" && <WorkspaceRequirementPanel />}
          {tab === "product" && <WorkspaceProductPanel />}
          {tab === "funding_strategy" && <WorkspaceLifePanel />}
          {tab === "relationships" && <WorkspaceRelationshipsPanel />}
          {tab === "notes" && <WorkspaceDialoguePanel />}
          {tab === "timeline" && <WorkspaceDialoguePanel />}
          {tab === "documents" && <WorkspaceDocumentsPanel />}
          {tab === "tasks" && <WorkspaceTasksPanel />}
          {tab === "workflow" && <WorkspaceWorkflowPanel />}
        </div>

        <div className="min-h-0 lg:sticky lg:top-0">
          <WorkspaceChanakyaTabGuide tab={tab} />
        </div>
      </div>
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
