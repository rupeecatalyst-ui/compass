"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { searchCreditRiskPolicies } from "@/lib/credit-risk-engine/policy-store";
import { PolicyCard } from "@/components/catalyst-one/credit-risk-engine/policy-card";
import { PolicyLibraryKpiGrid } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-library-kpi-grid";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { Button } from "@/components/ui/button";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";

export function PolicyLibraryView() {
  const [query, setQuery] = useState("");
  const policies = useMemo(
    () => (query ? searchCreditRiskPolicies(query) : searchCreditRiskPolicies("")),
    [query],
  );

  return (
    <CreditRiskEngineShell
      workspaceName="Policy Library"
      closeTo={WORKSPACE_CLOSE.CREDIT_RISK_ENGINE}
      title="Policy Library"
      description="Assemble reusable rules into lender-specific lending policies. Rule Library remains the single source of truth."
      showSearch
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search policy name, code, lender, product..."
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href={ROUTES.ADMIN_CREDIT_RISK_POLICY_BUILDER}>
            <Plus className="h-3.5 w-3.5" />
            New Policy
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <PolicyLibraryKpiGrid />
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {policies.length} polic{policies.length === 1 ? "y" : "ies"} · Only published versions are active at runtime
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {policies.map((policy) => (
              <PolicyCard key={policy.policyId} policy={policy} />
            ))}
          </div>
        </div>
      </div>
    </CreditRiskEngineShell>
  );
}
