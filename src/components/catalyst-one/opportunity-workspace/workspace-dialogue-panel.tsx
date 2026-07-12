"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { appendEdcTimelineEntry, listEdcTimeline } from "@/lib/enterprise-dialogue-center";
import type { EdcEventType, EdcTimelineEntry } from "@/types/enterprise-dialogue-center";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

type DialogueFilter = "all" | "tasks" | "documents" | "workflow" | "communication";

const FILTER_EVENTS: Record<Exclude<DialogueFilter, "all">, EdcEventType[]> = {
  tasks: ["task"],
  documents: ["document_upload", "document_verification"],
  workflow: ["workflow", "stage_change", "sub_stage_change", "progress"],
  communication: ["email", "notification", "internal_message"],
};

const FILTERS: DialogueFilter[] = ["all", "tasks", "documents", "workflow", "communication"];

function seedDialogueIfEmpty(opportunityId: string) {
  const existing = listEdcTimeline().filter((e) => e.contextRef.id === opportunityId);
  if (existing.length > 0) return;

  const ctx = { type: "opportunity" as const, id: opportunityId };
  const samples: Array<{ eventType: EdcEventType; title: string; description: string }> = [
    { eventType: "stage_change", title: "Stage → Processing", description: "Opportunity moved to processing." },
    { eventType: "task", title: "Task assigned: Follow-up Documents", description: "Assignee: RM-001" },
    { eventType: "document_upload", title: "PAN uploaded", description: "Individual document upload via EDIE." },
    { eventType: "document_verification", title: "KYC verified", description: "Document verification completed." },
    { eventType: "internal_message", title: "Internal note", description: "Customer prefers evening calls." },
    { eventType: "workflow", title: "Workflow activity", description: "Credit check step started." },
  ];
  for (const s of samples) {
    appendEdcTimelineEntry({
      contextRef: ctx,
      eventType: s.eventType,
      title: s.title,
      description: s.description,
      actorId: "system",
      expandablePayload: { source: "opportunity-workspace-seed" },
    });
  }
}

export function WorkspaceDialoguePanel() {
  const { opportunityId, refreshKey, intelligence } = useOpportunityWorkspace();
  const [filter, setFilter] = useState<DialogueFilter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!opportunityId) return;
    seedDialogueIfEmpty(opportunityId);
  }, [opportunityId]);

  const entries = useMemo(() => {
    if (!opportunityId) return [];
    return listEdcTimeline().filter((e) => e.contextRef.id === opportunityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey, intelligence?.computedOn]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    const allowed = new Set(FILTER_EVENTS[filter]);
    return entries.filter((e) => allowed.has(e.eventType));
  }, [entries, filter]);

  return (
    <OwGlassPanel>
      <OwPanelHeader
        title="Dialogue Center"
        badge={`${filtered.length} events`}
        description="Unified operational timeline — latest first"
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "secondary"}
            className="h-7 capitalize"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((entry: EdcTimelineEntry) => {
          const open = expanded[entry.id];
          const fromChanakya =
            entry.actorId === "chanakya" ||
            (entry.expandablePayload as { generatedBy?: string } | undefined)?.generatedBy ===
              "CHANAKYA";
          const fromEde =
            entry.actorId === "ede" ||
            (entry.expandablePayload as { generatedBy?: string } | undefined)?.generatedBy ===
              "Enterprise Decision Engine";
          return (
            <div
              key={entry.id}
              className={cn(
                "rounded-xl border p-3",
                fromEde
                  ? "border-teal-500/30 bg-teal-500/5"
                  : fromChanakya
                    ? "border-violet-500/30 bg-violet-500/5"
                    : "border-zinc-200/70 bg-zinc-50/50 dark:border-white/10 dark:bg-zinc-950/40",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                    <span className="rounded-full border border-white/10 bg-background/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      {fromEde
                        ? "Enterprise Decision Engine"
                        : fromChanakya
                          ? "CHANAKYA"
                          : entry.eventType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.description}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(entry.occurredOn).toLocaleString()} · {entry.actorId}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setExpanded((s) => ({ ...s, [entry.id]: !open }))}
                >
                  {open ? (
                    <ChevronUp className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  )}
                  {open ? "Collapse" : "Expand"}
                </Button>
              </div>
              {open && entry.expandablePayload && (
                <pre className="mt-2 overflow-auto rounded-lg bg-muted/60 p-2 text-[11px]">
                  {JSON.stringify(entry.expandablePayload, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No dialogue entries for this filter.</p>
        )}
      </div>
    </OwGlassPanel>
  );
}
