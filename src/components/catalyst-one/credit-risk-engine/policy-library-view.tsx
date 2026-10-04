"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { listDurablePolicies, type DurablePolicyRecord } from "@/lib/credit-risk-engine/durable-policy-admin";
import { PolicyCard } from "@/components/catalyst-one/credit-risk-engine/policy-card";
import { PolicyLibraryKpiGrid } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-library-kpi-grid";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { Button } from "@/components/ui/button";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";

export function PolicyLibraryView() {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<DurablePolicyRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void listDurablePolicies().then(rows => { if (active) setRecords(rows); })
      .catch(() => { if (active) setLoadError("Durable policies could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const policies = useMemo(
    () => records.filter(row => `${row.policyName} ${row.policyCode} ${row.lenderName} ${row.productName}`.toLowerCase().includes(query.trim().toLowerCase())),
    [query, records],
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
        <PolicyLibraryKpiGrid policies={records} />
        <div className="space-y-4">
          {loading && <p role="status">Loading durable policies…</p>}
          {loadError && <p role="alert" className="text-destructive">{loadError}</p>}
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
