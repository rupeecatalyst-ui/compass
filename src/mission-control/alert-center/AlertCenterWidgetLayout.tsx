"use client";

import { WidgetShell } from "../shared/widget-framework";
import type { MissionControlWidget } from "../shared/widget-framework";
import {
  AlertDetailsPanel,
  AlertFilterBar,
  AlertStatistics,
  AlertSummaryStrip,
  AlertTimeline,
  QuickActions,
} from "./components";
import type { AlertCenterModel, AlertFilter, EnterpriseAlert } from "./types";

function meta(
  partial: Pick<MissionControlWidget, "id" | "title" | "category" | "size" | "priority" | "order" | "provider">,
): MissionControlWidget {
  return {
    ...partial,
    icon: "Bell",
    permissions: [{ id: "mc.alerts.view", resource: "mission-control.alerts", action: "view" }],
    component: () => null,
    visible: true,
    enabled: true,
  };
}

export function AlertCenterWidgetLayout({
  model,
  filter,
  selected,
  selectedId,
  onFilterChange,
  onSelect,
}: {
  model: AlertCenterModel;
  filter: AlertFilter;
  selected: EnterpriseAlert | null;
  selectedId?: string;
  onFilterChange: (next: AlertFilter) => void;
  onSelect: (alert: EnterpriseAlert) => void;
}) {
  return (
    <div className="space-y-4 md:space-y-5">
      <WidgetShell
        widget={meta({
          id: "ac-summary",
          title: "Alert Summary",
          category: "alerts",
          size: "full",
          priority: "critical",
          order: 10,
          provider: "alert-center.summary",
        })}
      >
        <AlertSummaryStrip summary={model.summary} embedded />
      </WidgetShell>

      <WidgetShell
        widget={meta({
          id: "ac-filters",
          title: "Alert Filters",
          category: "alerts",
          size: "full",
          priority: "high",
          order: 20,
          provider: "alert-center.filters",
        })}
      >
        <AlertFilterBar
          filter={filter}
          modules={model.modules}
          onChange={onFilterChange}
          embedded
        />
      </WidgetShell>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <WidgetShell
          widget={meta({
            id: "ac-timeline",
            title: "Alert Timeline",
            category: "alerts",
            size: "large",
            priority: "critical",
            order: 30,
            provider: "alert-center.timeline",
          })}
          className="min-h-[28rem]"
        >
          <AlertTimeline
            alerts={model.alerts}
            selectedId={selectedId}
            onSelect={onSelect}
            embedded
          />
        </WidgetShell>

        <div className="space-y-4">
          <WidgetShell
            widget={meta({
              id: "ac-details",
              title: "Alert Details",
              category: "alerts",
              size: "medium",
              priority: "high",
              order: 40,
              provider: "alert-center.details",
            })}
          >
            <AlertDetailsPanel alert={selected} embedded />
          </WidgetShell>

          <WidgetShell
            widget={meta({
              id: "ac-statistics",
              title: "Alert Statistics",
              category: "analytics",
              size: "medium",
              priority: "medium",
              order: 50,
              provider: "alert-center.statistics",
            })}
          >
            <AlertStatistics statistics={model.statistics} embedded />
          </WidgetShell>

          <WidgetShell
            widget={meta({
              id: "ac-quick-actions",
              title: "Quick Actions",
              category: "navigation",
              size: "medium",
              priority: "low",
              order: 60,
              provider: "alert-center.actions",
            })}
          >
            <QuickActions actions={model.quickActions} embedded />
          </WidgetShell>
        </div>
      </div>
    </div>
  );
}
