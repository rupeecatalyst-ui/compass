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

type DealRow = {
  id: string;
  primaryContactName?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  currencyCode?: string | null;
  sourceCode?: string | null;
  sourceContactName?: string | null;
  relationshipManagerName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastActivityTitle?: string | null;
  lastActivityAt?: string | null;
  grossStage?: string | null;
};

export function EmployeePwaDeals() {
  const [items, setItems] = useState<DealRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void employeePwaJson<{ items?: DealRow[] }>(
      `/api/enterprise-deals?${EMPLOYEE_PWA_LIST_ORDER.dealQuery}&pageSize=40&archived=false`,
    )
      .then((data) => setItems(data.items ?? (data as { deals?: DealRow[] }).deals ?? []))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div data-employee-pwa-deal-list="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Loan Deals</h1>
      <p className="text-xs text-muted-foreground">Newest first · last action is visible but does not reorder</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {items.map((row) => (
        <EmployeePwaRecordCard
          key={row.id}
          href={`/pwa/work/deals/${row.id}`}
          title={row.primaryContactName || "Deal"}
          badge={row.grossStage || undefined}
          lines={[
            row.productLabel || "Product not specified",
            formatEmployeePwaAmount(row.requestedAmount, row.currencyCode || "INR"),
            formatEmployeePwaSourceIdentity(row),
            `Created ${formatEmployeePwaDate(row.createdAt)}`,
            formatEmployeePwaLastAction({
              lastActionTitle: row.lastActivityTitle,
              lastActionAt: row.lastActivityAt,
              updatedAt: row.updatedAt,
            }),
          ]}
        />
      ))}
    </div>
  );
}
