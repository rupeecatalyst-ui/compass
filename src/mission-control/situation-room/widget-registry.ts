/**
 * Situation Room widget registration — metadata + pluggable bodies.
 */

import type { MissionControlWidget } from "../shared/widget-framework";
import { createWidgetRegistry } from "../shared/widget-framework";
import {
  ActivityFeedWidget,
  CommandSummaryWidget,
  CriticalAlertsWidget,
  EnterpriseHealthWidget,
  OperationalDomainsWidget,
  QuickNavigationWidget,
} from "./widgets/bodies";

export const SITUATION_ROOM_WIDGET_IDS = {
  commandSummary: "sr-command-summary",
  enterpriseHealth: "sr-enterprise-health",
  operationalDomains: "sr-operational-domains",
  criticalAlerts: "sr-critical-alerts",
  activityFeed: "sr-activity-feed",
  quickNavigation: "sr-quick-navigation",
} as const;

export function createSituationRoomWidgets(): MissionControlWidget[] {
  return [
    {
      id: SITUATION_ROOM_WIDGET_IDS.commandSummary,
      title: "Command Summary",
      category: "command",
      icon: "Radar",
      size: "full",
      priority: "critical",
      permissions: [
        { id: "mc.situation.view", resource: "mission-control.situation", action: "view" },
      ],
      provider: "situation-room.command",
      component: CommandSummaryWidget,
      order: 10,
      visible: true,
      enabled: true,
      description: "Top command summary for executive awareness",
      toolbarActions: [{ id: "refresh", label: "Refresh", disabled: true }],
    },
    {
      id: SITUATION_ROOM_WIDGET_IDS.enterpriseHealth,
      title: "Enterprise Health",
      category: "health",
      icon: "Activity",
      size: "full",
      priority: "high",
      permissions: [
        { id: "mc.situation.view", resource: "mission-control.situation", action: "view" },
      ],
      provider: "situation-room.health",
      component: EnterpriseHealthWidget,
      order: 20,
      visible: true,
      enabled: true,
      description: "Enterprise health strip",
      toolbarActions: [{ id: "details", label: "Details", disabled: true }],
    },
    {
      id: SITUATION_ROOM_WIDGET_IDS.operationalDomains,
      title: "Operational Domains",
      category: "operations",
      icon: "LayoutGrid",
      size: "large",
      priority: "high",
      permissions: [
        { id: "mc.situation.view", resource: "mission-control.situation", action: "view" },
      ],
      provider: "situation-room.domains",
      component: OperationalDomainsWidget,
      order: 30,
      visible: true,
      enabled: true,
      description: "Operational domain awareness grid",
    },
    {
      id: SITUATION_ROOM_WIDGET_IDS.criticalAlerts,
      title: "Critical Alerts",
      category: "alerts",
      icon: "Bell",
      size: "medium",
      priority: "critical",
      permissions: [
        { id: "mc.situation.view", resource: "mission-control.situation", action: "view" },
      ],
      provider: "situation-room.alerts",
      component: CriticalAlertsWidget,
      order: 40,
      visible: true,
      enabled: true,
      description: "Critical alerts panel",
      toolbarActions: [{ id: "ack-all", label: "Ack All", disabled: true }],
    },
    {
      id: SITUATION_ROOM_WIDGET_IDS.activityFeed,
      title: "Activity Feed",
      category: "activity",
      icon: "History",
      size: "large",
      priority: "medium",
      permissions: [
        { id: "mc.situation.view", resource: "mission-control.situation", action: "view" },
      ],
      provider: "situation-room.activity",
      component: ActivityFeedWidget,
      order: 50,
      visible: true,
      enabled: true,
      description: "Chronological live activity feed",
    },
    {
      id: SITUATION_ROOM_WIDGET_IDS.quickNavigation,
      title: "Quick Navigation",
      category: "navigation",
      icon: "Compass",
      size: "medium",
      priority: "low",
      permissions: [
        { id: "mc.situation.view", resource: "mission-control.situation", action: "view" },
      ],
      provider: "situation-room.navigation",
      component: QuickNavigationWidget,
      order: 60,
      visible: true,
      enabled: true,
      description: "Quick navigation to control surfaces",
    },
  ];
}

export function createSituationRoomWidgetRegistry() {
  return createWidgetRegistry(createSituationRoomWidgets());
}
