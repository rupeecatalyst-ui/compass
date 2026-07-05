"use client";

import { Plus } from "lucide-react";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { CustomerMasterTable } from "@/components/catalyst-one/customer-master-table";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <CatalystBranding variant="compact" />
          <PageHeader
            title="Customer Master"
            description="Manage and track all Rupee Catalyst loan customers"
          />
        </div>
        <Button className="shrink-0 self-start">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <CustomerMasterTable />
    </div>
  );
}
