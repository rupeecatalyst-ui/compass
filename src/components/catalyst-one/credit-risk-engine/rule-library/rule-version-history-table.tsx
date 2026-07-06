"use client";

import { getRuleVersions } from "@/lib/credit-risk-engine/rule-store";
import {
  formatRuleVersion,
  RULE_OPERATOR_LABELS,
} from "@/constants/rule-library";
import { RuleStatusBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-category-badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RuleVersionHistoryTableProps {
  ruleId: string;
}

export function RuleVersionHistoryTable({ ruleId }: RuleVersionHistoryTableProps) {
  const versions = getRuleVersions(ruleId);

  return (
    <Card className="glass-card overflow-hidden border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Operator</TableHead>
            <TableHead>Value</TableHead>
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
                {formatRuleVersion(v.majorVersion, v.minorVersion)}
              </TableCell>
              <TableCell>
                <RuleStatusBadge status={v.status} />
              </TableCell>
              <TableCell className="text-xs">{RULE_OPERATOR_LABELS[v.operator]}</TableCell>
              <TableCell className="font-mono text-xs">{v.value}</TableCell>
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
  );
}
