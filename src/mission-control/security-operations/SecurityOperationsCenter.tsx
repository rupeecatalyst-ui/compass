"use client";

import { useEffect, useState } from "react";
import { WorkspaceLoadingState } from "../shared/ui";
import {
  ComplianceStatus,
  IdentityOverview,
  QuickActions,
  SecurityAlerts,
  SecurityDomainGrid,
  SecurityEventTimeline,
  SecurityHealthStrip,
  SecuritySummary,
  SessionSummary,
  ThreatCards,
} from "./components";
import { createSecurityProvider } from "./providers";
import type { SecurityOperationsModel } from "./types";

/**
 * Security Operations Center — executive security workspace.
 * UI architecture only. No auth, MFA, audit execution, APIs, or business logic.
 */
export function SecurityOperationsCenter() {
  const [model, setModel] = useState<SecurityOperationsModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createSecurityProvider()
      .getOperationsModel()
      .then((page) => {
        if (!cancelled) setModel(page);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!model) {
    return <WorkspaceLoadingState label="Preparing Security Operations Center…" />;
  }

  return (
    <div className="space-y-4 md:space-y-5" aria-label="Security Operations Center">
      <SecuritySummary summary={model.summary} />
      <SecurityHealthStrip indicators={model.health} />
      <SecurityDomainGrid domains={model.domains} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <SecurityEventTimeline events={model.events} />
          <ThreatCards threats={model.threats} />
        </div>
        <div className="space-y-4">
          <IdentityOverview identity={model.identity} />
          <SessionSummary sessions={model.sessions} />
          <ComplianceStatus compliance={model.compliance} />
          <SecurityAlerts alerts={model.alerts} />
          <QuickActions actions={model.quickActions} />
        </div>
      </div>
    </div>
  );
}
