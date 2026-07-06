"use client";

import { SLA_BREACH_ACTION_LABELS } from "@/constants/workflow-engine";
import {
  getEscalationDefinitions,
  getWorkflowEvents,
  getWorkflowSlaDefinitions,
} from "@/lib/workflow-engine/workflow-store";
import { WorkflowEngineShell } from "@/components/catalyst-one/workflow-engine/workflow-engine-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function WorkflowEventsView() {
  const events = getWorkflowEvents();
  const slas = getWorkflowSlaDefinitions();
  const escalations = getEscalationDefinitions();

  return (
    <WorkflowEngineShell
      title="Events & SLA"
      description="Event definitions, SLA and escalation metadata — stored only, not enforced."
    >
      <div className="space-y-6">
        <Card className="glass-card overflow-hidden border-border/60">
          <CardHeader><CardTitle className="text-base">Event Definitions</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Payload Schema</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.eventCode}</TableCell>
                    <TableCell className="text-xs font-medium">{e.eventName}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{e.payloadSchemaRef ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden border-border/60">
          <CardHeader><CardTitle className="text-base">SLA Definitions</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Target (hrs)</TableHead>
                  <TableHead>Warning %</TableHead>
                  <TableHead>Breach Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slas.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.slaCode}</TableCell>
                    <TableCell className="text-xs">{s.label}</TableCell>
                    <TableCell className="text-xs">{s.targetDurationHours}</TableCell>
                    <TableCell className="text-xs">{s.warningThresholdPercent}%</TableCell>
                    <TableCell className="text-xs">{SLA_BREACH_ACTION_LABELS[s.breachAction]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden border-border/60">
          <CardHeader><CardTitle className="text-base">Escalation Definitions</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Trigger (hrs)</TableHead>
                  <TableHead>Escalate To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalations.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.escalationCode}</TableCell>
                    <TableCell className="text-xs">{e.label}</TableCell>
                    <TableCell className="text-xs">{e.triggerAfterHours}</TableCell>
                    <TableCell className="font-mono text-[10px]">{e.escalateToRoleRef ?? "—"}</TableCell>
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
