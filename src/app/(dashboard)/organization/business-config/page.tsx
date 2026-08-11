"use client";

import { BusinessConfigForm } from "@/components/catalyst-one/organization/business-config-form";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";

export default function OrganizationBusinessConfigPage() {
  return (
    <OrganizationPageShell
      title="Business Configuration"
      description="Products, geography, branches, and organizational hierarchy"
    >
      <BusinessConfigForm />
    </OrganizationPageShell>
  );
}
