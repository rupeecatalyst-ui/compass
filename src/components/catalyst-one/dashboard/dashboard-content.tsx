"use client";

import { DashboardToolbar } from "@/components/catalyst-one/dashboard/dashboard-toolbar";
import { ExecutiveKpiGrid } from "@/components/catalyst-one/dashboard/executive-kpi-grid";
import { LeadArrivalChart } from "@/components/catalyst-one/dashboard/lead-arrival-chart";
import { NewLoanFilesTable } from "@/components/catalyst-one/dashboard/new-loan-files-table";
import { PendingApprovalsPanel } from "@/components/catalyst-one/dashboard/pending-approvals-panel";
import { PipelineFunnel } from "@/components/catalyst-one/dashboard/pipeline-funnel";
import { PipelineProductTreemap } from "@/components/catalyst-one/dashboard/pipeline-product-treemap";
import { QuickActionsGrid } from "@/components/catalyst-one/dashboard/quick-actions-grid";
import { RmPerformancePanel } from "@/components/catalyst-one/dashboard/rm-performance-panel";
import { TargetAchievementPanel } from "@/components/catalyst-one/dashboard/target-achievement-panel";
import { TodaysFocus } from "@/components/catalyst-one/dashboard/todays-focus";
import { TodaysTasksWidget } from "@/components/catalyst-one/dashboard/todays-tasks-widget";
import { useDashboardPersona } from "@/hooks/use-dashboard-persona";
import { ChanakyaPanel } from "@/modules/intelligence/components";

export function DashboardContent() {
  const { config } = useDashboardPersona();

  return (
    <div className="space-y-2.5 pb-3 w-full max-w-none">
      <DashboardToolbar />
      <ChanakyaPanel mode="executive" variant="expanded" userName="Rahul" className="mb-1" />
      <TodaysFocus />
      <ExecutiveKpiGrid />

      <div className="grid gap-2.5 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-2.5">
          <LeadArrivalChart />
          <PipelineProductTreemap />
        </div>
        <div className="lg:col-span-5">
          <PipelineFunnel />
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <NewLoanFilesTable />
        </div>
        <div className="lg:col-span-3">
          <TodaysTasksWidget />
        </div>
        <div className="lg:col-span-4 space-y-2.5">
          <PendingApprovalsPanel />
          <RmPerformancePanel />
        </div>
      </div>

      {config.showTargetGauges && <TargetAchievementPanel />}

      <QuickActionsGrid />
    </div>
  );
}
