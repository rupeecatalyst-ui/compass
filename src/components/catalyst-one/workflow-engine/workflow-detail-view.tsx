"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  SLA_BREACH_ACTION_LABELS,
  WORKFLOW_CONDITION_OPERATOR_LABELS,
  WORKFLOW_LIFECYCLE_LABELS,
  WORKFLOW_STATUS_PILL_VARIANT,
  formatWorkflowVersion,
} from "@/constants/workflow-engine";
import {
  getAssignmentStrategies,
  getAuditTrailForWorkflow,
  getEscalationDefinitions,
  getStageLibrary,
  getSubStageLibrary,
  getWorkflowEvents,
  getWorkflowSlaDefinitions,
  getWorkflowVersions,
  transitionWorkflowStatus,
  validateWorkflowDefinition,
} from "@/lib/workflow-engine/workflow-store";
import type { WorkflowDefinition } from "@/types/workflow-engine";
import { WorkflowEngineShell } from "@/components/catalyst-one/workflow-engine/workflow-engine-shell";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WorkflowDetailViewProps {
  workflow: WorkflowDefinition;
}

export function WorkflowDetailView({ workflow }: WorkflowDetailViewProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";
  const stages = getStageLibrary();
  const subStages = getSubStageLibrary();
  const events = getWorkflowEvents();
  const slas = getWorkflowSlaDefinitions();
  const escalations = getEscalationDefinitions();
  const strategies = getAssignmentStrategies();
  const warnings = validateWorkflowDefinition(workflow);
  const audit = getAuditTrailForWorkflow(workflow.workflowId);
  const versions = getWorkflowVersions(workflow.workflowId);

  const stageName = (id: string) => stages.find((s) => s.id === id)?.stageName ?? id;
  const sla = slas.find((s) => s.id === workflow.slaId);
  const escalation = escalations.find((e) => e.id === workflow.escalationId);
  const strategy = strategies.find((s) => s.id === workflow.assignmentStrategyId);

  return (
    <WorkflowEngineShell
      title={workflow.workflowName}
      description={`${workflow.workflowCode} · ${formatWorkflowVersion(workflow.majorVersion, workflow.minorVersion)} · ${workflow.module}`}
      actions={
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <Link href={ROUTES.ADMIN_WORKFLOW_REGISTRY}>Back to Registry</Link>
        </Button>
      }
    >
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="stages" className="text-xs">Stages</TabsTrigger>
          <TabsTrigger value="transitions" className="text-xs">Transitions</TabsTrigger>
          <TabsTrigger value="conditions" className="text-xs">Conditions</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">Events & SLA</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs">Version History</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
          <TabsTrigger value="execution" className="text-xs" disabled>
            <Lock className="mr-1 h-3 w-3" />Execution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="glass-card border-border/60">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-base">{workflow.workflowName}</CardTitle>
                <StatusPill variant={WORKFLOW_STATUS_PILL_VARIANT[workflow.status]}>
                  {WORKFLOW_LIFECYCLE_LABELS[workflow.status]}
                </StatusPill>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{workflow.workflowCode}</p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Meta label="Module" value={workflow.module} />
              <Meta label="Category" value={workflow.category} />
              <Meta label="Version" value={formatWorkflowVersion(workflow.majorVersion, workflow.minorVersion)} mono />
              <Meta label="Stages" value={String(workflow.stageIds.length)} />
              <Meta label="Transitions" value={String(workflow.transitions.length)} />
              <Meta label="Assignment" value={strategy?.label ?? "—"} />
              <Meta label="SLA" value={sla?.label ?? "—"} />
              <Meta label="Escalation" value={escalation?.label ?? "—"} />
              <Meta label="Created By" value={workflow.createdBy} />
              <Meta label="Description" value={workflow.description} className="sm:col-span-2 lg:col-span-3" />
            </CardContent>
          </Card>
          {warnings.length > 0 && (
            <Card className="glass-card mt-4 border-border/60">
              <CardHeader><CardTitle className="text-base">Validation</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {warnings.map((w, i) => (
                  <p key={i} className={`text-sm ${w.severity === "error" ? "text-destructive" : "text-warning"}`}>{w.message}</p>
                ))}
              </CardContent>
            </Card>
          )}
          <LifecycleActions workflow={workflow} />
        </TabsContent>

        <TabsContent value="stages">
          <Card className="glass-card border-border/60">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead>Sub-Stages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflow.stageIds.map((sid) => (
                    <TableRow key={sid}>
                      <TableCell className="text-xs font-medium">{stageName(sid)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {workflow.subStageIds
                          .filter((ss) => subStages.find((s) => s.id === ss)?.parentStageId === sid)
                          .map((ss) => subStages.find((s) => s.id === ss)?.subStageName)
                          .join(", ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transitions">
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Entry Conditions</TableHead>
                  <TableHead>Exit Conditions</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflow.transitions.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="font-mono text-xs">{tr.transitionCode}</TableCell>
                    <TableCell className="text-xs">
                      {stageName(tr.fromStageId)} → {stageName(tr.toStageId)}
                    </TableCell>
                    <TableCell className="text-xs">{tr.entryConditions.length}</TableCell>
                    <TableCell className="text-xs">{tr.exitConditions.length}</TableCell>
                    <TableCell className="font-mono text-[10px]">
                      {events.find((e) => e.id === tr.eventId)?.eventCode ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{tr.priority}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="conditions">
          <div className="grid gap-4 lg:grid-cols-2">
            <ConditionList title="Workflow Entry Conditions" conditions={workflow.entryConditions} />
            <ConditionList title="Workflow Exit Conditions" conditions={workflow.exitConditions} />
          </div>
        </TabsContent>

        <TabsContent value="events">
          <div className="space-y-4">
            <Card className="glass-card border-border/60 p-4">
              <p className="text-sm"><span className="text-muted-foreground">SLA:</span> {sla ? `${sla.label} (${sla.targetDurationHours}h, breach: ${SLA_BREACH_ACTION_LABELS[sla.breachAction]})` : "—"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Escalation:</span> {escalation ? `${escalation.label} (${escalation.triggerAfterHours}h)` : "—"}</p>
            </Card>
            <Card className="glass-card overflow-hidden border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Code</TableHead>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflow.eventIds.map((eid) => {
                    const ev = events.find((e) => e.id === eid);
                    return (
                      <TableRow key={eid}>
                        <TableCell className="font-mono text-xs">{ev?.eventCode ?? eid}</TableCell>
                        <TableCell className="text-xs">{ev?.eventName ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="versions">
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{formatWorkflowVersion(v.majorVersion, v.minorVersion)}</TableCell>
                    <TableCell>
                      <StatusPill variant={WORKFLOW_STATUS_PILL_VARIANT[v.status]}>{WORKFLOW_LIFECYCLE_LABELS[v.status]}</StatusPill>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(v.lastModified).toLocaleDateString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{new Date(e.timestamp).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-xs">{e.actor}</TableCell>
                    <TableCell className="text-xs">{e.action}</TableCell>
                    <TableCell className="text-xs">{e.oldValue && e.newValue ? `${e.oldValue} → ${e.newValue}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </WorkflowEngineShell>
  );
}

function Meta({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function ConditionList({ title, conditions }: { title: string; conditions: WorkflowDefinition["entryConditions"] }) {
  return (
    <Card className="glass-card border-border/60">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conditions defined.</p>
        ) : (
          conditions.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/50 px-3 py-2 text-xs">
              <span className="font-mono">{c.fieldRef}</span> {WORKFLOW_CONDITION_OPERATOR_LABELS[c.operator]} <span className="font-mono">{c.value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LifecycleActions({ workflow }: { workflow: WorkflowDefinition }) {
  const actions: Array<{ label: string; status: WorkflowDefinition["status"] }> = [
    { label: "Validate", status: "validated" },
    { label: "Test", status: "testing" },
    { label: "Approve", status: "approved" },
    { label: "Publish", status: "published" },
    { label: "Archive", status: "archived" },
  ];

  return (
    <Card className="glass-card mt-4 border-border/60">
      <CardHeader><CardTitle className="text-base">Lifecycle</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map(({ label, status }) => (
          <Button
            key={status}
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={workflow.status === status}
            onClick={() => transitionWorkflowStatus(workflow.workflowId, status, "Workflow Admin")}
          >
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
