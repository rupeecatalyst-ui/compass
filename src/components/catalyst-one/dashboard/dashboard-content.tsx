"use client";

import { DashboardToolbar } from "@/components/catalyst-one/dashboard/dashboard-toolbar";
import { ChanakyaBriefingWorkspace } from "@/components/catalyst-one/dashboard/chanakya-briefing";

/**
 * CF-CHANAKYA-006 — Default landing is the CHANAKYA Briefing Workspace.
 * Action-first briefing cards replace charts-first command centre layout.
 */
export function DashboardContent() {
  return (
    <div className="space-y-3 pb-3 w-full max-w-none">
      <DashboardToolbar />
      <ChanakyaBriefingWorkspace />
    </div>
  );
}
