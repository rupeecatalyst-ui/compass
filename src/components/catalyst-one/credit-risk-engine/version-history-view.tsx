"use client";

import { getCreditRiskPolicies } from "@/lib/credit-risk-engine/policy-store";
import { formatPolicyVersion } from "@/constants/credit-risk-engine";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";
import { POLICY_LIFECYCLE_LABELS, POLICY_STATUS_PILL_VARIANT } from "@/constants/credit-risk-engine";

export function VersionHistoryView() {
  const versions = getCreditRiskPolicies()
    .slice()
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  return (
    <CreditRiskEngineShell
      title="Version History"
      description="Immutable version lineage — previous versions are never overwritten."
    >
      <Card className="glass-card overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>Published By</TableHead>
              <TableHead>Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="max-w-[14rem] truncate text-xs font-medium">
                  {v.policyName}
                </TableCell>
                <TableCell className="text-xs">{v.lenderName}</TableCell>
                <TableCell className="text-xs">{v.productName}</TableCell>
                <TableCell className="font-mono text-xs">
                  {formatPolicyVersion(v.majorVersion, v.minorVersion)}
                </TableCell>
                <TableCell>
                  <StatusPill variant={POLICY_STATUS_PILL_VARIANT[v.status]}>
                    {POLICY_LIFECYCLE_LABELS[v.status]}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-xs">{v.effectiveFrom ?? "—"}</TableCell>
                <TableCell className="text-xs">{v.effectiveTo ?? "—"}</TableCell>
                <TableCell className="text-xs">{v.publishedBy ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(v.lastModified).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </CreditRiskEngineShell>
  );
}
