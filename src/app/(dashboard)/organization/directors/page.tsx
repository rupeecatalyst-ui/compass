"use client";

import { Plus } from "lucide-react";
import { DirectorsTable } from "@/components/catalyst-one/organization/directors-table";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";
import { Button } from "@/components/ui/button";

export default function DirectorsPage() {
  return (
    <OrganizationPageShell
      title="Directors"
      description="Director master — board members, identification, and document records"
      actions={
        <Button className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Director
        </Button>
      }
    >
      <DirectorsTable />
    </OrganizationPageShell>
  );
}
