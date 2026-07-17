import { Suspense } from "react";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { EnterpriseUserList } from "@/components/catalyst-one/enterprise-user-management";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusPill } from "@/components/design-system/status-pill";

/**
 * Catalyst One v1.0 — User Management (Enterprise IAM)
 * Administration → Users
 * User Accounts are provisioned only from Directory Contacts via Platform Access.
 */
export default function AdminUsersPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <CatalystBranding variant="compact" />
          <StatusPill variant="default">Administration · Identity & Access</StatusPill>
        </div>
        <PageHeader
          title="Users"
          description="User Accounts are authentication objects linked to Directory Contacts. Use Grant Platform Access — never create users directly. Work with Roles and Access Profile; overrides are Advanced."
        />
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading users…</p>}>
        <EnterpriseUserList />
      </Suspense>
    </div>
  );
}
