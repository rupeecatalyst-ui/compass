"use client";

import { getCreditRiskAuditTrail } from "@/lib/credit-risk-engine/audit-store";
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

export function AuditTrailView() {
  const entries = getCreditRiskAuditTrail();

  return (
    <CreditRiskEngineShell
      title="Audit Trail"
      description="Immutable change log — who changed what, when, with old and new values."
    >
      <Card className="glass-card overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Policy</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Old → New</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(entry.timestamp).toLocaleString("en-IN")}
                </TableCell>
                <TableCell className="text-xs">{entry.actor}</TableCell>
                <TableCell className="max-w-[12rem] truncate text-xs">{entry.policyName}</TableCell>
                <TableCell className="font-mono text-xs">{entry.versionLabel}</TableCell>
                <TableCell className="text-xs">{entry.action}</TableCell>
                <TableCell className="font-mono text-xs">{entry.field ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {entry.oldValue || entry.newValue
                    ? `${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </CreditRiskEngineShell>
  );
}
