"use client";

import {
  formatPolicyVersion,
  POLICY_LIFECYCLE_LABELS,
  POLICY_STATUS_PILL_VARIANT,
} from "@/constants/credit-risk-engine";
import type { CreditRiskPolicySummary } from "@/types/credit-risk-engine";
import { StatusPill } from "@/components/design-system/status-pill";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PolicyVersionHistoryTableProps { versions: CreditRiskPolicySummary[]; }

export function PolicyVersionHistoryTable({ versions }: PolicyVersionHistoryTableProps) {

  return (
    <Card className="glass-card overflow-hidden border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell className="text-xs text-muted-foreground">
                {new Date(v.lastModified).toLocaleDateString("en-IN")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
