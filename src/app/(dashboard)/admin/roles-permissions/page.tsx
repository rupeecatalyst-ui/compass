import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { RolesPermissionsWorkspace } from "@/components/catalyst-one/roles-permissions-engine";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusPill } from "@/components/design-system/status-pill";

/**
 * Catalyst One v1.0 — Roles & Permissions Engine
 * Administration → Roles & Permissions
 */
export default function AdminRolesPermissionsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <CatalystBranding variant="compact" />
          <StatusPill variant="default">Administration · Security Backbone</StatusPill>
        </div>
        <PageHeader
          title="Roles & Permissions"
          description="Enterprise access control — identity, roles, permissions, and platform access remain independent. Fully configurable and auditable."
        />
      </div>
      <RolesPermissionsWorkspace />
    </div>
  );
}
