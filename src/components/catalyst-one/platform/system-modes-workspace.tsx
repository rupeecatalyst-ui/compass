"use client";

import { useEffect, useState } from "react";
import {
  configurePlatformModes,
  getPlatformModes,
  shouldSuppressAutomation,
} from "@/lib/enterprise-platform-modes";
import type {
  AutomationSuppressKind,
  ChanakyaMode,
  CommunicationMode,
  PlatformModesState,
  WorkflowMode,
} from "@/types/enterprise-platform-modes";
import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const SUPPRESS_KINDS: AutomationSuppressKind[] = [
  "workflowTriggers",
  "tasks",
  "notifications",
  "escalations",
  "aiRecommendations",
];

export function SystemModesWorkspace() {
  const [modes, setModes] = useState<PlatformModesState | null>(null);

  const refresh = () => setModes(getPlatformModes());

  useEffect(() => {
    refresh();
  }, []);

  if (!modes) return null;

  const update = (patch: Parameters<typeof configurePlatformModes>[0]) => {
    setModes(configurePlatformModes(patch));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Modes"
        description="Workflow, communication, Chanakya, and migration mode controls for the enterprise platform."
      />

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Workflow mode</Label>
          <Select
            value={modes.workflowMode}
            onValueChange={(v) => update({ workflowMode: v as WorkflowMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">off</SelectItem>
              <SelectItem value="internal">internal</SelectItem>
              <SelectItem value="live">live</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Communication mode</Label>
          <Select
            value={modes.communicationMode}
            onValueChange={(v) => update({ communicationMode: v as CommunicationMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">off</SelectItem>
              <SelectItem value="simulation">simulation</SelectItem>
              <SelectItem value="live">live</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Chanakya mode</Label>
          <Select
            value={modes.chanakyaMode}
            onValueChange={(v) => update({ chanakyaMode: v as ChanakyaMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="learning">learning</SelectItem>
              <SelectItem value="advisory">advisory</SelectItem>
              <SelectItem value="full">full</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            <Label>Migration mode</Label>
            <p className="text-xs text-muted-foreground">Suppresses automation when enabled</p>
          </div>
          <Switch
            checked={modes.migrationMode}
            onCheckedChange={(checked) => update({ migrationMode: checked })}
          />
        </div>
      </div>

      {modes.migrationMode && (
        <EnterpriseEngagementCard
          title="Automation suppression"
          description="Derived flags while migration mode is on."
          tone="amber"
          badge="migration active"
        >
          <ul className="space-y-1 text-xs">
            {SUPPRESS_KINDS.map((kind) => (
              <li key={kind} className="flex justify-between gap-2">
                <span>{kind}</span>
                <span className="font-medium">{shouldSuppressAutomation(kind) ? "suppressed" : "allowed"}</span>
              </li>
            ))}
          </ul>
        </EnterpriseEngagementCard>
      )}
    </div>
  );
}
