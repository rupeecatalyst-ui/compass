"use client";

import { getSeverityAuditForRule } from "@/lib/credit-risk-engine/rule-severity-audit-store";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RuleSeverityBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-severity-badge";

interface RuleSeverityAuditPanelProps {
  ruleId: string;
}

export function RuleSeverityAuditPanel({ ruleId }: RuleSeverityAuditPanelProps) {
  const entries = getSeverityAuditForRule(ruleId);

  if (entries.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card overflow-hidden border-border/60">
      <div className="border-b border-border/60 px-4 py-3">
        <h4 className="text-sm font-semibold">Severity Change Audit</h4>
        <p className="text-xs text-muted-foreground">Complete audit trail for severity reclassifications.</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Changed On</TableHead>
            <TableHead>Changed By</TableHead>
            <TableHead>Old Severity</TableHead>
            <TableHead>New Severity</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-xs">
                {new Date(entry.changedOn).toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-xs">{entry.changedBy}</TableCell>
              <TableCell className="text-xs">
                {entry.oldSeverity ? (
                  <RuleSeverityBadge severity={entry.oldSeverity} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <RuleSeverityBadge severity={entry.newSeverity} />
              </TableCell>
              <TableCell className="max-w-[14rem] text-xs text-muted-foreground">
                {entry.reason ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
