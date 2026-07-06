"use client";

import { getPerformanceBudgets, getEnterpriseRegistry } from "@/lib/enterprise-architecture/registry-store";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PerformanceView() {
  const budgets = getPerformanceBudgets();
  const registry = getEnterpriseRegistry();

  return (
    <ArchitectureShell
      title="Performance Budgets"
      description="Design-time performance expectations — stored only, not enforced at runtime."
    >
      <div className="space-y-4">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Budget Model</CardTitle>
            <CardDescription>
              Each capability defines expected queries, API calls, cache usage, memory profile, response time, and event/sync operations. Enforcement is reserved for a future sprint.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass-card overflow-hidden border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artifact</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Queries</TableHead>
                <TableHead>API Calls</TableHead>
                <TableHead>Cache</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Response (ms)</TableHead>
                <TableHead>Async Events</TableHead>
                <TableHead>Sync Ops</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => {
                const artifact = registry.find((r) => r.enterpriseId === budget.enterpriseId);
                return (
                  <TableRow key={budget.id}>
                    <TableCell>
                      <p className="text-xs font-medium">{artifact?.name ?? "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{budget.enterpriseId}</p>
                    </TableCell>
                    <TableCell className="text-xs">{budget.label}</TableCell>
                    <TableCell className="text-xs">{budget.expectedQueries}</TableCell>
                    <TableCell className="text-xs">{budget.expectedApiCalls}</TableCell>
                    <TableCell className="text-xs">{budget.expectedCacheUsage}</TableCell>
                    <TableCell className="text-xs">{budget.expectedMemoryProfile}</TableCell>
                    <TableCell className="font-mono text-xs">{budget.expectedResponseTimeMs}</TableCell>
                    <TableCell className="text-xs">{budget.expectedAsyncEvents}</TableCell>
                    <TableCell className="text-xs">{budget.expectedSyncOperations}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Artifacts Without Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {registry
                .filter((r) => !r.performanceBudgetId)
                .map((r) => (
                  <li key={r.enterpriseId} className="font-mono text-xs">
                    {r.enterpriseId} — {r.name}
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ArchitectureShell>
  );
}
