import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";
import { CccWorkspace } from "@/components/catalyst-one/corporate-compliance-center/ccc-workspace";

/**
 * CO-CCC-001 — Corporate Compliance Center hub.
 * Organization Documents remains the authoring surface; CCC is the compliance desk SSOT.
 */
export default function CorporateComplianceCenterPage() {
  return (
    <OrganizationPageShell
      title="Corporate Compliance Center"
      description="Enterprise compliance desk — legal entities, repository views, institution requirements, packages, and document dispatch."
      className="space-y-4"
    >
      <CccWorkspace />
    </OrganizationPageShell>
  );
}
