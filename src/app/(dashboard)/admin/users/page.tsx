import { Suspense } from "react";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { PrismaUserAdminWorkspace } from "@/components/catalyst-one/enterprise-user-management/prisma-user-admin-workspace";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusPill } from "@/components/design-system/status-pill";

/**
 * CO-SPRINT-118 — User Management MVP
 * Prisma / Supabase SSOT (users table). Temporary password forces change on login.
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
          description="Create and manage login accounts persisted in PostgreSQL. New and reset passwords are temporary — users must change them before using Catalyst One."
        />
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading users…</p>}>
        <PrismaUserAdminWorkspace />
      </Suspense>
    </div>
  );
}
