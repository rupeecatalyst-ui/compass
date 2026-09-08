"use client";

import { useEffect, useState } from "react";
import { EmployeePwaRecordCard } from "@/components/catalyst-one/employee-pwa/employee-pwa-record-card";
import { EMPLOYEE_PWA_LIST_ORDER } from "@/constants/employee-pwa";
import { employeePwaJson } from "@/lib/employee-pwa/api";
import {
  formatEmployeePwaAmount,
  formatEmployeePwaDate,
  formatEmployeePwaLastAction,
  formatEmployeePwaSourceIdentity,
} from "@/lib/employee-pwa/source-identity";

type OpportunityRow = {
  id: string;
  primaryContactName?: string | null;
  companyName?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  currencyCode?: string | null;
  sourceCode?: string | null;
  sourceContactName?: string | null;
  relationshipManagerName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lifecycleStatus?: string | null;
};

export function EmployeePwaOpportunities() {
  const [items, setItems] = useState<OpportunityRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void employeePwaJson<{ items?: OpportunityRow[] }>(
      `/api/enterprise-opportunities?${EMPLOYEE_PWA_LIST_ORDER.opportunityQuery}&limit=40`,
    )
      .then((data) => setItems(data.items ?? []))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div data-employee-pwa-opportunity-list="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Opportunities</h1>
      <p className="text-xs text-muted-foreground">Newest first · created date is the default order</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {items.map((row) => (
        <EmployeePwaRecordCard
          key={row.id}
          href={`/pwa/work/opportunities/${row.id}`}
          title={row.primaryContactName || row.companyName || "Opportunity"}
          badge={row.lifecycleStatus || undefined}
          lines={[
            row.productLabel || "Product not specified",
            formatEmployeePwaAmount(row.requestedAmount, row.currencyCode || "INR"),
            formatEmployeePwaSourceIdentity(row),
            `Created ${formatEmployeePwaDate(row.createdAt)}`,
            formatEmployeePwaLastAction({ updatedAt: row.updatedAt }),
          ]}
        />
      ))}
    </div>
  );
}
