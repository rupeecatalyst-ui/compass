"use client";

import { useMemo, useState } from "react";
import {
  evaluateAllCompliance,
  getEnterpriseRegistry,
} from "@/lib/enterprise-architecture/registry-store";
import { getComplianceRules } from "@/lib/enterprise-architecture/compliance-engine";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import {
  ComplianceScoreBadge,
  ComplianceVerdictBadge,
} from "@/components/catalyst-one/architecture/compliance-score-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ComplianceView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const evaluations = useMemo(() => evaluateAllCompliance(), []);
  const registry = getEnterpriseRegistry();
  const rules = getComplianceRules();
  const selected = evaluations.find((e) => e.enterpriseId === selectedId) ?? evaluations[0];
  const selectedRecord = registry.find((r) => r.enterpriseId === selected?.enterpriseId);

  return (
    <ArchitectureShell
      title="Architecture Compliance"
      description="Design-time compliance evaluation — extensible rule engine. No runtime enforcement."
    >
      <div className="space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Compliance Rules</CardTitle>
            <CardDescription>
              {rules.length} rules · Extensible via registerComplianceRule()
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {rules.map((rule) => (
                <span
                  key={rule.id}
                  className="rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs"
                >
                  {rule.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card overflow-hidden border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Artifact Evaluations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artifact</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Fails</TableHead>
                    <TableHead>Warnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations.map((ev) => {
                    const record = registry.find((r) => r.enterpriseId === ev.enterpriseId);
                    const fails = ev.results.filter((r) => r.verdict === "fail").length;
                    const warns = ev.results.filter((r) => r.verdict === "warning").length;
                    return (
                      <TableRow
                        key={ev.enterpriseId}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(ev.enterpriseId)}
                      >
                        <TableCell>
                          <p className="text-xs font-medium">{record?.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{ev.enterpriseId}</p>
                        </TableCell>
                        <TableCell>
                          <ComplianceScoreBadge score={ev.overallScore} />
                        </TableCell>
                        <TableCell className="text-xs">{fails}</TableCell>
                        <TableCell className="text-xs">{warns}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selected && selectedRecord && (
            <Card className="glass-card border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{selectedRecord.name}</CardTitle>
                <CardDescription>
                  {selected.enterpriseId} · Overall{" "}
                  <ComplianceScoreBadge score={selected.overallScore} />
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.results.map((result) => (
                  <div
                    key={result.ruleId}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{result.label}</p>
                      <p className="text-[10px] text-muted-foreground">{result.message}</p>
                    </div>
                    <ComplianceVerdictBadge verdict={result.verdict} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ArchitectureShell>
  );
}
