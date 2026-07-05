"use client";

import { Upload } from "lucide-react";
import { CorporateRepositoryTable } from "@/components/catalyst-one/organization/corporate-repository-table";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";
import { Button } from "@/components/ui/button";

export default function CorporateRepositoryPage() {
  return (
    <OrganizationPageShell
      title="Corporate Repository"
      description="Centralized storage for MOA, AOA, registrations, board resolutions, and compliance documents"
      actions={
        <Button className="shrink-0" disabled>
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      }
    >
      <CorporateRepositoryTable />
    </OrganizationPageShell>
  );
}
