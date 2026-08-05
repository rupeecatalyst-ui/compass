"use client";

/**
 * CO-360-001 — Universal Enterprise 360° Workspace shell.
 * Framework UI only — entity adapters supply snapshot data.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { EnterpriseWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-workspace-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEnterprise360Module } from "@/constants/enterprise-360-workspace";
import type {
  Enterprise360CommandId,
  Enterprise360WorkspaceSnapshot,
} from "@/types/enterprise-360-workspace";
import { cn } from "@/lib/utils";

export function Enterprise360Workspace({
  snapshot,
  onCommand,
  className,
}: {
  snapshot: Enterprise360WorkspaceSnapshot;
  onCommand?: (id: Enterprise360CommandId) => void;
  className?: string;
}) {
  const moduleDef = getEnterprise360Module(snapshot.entityKind);
  const [activeSection, setActiveSection] = useState(
    snapshot.sections[0]?.id ?? "executive_summary",
  );

  const active = useMemo(
    () => snapshot.sections.find((s) => s.id === activeSection) ?? snapshot.sections[0],
    [snapshot.sections, activeSection],
  );

  return (
    <EnterpriseWorkspaceShell
      className={cn("enterprise-360-workspace", className)}
      chrome={
        <div className="space-y-2 px-3 py-2 sm:px-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {moduleDef.label} · Framework {snapshot.frameworkVersion}
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {snapshot.entityLabel}
              </h1>
              <p className="text-xs text-muted-foreground">
                Registry SSOT: {snapshot.registryLabel} · Operations only in this Workspace
              </p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {snapshot.dashboard.currentStatus}
            </Badge>
          </div>
          <Enterprise360CommandBar
            commands={snapshot.commands}
            onCommand={onCommand}
          />
        </div>
      }
    >
      <div className="space-y-4 p-3 sm:p-4">
        <Enterprise360ExecutiveDashboardCard snapshot={snapshot} />

        <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
          {snapshot.sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "shrink-0 border-b-2 px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                active?.id === s.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <Enterprise360SectionPanel snapshot={snapshot} sectionId={active?.id} />
      </div>
    </EnterpriseWorkspaceShell>
  );
}

function Enterprise360CommandBar({
  commands,
  onCommand,
}: {
  commands: Enterprise360WorkspaceSnapshot["commands"];
  onCommand?: (id: Enterprise360CommandId) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      data-360="command-bar"
      role="toolbar"
      aria-label="360 Workspace actions"
    >
      {commands.map((c) => (
        <Button
          key={c.id}
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() => onCommand?.(c.id)}
        >
          {c.label}
        </Button>
      ))}
    </div>
  );
}

function Enterprise360ExecutiveDashboardCard({
  snapshot,
}: {
  snapshot: Enterprise360WorkspaceSnapshot;
}) {
  const d = snapshot.dashboard;
  return (
    <Card data-360="executive-dashboard">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Executive Dashboard</CardTitle>
        <p className="text-[11px] text-muted-foreground">{d.summaryLine}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Current Status" value={d.currentStatus} />
          <Metric label="Pending Actions" value={String(d.pendingActions)} />
          <Metric label="Open Tasks" value={String(d.openTasks)} />
          <Metric label="Upcoming Activities" value={String(d.upcomingActivities)} />
          <Metric label="Compliance Alerts" value={String(d.complianceAlerts)} />
          <Metric label="Documents Pending" value={String(d.documentsPending)} />
          <Metric label="Recent Timeline" value={String(d.recentTimelineCount)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Enterprise360SectionPanel({
  snapshot,
  sectionId,
}: {
  snapshot: Enterprise360WorkspaceSnapshot;
  sectionId?: string;
}) {
  if (!sectionId) return null;
  const section = snapshot.sections.find((s) => s.id === sectionId);
  if (!section) return null;

  if (sectionId === "ai_insights") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{section.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {snapshot.aiInsights.map((ai) => (
            <div key={ai.id} className="rounded-md border px-3 py-2 text-sm">
              <p className="font-medium">{ai.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ai.summary}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Focus: {ai.focus}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sectionId === "documents" || sectionId === "attachments") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{section.label}</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Enterprise Document Registry projection — no duplicate storage.
          </p>
        </CardHeader>
        <CardContent>
          {snapshot.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked documents for this entity.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {snapshot.documents.map((d) => (
                <li key={d.id} className="flex justify-between gap-2 border-b py-1.5">
                  <span>{d.displayName}</span>
                  <span className="text-xs text-muted-foreground">{d.categoryLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  if (sectionId === "timeline") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {snapshot.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events yet.</p>
          ) : (
            snapshot.timeline.map((e) => (
              <div key={e.id} className="rounded-md border px-2.5 py-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-medium capitalize">{e.event.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">
                    {new Date(e.at).toLocaleString("en-GB")}
                  </span>
                </div>
                {e.detail ? <p className="mt-0.5 text-muted-foreground">{e.detail}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  if (sectionId === "audit_history") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 text-left">User</th>
                    <th className="py-1 text-left">Timestamp</th>
                    <th className="py-1 text-left">Action</th>
                    <th className="py-1 text-left">Old</th>
                    <th className="py-1 text-left">New</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.audit.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="py-1.5">{a.userId ?? "—"}</td>
                      <td className="py-1.5">{new Date(a.at).toLocaleString("en-GB")}</td>
                      <td className="py-1.5">{a.action}</td>
                      <td className="py-1.5">{a.oldValue ?? "—"}</td>
                      <td className="py-1.5">{a.newValue ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (sectionId === "business_roles" && snapshot.identityRoles) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Business Roles</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Click an assigned role to open its corresponding 360 Workspace.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {snapshot.identityRoles.map((role) => {
            const chip = (
              <Badge
                key={role.roleId}
                variant={role.assigned ? "default" : "outline"}
                className={cn(
                  "text-[11px]",
                  role.assigned && role.workspaceHref && "cursor-pointer",
                )}
              >
                {role.roleLabel}
                {role.assigned ? "" : " (not assigned)"}
              </Badge>
            );
            if (role.assigned && role.workspaceHref) {
              return (
                <Link key={role.roleId} href={role.workspaceHref}>
                  {chip}
                </Link>
              );
            }
            return <span key={role.roleId}>{chip}</span>;
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{section.label}</CardTitle>
        {section.description ? (
          <p className="text-[11px] text-muted-foreground">{section.description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Section ready for entity adapter. Framework catalogs this surface; live data is
          projected from Registry / ETE / Document Registry SSOTs by the entity module.
        </p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-medium capitalize text-foreground">{value}</p>
    </div>
  );
}
