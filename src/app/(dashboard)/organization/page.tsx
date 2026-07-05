"use client";

import { OrganizationDashboardPanels } from "@/components/catalyst-one/organization/organization-dashboard-panels";
import { OrganizationKpiGrid } from "@/components/catalyst-one/organization/organization-kpi-grid";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";

export default function OrganizationDashboardPage() {
  return (
    <OrganizationPageShell
      title="Organization Dashboard"
      description="Executive overview of Rupee Catalyst corporate records and internal documentation"
    >
      <OrganizationKpiGrid />
      <OrganizationDashboardPanels />
    </OrganizationPageShell>
  );
}
