"use client";

import {
  DOCUMENTATION_STATUS_DESCRIPTIONS,
  SAGE_INTEGRATION_RESERVED,
} from "@/constants/enterprise-architecture";
import { getEnterpriseRegistry } from "@/lib/enterprise-architecture/registry-store";
import type { DocumentationStatus } from "@/types/enterprise-architecture";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import { DocumentationStatusBadge } from "@/components/catalyst-one/architecture/documentation-status-badge";
import { StatusPill } from "@/components/design-system/status-pill";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_ORDER: DocumentationStatus[] = [
  "no_documentation",
  "draft",
  "review",
  "published",
  "outdated",
];

export function DocumentationView() {
  const registry = getEnterpriseRegistry();

  const byStatus = STATUS_ORDER.map((status) => ({
    status,
    count: registry.filter((r) => r.documentationStatus === status).length,
  }));

  return (
    <ArchitectureShell
      title="Documentation Readiness"
      description="Prepares the platform for SAGE Knowledge Hub integration (reserved)."
    >
      <div className="space-y-6">
        {SAGE_INTEGRATION_RESERVED && (
          <Card className="glass-card border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                SAGE Integration
                <StatusPill variant="muted">Reserved</StatusPill>
              </CardTitle>
              <CardDescription>
                Documentation status model is ready. SAGE Knowledge Hub connection is a future module — no runtime integration in this sprint.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {byStatus.map(({ status, count }) => (
            <Card key={status} className="glass-card border-border/60">
              <CardContent className="p-4">
                <DocumentationStatusBadge status={status} />
                <p className="mt-2 text-2xl font-bold">{count}</p>
                <p className="text-[10px] text-muted-foreground">
                  {DOCUMENTATION_STATUS_DESCRIPTIONS[status]}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-card overflow-hidden border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enterprise ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Documentation Status</TableHead>
                <TableHead>SAGE ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registry.map((record) => (
                <TableRow key={record.enterpriseId}>
                  <TableCell className="font-mono text-xs">{record.enterpriseId}</TableCell>
                  <TableCell className="text-xs font-medium">{record.name}</TableCell>
                  <TableCell className="text-xs capitalize">{record.type}</TableCell>
                  <TableCell>
                    <DocumentationStatusBadge status={record.documentationStatus} />
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {record.sageId ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </ArchitectureShell>
  );
}
