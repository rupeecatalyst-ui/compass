"use client";

import { getReviewAuditForRule } from "@/lib/credit-risk-engine/rule-review-audit-store";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RuleReviewAuditPanelProps {
  ruleId: string;
}

export function RuleReviewAuditPanel({ ruleId }: RuleReviewAuditPanelProps) {
  const entries = getReviewAuditForRule(ruleId);

  if (entries.length === 0) return null;

  return (
    <Card className="glass-card overflow-hidden border-border/60">
      <div className="border-b border-border/60 px-4 py-3">
        <h4 className="text-sm font-semibold">Review Audit</h4>
        <p className="text-xs text-muted-foreground">
          Governance reviews never auto-deactivate rules. This audit captures who reviewed, when, comments and the next review date.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reviewed On</TableHead>
            <TableHead>Reviewed By</TableHead>
            <TableHead>Next Review Date</TableHead>
            <TableHead>Comments</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-xs">
                {new Date(entry.reviewedOn).toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-xs">{entry.reviewedBy}</TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                {new Date(entry.nextReviewDate).toLocaleDateString("en-IN")}
              </TableCell>
              <TableCell className="max-w-[18rem] text-xs text-muted-foreground">
                {entry.comments ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

