"use client";

import { useEffect, useState } from "react";
import { WorkspaceLoadingState } from "../shared/ui";
import { MC_PAGE_EYEBROW } from "../shared/ui/patterns";
import {
  EnterpriseHighlightsSection,
  ExecutiveWatchList,
  PendingApprovalsSection,
  PriorityActionsSection,
} from "./components";
import { createExecutiveDecisionWorkspaceProvider } from "./providers";
import type { ExecutiveDecisionWorkspaceModel } from "./types";

/**
 * Executive Decision Workspace — below CHANAKYA Executive Briefing.
 * Data via providers only; UI has no knowledge of data origin.
 */
export function ExecutiveDecisionWorkspace() {
  const [model, setModel] = useState<ExecutiveDecisionWorkspaceModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createExecutiveDecisionWorkspaceProvider()
      .getWorkspaceModel()
      .then((page) => {
        if (!cancelled) setModel(page);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!model) {
    return <WorkspaceLoadingState label="Preparing Executive Decision Workspace…" />;
  }

  return (
    <section
      className="space-y-8 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-transparent p-4 shadow-sm shadow-black/20 md:space-y-10 md:p-6"
      aria-label="Executive Decision Workspace"
    >
      <div className="border-b border-zinc-800/80 pb-4">
        <p className={`${MC_PAGE_EYEBROW} text-zinc-500`}>
          Decision Workspace
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
          Executive decisions at a glance
        </h2>
        <p className="mt-1 max-w-2xl text-xs text-zinc-500">
          Attention, approvals, monitoring, and positive developments — placeholder data via
          providers.
        </p>
      </div>

      <PriorityActionsSection actions={model.priorityActions} />
      <ExecutiveWatchList items={model.watchList} />
      <PendingApprovalsSection approvals={model.pendingApprovals} />
      <EnterpriseHighlightsSection highlights={model.highlights} />
    </section>
  );
}
