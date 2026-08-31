"use client";

import { CompassAdvantageRulesWorkspace } from "@/components/catalyst-one/organization/compass-advantage-rules-workspace";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";

export default function CompassAdvantageRulesPage() {
  return (
    <OrganizationPageShell
      title="COMPASS Advantage Rules"
      description="Version-controlled commercial configuration. Super Admin / Product Owner only. Published schedules cannot be edited in place."
    >
      <CompassAdvantageRulesWorkspace />
    </OrganizationPageShell>
  );
}
