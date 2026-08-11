"use client";

import { OrganizationSettingsForm } from "@/components/catalyst-one/organization/organization-settings-form";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";

export default function OrganizationSettingsPage() {
  return (
    <OrganizationPageShell
      title="Organization Settings"
      description="Working calendar, locale, currency, and holiday defaults"
    >
      <OrganizationSettingsForm />
    </OrganizationPageShell>
  );
}
