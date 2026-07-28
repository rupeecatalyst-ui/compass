"use client";

import { useEffect, useState } from "react";
import { WorkspaceLoadingState } from "../shared/ui";
import { ExecutiveDecisionWorkspace } from "../executive-decision-workspace";
import { EnterpriseIntelligencePlatform } from "../enterprise-intelligence";
import {
  ExecutiveBriefCard,
  ExecutiveGreeting,
  QuickActions,
} from "./components";
import { MissionControlSnapshotBanner } from "./components/MissionControlSnapshotBanner";
import { createExecutiveBriefingService } from "./services";
import type { ExecutiveBriefingPageModel } from "./types";

/**
 * CO-SPRINT-094 / CO-ARCH-005 / CO-MC-002 — CHANAKYA Executive Intelligence Platform.
 * Loads certified Mission Control Snapshot only (no live heavy analytics on open).
 * Full-width cards · one per row · graph-first sections.
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
    return <WorkspaceLoadingState label="Loading Mission Control Snapshot…" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10 md:space-y-8">
      <MissionControlSnapshotBanner
        asOf={model.snapshotMeta?.asOf ?? model.brief.generatedAt}
        version={model.snapshotMeta?.version}
        source={model.snapshotMeta?.source}
      />
      <ExecutiveGreeting greeting={model.greeting} />
      <ExecutiveBriefCard brief={model.brief} />
      <EnterpriseIntelligencePlatform
        pack={model.enterpriseIntelligence ?? null}
      />
      <QuickActions actions={model.quickActions} />
      <ExecutiveDecisionWorkspace />
    </div>
  );
}
