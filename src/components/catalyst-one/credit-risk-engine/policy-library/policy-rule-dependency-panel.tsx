"use client";

import Link from "next/link";
import { ArrowUpCircle, GitBranch } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { POLICY_RULE_SECTION_LABELS } from "@/constants/policy-rule-sections";
import { getPolicyRuleUpgradeHints } from "@/lib/credit-risk-engine/policy-store";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PolicyRuleDependencyPanelProps {
  policyId: string;
}

export function PolicyRuleDependencyPanel({ policyId }: PolicyRuleDependencyPanelProps) {
  const hints = getPolicyRuleUpgradeHints(policyId);
  const upgradesAvailable = hints.filter((h) => h.upgradeRecommended).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="glass-card border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <GitBranch className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{hints.length}</p>
              <p className="text-xs text-muted-foreground">Rule references pinned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <ArrowUpCircle className="h-8 w-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">{upgradesAvailable}</p>
              <p className="text-xs text-muted-foreground">Upgrade recommendations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card overflow-hidden border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Policy → Rule → Version</CardTitle>
          <CardDescription>
            Published policies retain pinned rule versions. Adopt newer versions through controlled review and publish.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Policy Uses</TableHead>
                <TableHead>Latest Available</TableHead>
                <TableHead>Rule Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No rule references attached.
                  </TableCell>
                </TableRow>
              ) : (
                hints.map((hint) => (
                  <TableRow key={hint.ruleId}>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium">{hint.ruleName}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{hint.ruleCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {POLICY_RULE_SECTION_LABELS[hint.sectionId]}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{hint.pinnedVersion}</TableCell>
                    <TableCell className="font-mono text-xs">{hint.latestVersion}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {hint.ruleLastModified !== "—"
                        ? new Date(hint.ruleLastModified).toLocaleDateString("en-IN")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {hint.upgradeRecommended ? (
                        <StatusPill variant="warning">Upgrade available</StatusPill>
                      ) : (
                        <StatusPill variant="success">Current</StatusPill>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                        <Link href={`${ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}/${hint.ruleId}`}>
                          View Rule
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
