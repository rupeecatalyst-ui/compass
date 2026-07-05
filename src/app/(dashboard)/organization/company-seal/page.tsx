"use client";

import { CompanySealView } from "@/components/catalyst-one/organization/company-seal-view";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";

export default function CompanySealPage() {
  return (
    <OrganizationPageShell
      title="Company Seal"
      description="Official company seal preview and version history"
    >
      <CompanySealView />
    </OrganizationPageShell>
  );
}
