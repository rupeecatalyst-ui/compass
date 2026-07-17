import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";
import { OrganizationDocumentsWorkspace } from "@/components/catalyst-one/organization-documents";

/**
 * Catalyst One v1.0 — Organization Documents Registry
 * Administration → Organization Settings → Organization Documents
 */
export default function OrganizationDocumentsPage() {
  return (
    <OrganizationPageShell
      title="Organization Documents"
      description="Official corporate document repository — centrally stored, searchable, version-controlled, and shareable."
      className="space-y-4"
    >
      <OrganizationDocumentsWorkspace />
    </OrganizationPageShell>
  );
}
