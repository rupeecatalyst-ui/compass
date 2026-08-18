"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { hydrateEdcFromEar } from "@/lib/enterprise-activity-registry";
import { appendEdcTimelineEntry, listEdcTimeline } from "@/lib/enterprise-dialogue-center";
import { EAR_EVENT_KINDS } from "@/constants/enterprise-activity-registry";
import type { EdcEventType, EdcTimelineEntry } from "@/types/enterprise-dialogue-center";
import { EnterpriseEngagementCard, type EnterpriseCardTone } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isDemoSeedEnabled } from "@/lib/demo-seed";

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
  conversation_activity: "blue",
};

const KIND_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All kinds" },
  { value: EAR_EVENT_KINDS.STAGE_CHANGE, label: "Stage changes" },
  { value: EAR_EVENT_KINDS.WORKFLOW, label: "Workflow" },
  { value: EAR_EVENT_KINDS.NOTES, label: "Notes" },
  { value: EAR_EVENT_KINDS.DIALOGUE, label: "Dialogue" },
  { value: EAR_EVENT_KINDS.DOCUMENTS, label: "Documents" },
  { value: EAR_EVENT_KINDS.TASKS, label: "Tasks" },
  { value: EAR_EVENT_KINDS.COMMUNICATIONS, label: "Communications" },
  { value: EAR_EVENT_KINDS.OPPORTUNITY, label: "Opportunity" },
];

function seedDialogueIfEmpty(contextId?: string) {
  if (!isDemoSeedEnabled()) return;
  // The global Dialogue route must never manufacture a demo history.
  if (!contextId) return;
  if (listEdcTimeline().length > 0) return;
  const ctx = { type: "opportunity" as const, id: contextId };
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

/**
 * Global route reads the durable EAR projection without an entity filter.
 * Callers may supply an Opportunity context for a scoped embedded view.
 */
export function DialogueCenterWorkspace({ contextId }: DialogueCenterWorkspaceProps) {
  const [entries, setEntries] = useState<EdcTimelineEntry[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [eventKind, setEventKind] = useState("");
  const [sinceDate, setSinceDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const since = sinceDate
        ? new Date(`${sinceDate}T00:00:00`).toISOString()
        : undefined;
      await hydrateEdcFromEar({
        opportunityId: contextId?.startsWith("opp") ? contextId : undefined,
        eventKind: eventKind || undefined,
        since,
        limit: 100,
      });
      if (cancelled) return;
      seedDialogueIfEmpty(contextId);
      setEntries(listEdcTimeline());
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [contextId, eventKind, sinceDate]);

  const filtered = useMemo(
    () => (contextId ? entries.filter((e) => e.contextRef.id === contextId) : entries),
    [entries, contextId],
  );

  return (
    <div className="space-y-6" data-dialogue-center="">
      <PageHeader
        title="Dialogue"
        description="Global operational chronology from the Enterprise Activity Registry — latest first. Not employee messaging."
      />

      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-[11px] font-medium text-muted-foreground">
          Event kind
          <select
            value={eventKind}
            onChange={(e) => setEventKind(e.target.value)}
            className="block h-9 min-w-[10rem] rounded-md border border-input bg-background px-2 text-sm text-foreground"
            data-dialogue-event-kind=""
          >
            {KIND_FILTERS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-[11px] font-medium text-muted-foreground">
          Since
          <Input
            type="date"
            value={sinceDate}
            onChange={(e) => setSinceDate(e.target.value)}
            className="h-9 w-[11rem] text-sm"
            data-dialogue-since=""
          />
        </label>
      </div>

      <div className="space-y-3">
        {filtered.map((entry) => {
          const open = expanded[entry.id];
          return (
            <EnterpriseEngagementCard
              key={entry.id}
              title={entry.title}
              description={entry.description}
              tone={EVENT_TONE[entry.eventType] ?? "slate"}
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
