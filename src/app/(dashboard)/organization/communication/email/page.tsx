"use client";

/**
 * CO-C1-OPERATIONAL-EMAIL-001 / CO-C1-EMAIL-CONFIG-001 —
 * Settings → Organization → Communication → Email Configuration.
 * Operational Catalyst One email (ECC) — separate from Marketing Engine.
 */

import Link from "next/link";
import { EnterpriseCommunicationCenterAdmin } from "@/components/catalyst-one/admin/enterprise-communication/enterprise-communication-center-admin";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";
import { OPERATIONAL_EMAIL_TEMPLATE_CATALOG } from "@/constants/enterprise-communication-center";
import { ROUTES } from "@/constants/routes";

export default function OrganizationCommunicationEmailPage() {
  return (
    <OrganizationPageShell
      title="Email Configuration"
      description="Operational Catalyst One email for Customers, Wealth Partners, Lenders, and Internal Employees. Separate from Marketing campaign senders."
    >
      <div className="mb-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Settings → Organization → Communication → Email Configuration ·{" "}
          <Link
            href={ROUTES.ADMIN_ENTERPRISE_COMMUNICATION}
            className="text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
          >
            Also available under Administration
          </Link>
          . Marketing campaign email remains under Marketing Settings.
        </p>
        <div className="rounded-xl border border-border/70 bg-card/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Operational templates (extensible catalogue)
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {OPERATIONAL_EMAIL_TEMPLATE_CATALOG.filter((t) => t.active).map((t) => (
              <li
                key={t.code}
                className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5"
              >
                <p className="text-xs font-medium text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <EnterpriseCommunicationCenterAdmin />
    </OrganizationPageShell>
  );
}
