"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { appendEdcTimelineEntry, listEdcTimeline } from "@/lib/enterprise-dialogue-center";
import type { EdcEventType, EdcTimelineEntry } from "@/types/enterprise-dialogue-center";
import { EnterpriseEngagementCard, type EnterpriseCardTone } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EVENT_TONE: Record<EdcEventType, EnterpriseCardTone> = {
  stage_change: "emerald",
  sub_stage_change: "cyan",
  progress: "blue",
  task: "amber",
  email: "violet",
  notification: "rose",
  internal_message: "slate",
  document_upload: "cyan",
  document_verification: "emerald",
  workflow: "violet",
};

function seedDialogueIfEmpty() {
  if (listEdcTimeline().length > 0) return;
  const ctx = { type: "opportunity" as const, id: "opp-demo-001" };
  const samples: Array<{ eventType: EdcEventType; title: string; description: string }> = [
    { eventType: "stage_change", title: "Stage → Lender Review", description: "Opportunity moved to lender review." },
    { eventType: "task", title: "Task assigned: Follow-up Documents", description: "Assignee: RM-001" },
    { eventType: "document_upload", title: "PAN uploaded", description: "Individual document upload via EDIE." },
    { eventType: "document_verification", title: "KYC verified", description: "Document verification completed." },
    { eventType: "internal_message", title: "Internal note", description: "Customer prefers evening calls." },
    { eventType: "workflow", title: "Workflow activity", description: "Credit check step started." },
    { eventType: "notification", title: "Simulated notification", description: "ENCE simulation — not delivered externally." },
    { eventType: "progress", title: "Progress update", description: "65% checklist complete." },
  ];
  for (const s of samples) {
    appendEdcTimelineEntry({
      contextRef: ctx,
      eventType: s.eventType,
      title: s.title,
      description: s.description,
      actorId: "system",
      expandablePayload: { source: "spr-001-seed" },
    });
  }
}

interface DialogueCenterWorkspaceProps {
  contextId?: string;
}

export function DialogueCenterWorkspace({ contextId = "opp-demo-001" }: DialogueCenterWorkspaceProps) {
  const [entries, setEntries] = useState<EdcTimelineEntry[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    seedDialogueIfEmpty();
    setEntries(listEdcTimeline());
  }, []);

  const filtered = useMemo(
    () => entries.filter((e) => !contextId || e.contextRef.id === contextId),
    [entries, contextId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Dialogue Center"
        description="Unified operational timeline — latest activity first. Complete audit trail."
      />

      <div className="space-y-3">
        {filtered.map((entry) => {
          const open = expanded[entry.id];
          return (
            <EnterpriseEngagementCard
              key={entry.id}
              title={entry.title}
              description={entry.description}
              tone={EVENT_TONE[entry.eventType]}
              badge={entry.eventType.replace(/_/g, " ")}
              meta={`${new Date(entry.occurredOn).toLocaleString()} · ${entry.actorId}${
                entry.historicalReference ? " · historical" : ""
              }`}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setExpanded((s) => ({ ...s, [entry.id]: !open }))}
              >
                {open ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                {open ? "Collapse" : "Expand"}
              </Button>
              {open && entry.expandablePayload && (
                <pre className={cn("mt-2 rounded-lg bg-muted/60 p-2 text-[11px] overflow-auto")}>
                  {JSON.stringify(entry.expandablePayload, null, 2)}
                </pre>
              )}
            </EnterpriseEngagementCard>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No dialogue entries for this context.</p>
        )}
      </div>
    </div>
  );
}
