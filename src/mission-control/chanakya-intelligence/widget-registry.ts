/**
 * CO-MC-002 — CHANAKYA Intelligence widget registry (2×2 + future slots).
 */

import type { MissionControlWidget } from "../shared/widget-framework";
import {
  GalaxyViewWidget,
  HeatMapWidget,
  PulseMonitorWidget,
  RiverFlowWidget,
} from "./widgets";

export const CHANAKYA_INTELLIGENCE_WIDGET_IDS = {
  galaxy: "ci-galaxy-view",
  river: "ci-river-flow",
  heat: "ci-heat-map",
  pulse: "ci-pulse-monitor",
} as const;

export function createChanakyaIntelligenceWidgets(): MissionControlWidget[] {
  return [
    {
      id: CHANAKYA_INTELLIGENCE_WIDGET_IDS.galaxy,
      title: "Galaxy View",
      category: "operations",
      icon: "Sparkles",
      size: "large",
      priority: "critical",
      permissions: [
        {
          id: "mc.chanakya-intelligence.view",
          resource: "mission-control.chanakya-intelligence",
          action: "view",
        },
      ],
      provider: "chanakya-intelligence.galaxy",
      component: GalaxyViewWidget,
      order: 10,
      visible: true,
      enabled: true,
      description: "Enterprise portfolio nodes — health-coloured concentrations",
    },
    {
      id: CHANAKYA_INTELLIGENCE_WIDGET_IDS.river,
      title: "River Flow",
      category: "operations",
      icon: "GitBranch",
      size: "large",
      priority: "critical",
      permissions: [
        {
          id: "mc.chanakya-intelligence.view",
          resource: "mission-control.chanakya-intelligence",
          action: "view",
        },
      ],
      provider: "chanakya-intelligence.river",
      component: RiverFlowWidget,
      order: 20,
      visible: true,
      enabled: true,
      description: "Operational stage flow — volume, drop-off, bottlenecks",
    },
    {
      id: CHANAKYA_INTELLIGENCE_WIDGET_IDS.heat,
      title: "Heat Map",
      category: "analytics",
      icon: "Grid2x2",
      size: "large",
      priority: "high",
      permissions: [
        {
          id: "mc.chanakya-intelligence.view",
          resource: "mission-control.chanakya-intelligence",
          action: "view",
        },
      ],
      provider: "chanakya-intelligence.heat",
      component: HeatMapWidget,
      order: 30,
      visible: true,
      enabled: true,
      description: "Enterprise performance matrix — drill into cells",
    },
    {
      id: CHANAKYA_INTELLIGENCE_WIDGET_IDS.pulse,
      title: "Pulse Monitor",
      category: "health",
      icon: "Activity",
      size: "large",
      priority: "critical",
      permissions: [
        {
          id: "mc.chanakya-intelligence.view",
          resource: "mission-control.chanakya-intelligence",
          action: "view",
        },
      ],
      provider: "chanakya-intelligence.pulse",
      component: PulseMonitorWidget,
      order: 40,
      visible: true,
      enabled: true,
      description: "Real-time operational heartbeat — Activity Intelligence",
    },
  ];
}
