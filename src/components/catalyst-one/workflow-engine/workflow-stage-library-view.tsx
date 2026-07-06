"use client";

import { getStageLibrary, getSubStageLibrary } from "@/lib/workflow-engine/workflow-store";
import { WorkflowEngineShell } from "@/components/catalyst-one/workflow-engine/workflow-engine-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function WorkflowStageLibraryView() {
  const stages = getStageLibrary();
  const subStages = getSubStageLibrary();
  const stageName = (id: string) => stages.find((s) => s.id === id)?.stageName ?? id;

  return (
    <WorkflowEngineShell
      title="Stage Library"
      description="Reusable stage and sub-stage masters — module-agnostic platform vocabulary."
    >
      <div className="space-y-6">
        <Card className="glass-card overflow-hidden border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Stages</CardTitle>
            <CardDescription>{stages.length} reusable stages</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.stageCode}</TableCell>
                    <TableCell className="text-xs font-medium">{s.stageName}</TableCell>
                    <TableCell className="text-xs">{s.category}</TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">{s.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Sub-Stages</CardTitle>
            <CardDescription>{subStages.length} reusable sub-stages</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent Stage</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subStages.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.subStageCode}</TableCell>
                    <TableCell className="text-xs font-medium">{s.subStageName}</TableCell>
                    <TableCell className="text-xs">{stageName(s.parentStageId)}</TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">{s.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </WorkflowEngineShell>
  );
}
