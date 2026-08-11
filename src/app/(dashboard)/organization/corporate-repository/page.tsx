"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { CorporateRepositoryTable } from "@/components/catalyst-one/organization/corporate-repository-table";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";

export default function CorporateRepositoryPage() {
  return (
    <OrganizationPageShell
      title="Corporate Repository"
      description="Centralized storage for MOA, AOA, registrations, board resolutions, and compliance documents."
      actions={
        <Button className="shrink-0" disabled>
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">
        Enterprise SSOT:{" "}
        <Link href={ROUTES.ORGANIZATION_COMPLIANCE_CENTER} className="text-primary underline">
          Corporate Compliance Center
        </Link>
      </p>
      <CorporateRepositoryTable />
    </OrganizationPageShell>
  );
}
