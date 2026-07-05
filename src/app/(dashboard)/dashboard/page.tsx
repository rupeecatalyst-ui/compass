"use client";

import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { KpiGrid } from "@/components/catalyst-one/kpi-grid";
import { LoanPipelineWorkflow } from "@/components/catalyst-one/loan-pipeline-workflow";
import { TodaysWorkGrid } from "@/components/catalyst-one/todays-work-grid";
import { ActivityTimeline } from "@/components/catalyst-one/activity-timeline";
import { StatusPill } from "@/components/design-system/status-pill";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <CatalystBranding />
        <StatusPill variant="success" className="self-start">Live · Jul 2026</StatusPill>
      </div>

      <KpiGrid />

      <LoanPipelineWorkflow />

      <div className="grid gap-8 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TodaysWorkGrid />
        </div>
        <div className="xl:col-span-2">
          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
}
