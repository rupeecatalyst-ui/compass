"use client";

import { useEffect, useState } from "react";
import { WorkspaceLoadingState } from "../shared/ui";
import { ExecutiveDecisionWorkspace } from "../executive-decision-workspace";
import {
  ExecutiveBriefCard,
  ExecutiveGreeting,
  QuickActions,
} from "./components";
import { createExecutiveBriefingService } from "./services";
import type { ExecutiveBriefingPageModel } from "./types";

/**
 * CHANAKYA Executive Briefing — Mission Control landing experience.
 * Decision Workspace renders below the brief; Quick Actions remain at the footer.
 */
export function ExecutiveBriefingPage({
  userDisplayName = "Executive",
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
    <div className="space-y-6 md:space-y-8">
      <ExecutiveGreeting greeting={model.greeting} />
      <ExecutiveBriefCard brief={model.brief} />
      <ExecutiveDecisionWorkspace />
      <QuickActions actions={model.quickActions} />
    </div>
  );
}
