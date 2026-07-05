"use client";

import { CompanyProfileForm } from "@/components/catalyst-one/organization/company-profile-form";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";

export default function CompanyProfilePage() {
  return (
    <OrganizationPageShell
      title="Company Profile"
      description="Legal identity, registrations, and contact details for Rupee Catalyst"
    >
      <CompanyProfileForm />
    </OrganizationPageShell>
  );
}
