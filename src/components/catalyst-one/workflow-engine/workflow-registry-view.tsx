"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { WORKFLOW_LIFECYCLE_LABELS, WORKFLOW_STATUS_PILL_VARIANT } from "@/constants/workflow-engine";
import { searchWorkflowRegistry } from "@/lib/workflow-engine/workflow-store";
import { WorkflowEngineShell } from "@/components/catalyst-one/workflow-engine/workflow-engine-shell";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function WorkflowRegistryView() {
  const [query, setQuery] = useState("");
  const registry = useMemo(() => searchWorkflowRegistry(query), [query]);

  return (
    <WorkflowEngineShell
      title="Workflow Registry"
      description="Enterprise catalog of metadata-driven workflow definitions."
      showSearch
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search workflow code, name, module..."
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{registry.length} workflow definition(s)</p>
        <Card className="glass-card overflow-hidden border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stages</TableHead>
                <TableHead>Transitions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registry.map((row) => (
                <TableRow key={row.workflowId}>
                  <TableCell className="font-mono text-xs">{row.workflowCode}</TableCell>
                  <TableCell className="max-w-[12rem] truncate text-xs font-medium">{row.workflowName}</TableCell>
                  <TableCell className="text-xs">{row.module}</TableCell>
                  <TableCell className="text-xs">{row.category}</TableCell>
                  <TableCell className="font-mono text-xs">{row.latestVersionLabel}</TableCell>
                  <TableCell>
                    <StatusPill variant={WORKFLOW_STATUS_PILL_VARIANT[row.status]}>
                      {WORKFLOW_LIFECYCLE_LABELS[row.status]}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-xs">{row.stageCount}</TableCell>
                  <TableCell className="text-xs">{row.transitionCount}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                      <Link href={`${ROUTES.ADMIN_WORKFLOW_REGISTRY}/${row.workflowId}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </WorkflowEngineShell>
  );
}
