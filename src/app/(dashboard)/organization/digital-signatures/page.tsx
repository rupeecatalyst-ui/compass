"use client";

import { DigitalSignaturesGrid } from "@/components/catalyst-one/organization/digital-signatures-grid";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";

export default function DigitalSignaturesPage() {
  return (
    <OrganizationPageShell
      title="Digital Signatures"
      description="DSC holders, signature previews, and expiry tracking"
    >
      <DigitalSignaturesGrid />
    </OrganizationPageShell>
  );
}
