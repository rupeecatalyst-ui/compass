"use client";

import { useEffect, useState } from "react";
import { WorkspaceLoadingState } from "../shared/ui";
import { ExecutiveDecisionWorkspace } from "../executive-decision-workspace";
import {
  BusinessPerformanceSection,
  EnterpriseHealthSection,
  ExecutiveActionsSection,
  ExecutiveBriefCard,
  ExecutiveGreeting,
  ExecutiveStatusCards,
  QuickActions,
} from "./components";
import { createExecutiveBriefingService } from "./services";
import type { ExecutiveBriefingPageModel } from "./types";

/**
 * CO-SPRINT-094 — CHANAKYA Executive Decision Dashboard.
 * Briefing → Status cards → Business performance → Actions → Enterprise health
 * → Executive Decision Workspace (approved architecture mount).
 */
export function ExecutiveBriefingPage({
  userDisplayName = "Rahul",
}: {
  userDisplayName?: string;
}) {
  const [model, setModel] = useState<ExecutiveBriefingPageModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createExecutiveBriefingService()
      .getPageModel(userDisplayName)
      .then((page) => {
        if (!cancelled) setModel(page);
      });
    return () => {
      cancelled = true;
    };
  }, [userDisplayName]);

  if (!model) {
    return <WorkspaceLoadingState label="Preparing CHANAKYA Executive Briefing…" />;
  }

  return (
    <div className="space-y-6 pb-8 md:space-y-8">
      <ExecutiveGreeting greeting={model.greeting} />
      <ExecutiveBriefCard brief={model.brief} />
      <ExecutiveStatusCards cards={model.statusCards} />
      <BusinessPerformanceSection model={model.businessPerformance} />
      <ExecutiveActionsSection model={model.executiveActions} />
      <EnterpriseHealthSection indicators={model.enterpriseHealth} />
      <QuickActions actions={model.quickActions} />
      <ExecutiveDecisionWorkspace />
    </div>
  );
}
