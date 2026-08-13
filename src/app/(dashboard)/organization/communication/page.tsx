"use client";

/**
 * CO-C1-EMAIL-CONFIG-001 — Organization → Communication hub.
 */

import Link from "next/link";
import { Mail } from "lucide-react";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";
import { ROUTES } from "@/constants/routes";

export default function OrganizationCommunicationPage() {
  return (
    <OrganizationPageShell
      title="Communication"
      description="Organization-level operational communication configuration (not Marketing)."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={ROUTES.ORGANIZATION_COMMUNICATION_EMAIL}
          className="rounded-xl border border-border/70 bg-card/50 p-4 transition-colors hover:border-teal-500/40 hover:bg-teal-500/5"
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden />
            <h2 className="text-sm font-semibold">Email Configuration</h2>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Sender profiles, reply-to, delivery provider, corporate signature, operational
            templates, and connection status for Catalyst One transactional email.
          </p>
        </Link>
      </div>
    </OrganizationPageShell>
  );
}
