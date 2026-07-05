"use client";

import { Plus } from "lucide-react";
import { BankAccountsGrid } from "@/components/catalyst-one/organization/bank-accounts-grid";
import { OrganizationPageShell } from "@/components/catalyst-one/organization/organization-page-shell";
import { Button } from "@/components/ui/button";

export default function BankAccountsPage() {
  return (
    <OrganizationPageShell
      title="Bank Accounts"
      description="Company banking details, IFSC codes, and cancelled cheque availability"
      actions={
        <Button className="shrink-0" disabled>
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      }
    >
      <BankAccountsGrid />
    </OrganizationPageShell>
  );
}
