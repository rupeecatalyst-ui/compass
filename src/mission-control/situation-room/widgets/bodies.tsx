"use client";

import type { WidgetComponentProps } from "../../shared/widget-framework";
import {
  CommandSummary,
  CriticalAlertsPanel,
  EnterpriseHealthStrip,
  LiveActivityFeed,
  OperationalDomainGrid,
  QuickNavigationPanel,
} from "../components";
import type { SituationRoomModel } from "../types";

function asSituationModel(payload: unknown): SituationRoomModel | null {
  if (!payload || typeof payload !== "object") return null;
  return payload as SituationRoomModel;
}

export function CommandSummaryWidget({ payload }: WidgetComponentProps) {
  const model = asSituationModel(payload);
  if (!model) return null;
  return <CommandSummary summary={model.commandSummary} embedded />;
}

export function EnterpriseHealthWidget({ payload }: WidgetComponentProps) {
  const model = asSituationModel(payload);
  if (!model) return null;
  return <EnterpriseHealthStrip indicators={model.healthIndicators} embedded />;
}

export function OperationalDomainsWidget({ payload }: WidgetComponentProps) {
  const model = asSituationModel(payload);
  if (!model) return null;
  return <OperationalDomainGrid domains={model.domains} embedded />;
}

export function CriticalAlertsWidget({ payload }: WidgetComponentProps) {
  const model = asSituationModel(payload);
  if (!model) return null;
  return <CriticalAlertsPanel alerts={model.criticalAlerts} embedded />;
}

export function ActivityFeedWidget({ payload }: WidgetComponentProps) {
  const model = asSituationModel(payload);
  if (!model) return null;
  return <LiveActivityFeed items={model.activity} embedded />;
}

export function QuickNavigationWidget({ payload }: WidgetComponentProps) {
  const model = asSituationModel(payload);
  if (!model) return null;
  return <QuickNavigationPanel items={model.quickNav} embedded />;
}
