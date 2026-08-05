"use client";

/**
 * CO-MASTER-REGION-001 — Enterprise Region Master (Geography SSOT).
 * Administration → Masters → Geography → Regions
 */

import { listEnterpriseRegionMasterOptions } from "@/constants/enterprise-region-master";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusPill } from "@/components/design-system/status-pill";

export function EnterpriseRegionMasterAdmin() {
  const regions = listEnterpriseRegionMasterOptions();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Enterprise Region Master"
        description="Geography SSOT for Catalyst One — exactly four regions. Consumed by Lender Employees, Contacts, and dependent City / Branch cascades."
      />
      <div className="flex flex-wrap gap-2">
        <StatusPill variant="success">SSOT</StatusPill>
        <StatusPill variant="muted">CO-MASTER-REGION-001</StatusPill>
        <StatusPill variant="muted">Frozen · No free text · No duplicates</StatusPill>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Code</th>
              <th className="px-3 py-2 font-semibold">Label</th>
              <th className="px-3 py-2 font-semibold">Sort</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">State coverage (cascade)</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-2 font-semibold">{r.label}</td>
                <td className="px-3 py-2 tabular-nums">{r.sortOrder}</td>
                <td className="px-3 py-2">
                  <StatusPill variant="success">Active</StatusPill>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.stateCodes.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Dropdown values are limited to North, South, East, and West. Legacy lender-scoped ids
        (e.g. hdfc-west) resolve to these labels for display without mutating stored employee
        records until an operator saves an edit.
      </p>
    </div>
  );
}
