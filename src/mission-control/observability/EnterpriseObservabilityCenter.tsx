"use client";

import { useEffect, useState } from "react";
import { WorkspaceLoadingState } from "../shared/ui";
import {
  AvailabilityPanel,
  BackgroundJobsPanel,
  DependenciesPanel,
  EngineHealthGrid,
  ErrorTimeline,
  ObservabilitySummary,
  PerformanceOverview,
  PlatformHealthStrip,
  ProviderHealthPanel,
  QueuesPanel,
  ServiceStatusPanel,
} from "./components";
import { createObservabilityCenterProvider } from "./providers";
import type { ObservabilityCenterModel } from "./types";

/**
 * Enterprise Observability Center — executive observability workspace.
 * UI architecture only. No telemetry, metrics collection, APIs, or databases.
 */
export function EnterpriseObservabilityCenter() {
  const [model, setModel] = useState<ObservabilityCenterModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createObservabilityCenterProvider()
      .getObservabilityModel()
      .then((page) => {
        if (!cancelled) setModel(page);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!model) {
    return <WorkspaceLoadingState label="Preparing Enterprise Observability Center…" />;
  }

  return (
    <div className="space-y-4 md:space-y-5" aria-label="Enterprise Observability Center">
      <ObservabilitySummary summary={model.summary} />
      <PlatformHealthStrip indicators={model.platformHealth} />
      <EngineHealthGrid engines={model.engines} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ServiceStatusPanel services={model.services} />
        <PerformanceOverview metrics={model.performance} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <ErrorTimeline events={model.errors} />
          <BackgroundJobsPanel jobs={model.jobs} />
          <QueuesPanel queues={model.queues} />
        </div>
        <div className="space-y-4">
          <AvailabilityPanel availability={model.availability} />
          <DependenciesPanel dependencies={model.dependencies} />
          <ProviderHealthPanel providers={model.providers} />
        </div>
      </div>
    </div>
  );
}
