"use client";

import Link from "next/link";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";

export default function ProductConfigurationPage() {
  return (
    <OrganizationPageShell
      title="Product Configuration"
      description="Enterprise product commercial rules that COMPASS and other channels must consume."
    >
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">COMPASS Advantage Rules</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Configure product eligibility, amount ranges, percentage benefit, and fixed-value benefits.
          Published versions are immutable. COMPASS displays the Catalyst One calculation only.
        </p>
        <Button asChild className="mt-4">
          <Link href={ROUTES.ORGANIZATION_COMPASS_ADVANTAGE}>Open COMPASS Advantage Rules</Link>
        </Button>
      </div>
    </OrganizationPageShell>
  );
}
