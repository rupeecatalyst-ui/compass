"use client";

import { OrganizationSecurityForm } from "@/components/catalyst-one/organization/organization-security-form";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";

export default function OrganizationSecurityPage() {
  return (
    <OrganizationPageShell
      title="Organization Security"
      description="Feature flags, org defaults, branding overrides, and permissions guidance"
    >
      <OrganizationSecurityForm />
    </OrganizationPageShell>
  );
}
