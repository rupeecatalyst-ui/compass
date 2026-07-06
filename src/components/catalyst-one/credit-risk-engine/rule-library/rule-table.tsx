"use client";

import Link from "next/link";
import { Eye, FlaskConical, GitBranch, Link2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  formatRuleVersion,
  RULE_DATA_TYPE_LABELS,
  RULE_OPERATOR_LABELS,
} from "@/constants/rule-library";
import type { RuleLibraryVersion } from "@/types/rule-library";
import { RuleCategoryBadge, RuleScopeBadge, RuleStatusBadge, RuleTypeBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-category-badge";
import { RuleSeverityBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-severity-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RuleTableProps {
  rules: RuleLibraryVersion[];
}

export function RuleTable({ rules }: RuleTableProps) {
  return (
    <Card className="glass-card overflow-hidden border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Operator</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-mono text-xs">{rule.ruleCode}</TableCell>
              <TableCell className="max-w-[12rem] truncate text-xs font-medium">
                {rule.ruleName}
              </TableCell>
              <TableCell>
                <RuleScopeBadge scope={rule.ruleScope} />
              </TableCell>
              <TableCell>
                <RuleTypeBadge ruleType={rule.ruleType} />
              </TableCell>
              <TableCell>
                <RuleSeverityBadge severity={rule.ruleSeverity} />
              </TableCell>
              <TableCell>
                <RuleCategoryBadge categoryId={rule.categoryId} />
              </TableCell>
              <TableCell className="text-xs">{RULE_OPERATOR_LABELS[rule.operator]}</TableCell>
              <TableCell className="max-w-[8rem] truncate font-mono text-xs">
                {rule.value}
                <span className="ml-1 text-muted-foreground">
                  ({RULE_DATA_TYPE_LABELS[rule.dataType]})
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {formatRuleVersion(rule.majorVersion, rule.minorVersion)}
              </TableCell>
              <TableCell>
                <RuleStatusBadge status={rule.status} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={`${ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}/${rule.ruleId}`} title="View">
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={`${ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}/${rule.ruleId}?tab=dependencies`} title="Dependencies">
                      <Link2 className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={`${ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}/${rule.ruleId}?tab=versions`} title="Versions">
                      <GitBranch className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={`${ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}/${rule.ruleId}?tab=simulator`} title="Simulator">
                      <FlaskConical className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
