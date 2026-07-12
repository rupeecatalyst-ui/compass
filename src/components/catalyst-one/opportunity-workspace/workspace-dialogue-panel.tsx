"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { appendEdcTimelineEntry, listEdcTimeline } from "@/lib/enterprise-dialogue-center";
import type { EdcEventType, EdcTimelineEntry } from "@/types/enterprise-dialogue-center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import {
  DIALOGUE_CATEGORY_LABELS,
  getDialogueComposeState,
  getQuickIntent,
  getTimelineGroupByDay,
  placeholderConsumeQuickIntent,
  placeholderSetDialogueAttachment,
  placeholderSetDialogueCategory,
  placeholderSetDialogueMention,
  placeholderToggleTimelineGrouping,
  type PlaceholderDialogueCategory,
} from "./providers/workspace-placeholder-provider";

type DialogueFilter = "all" | "tasks" | "documents" | "workflow" | "communication";

const FILTER_EVENTS: Record<Exclude<DialogueFilter, "all">, EdcEventType[]> = {
  tasks: ["task"],
  documents: ["document_upload", "document_verification"],
  workflow: ["workflow", "stage_change", "sub_stage_change", "progress"],
  communication: ["email", "notification", "internal_message"],
};

const FILTERS: DialogueFilter[] = ["all", "tasks", "documents", "workflow", "communication"];

const CATEGORIES = Object.keys(DIALOGUE_CATEGORY_LABELS) as PlaceholderDialogueCategory[];

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

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function WorkspaceDialoguePanel() {
  const { opportunityId, refresh, refreshKey, intelligence, focus } = useOpportunityWorkspace();
  const [filter, setFilter] = useState<DialogueFilter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [groupByDay, setGroupByDay] = useState(true);
  const [composeFocus, setComposeFocus] = useState(false);

  useEffect(() => {
    if (!opportunityId) return;
    seedDialogueIfEmpty(opportunityId);
    setGroupByDay(getTimelineGroupByDay(opportunityId));
  }, [opportunityId]);

  useEffect(() => {
    if (!opportunityId) return;
    if (getQuickIntent(opportunityId) !== "focus_dialogue_compose") return;
    placeholderConsumeQuickIntent(opportunityId);
    setComposeFocus(true);
    if (focus === "timeline") setFilter("all");
  }, [opportunityId, refreshKey, focus]);

  const compose = useMemo(
    () => (opportunityId ? getDialogueComposeState(opportunityId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opportunityId, refreshKey],
  );

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

  const groups = useMemo(() => {
    if (!groupByDay) return [{ key: "all", items: filtered }];
    const map = new Map<string, EdcTimelineEntry[]>();
    for (const entry of filtered) {
      const key = dayKey(entry.occurredOn);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, items]) => ({ key, items }));
  }, [filtered, groupByDay]);

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const e of filtered) next[e.id] = true;
    setExpanded(next);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  const onSave = () => {
    if (!opportunityId || !message.trim()) return;
    const category = compose?.category ?? "internal_note";
    const mention = compose?.mention?.trim();
    const attachment = compose?.attachment;
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType: "internal_message",
      title: DIALOGUE_CATEGORY_LABELS[category],
      description: mention ? `${message.trim()} · @${mention}` : message.trim(),
      actorId: "RM-001",
      expandablePayload: {
        category,
        mention: mention || undefined,
        attachment: attachment ?? undefined,
        author: "RM-001",
        source: "opportunity-workspace-dialogue",
      },
    });
    setMessage("");
    placeholderSetDialogueAttachment(opportunityId, null);
    placeholderSetDialogueMention(opportunityId, "");
    setComposeFocus(false);
    refresh();
  };

  return (
    <OwGlassPanel>
      <OwPanelHeader
        title={focus === "timeline" ? "Timeline · Dialogue Center" : "Dialogue Center"}
        badge={`${filtered.length} events`}
        description="Unified operational timeline — latest first"
      />

      <div
        className={cn(
          "mb-3 space-y-2 rounded-xl border border-white/10 bg-zinc-950/40 p-3",
          composeFocus && "ring-2 ring-violet-400/40",
        )}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Category</Label>
            <Select
              value={compose?.category ?? "internal_note"}
              onValueChange={(v) => {
                if (!opportunityId) return;
                placeholderSetDialogueCategory(opportunityId, v as PlaceholderDialogueCategory);
                refresh();
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {DIALOGUE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Mention user</Label>
            <Input
              className="h-8 text-xs"
              value={compose?.mention ?? ""}
              placeholder="@employee:rm-002"
              onChange={(e) => {
                if (!opportunityId) return;
                placeholderSetDialogueMention(opportunityId, e.target.value);
                refresh();
              }}
            />
          </div>
        </div>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write note / discussion / follow-up…"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onSave} disabled={!message.trim()}>
            Save
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!opportunityId) return;
              placeholderSetDialogueAttachment(
                opportunityId,
                `placeholder-attachment-${Date.now()}.pdf`,
              );
              refresh();
            }}
          >
            Attach placeholder file
          </Button>
          {compose?.attachment && (
            <span className="self-center text-[10px] text-muted-foreground">{compose.attachment}</span>
          )}
        </div>
      </div>

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
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => {
            if (!opportunityId) return;
            setGroupByDay(placeholderToggleTimelineGrouping(opportunityId));
            refresh();
          }}
        >
          {groupByDay ? "Ungroup" : "Group by day"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={expandAll}>
          Expand all
        </Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={collapseAll}>
          Collapse all
        </Button>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.key}>
            {groupByDay && group.key !== "all" && (
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.key}
              </p>
            )}
            <div className="space-y-2">
              {group.items.map((entry: EdcTimelineEntry) => {
                const open = expanded[entry.id];
                const payload = entry.expandablePayload as
                  | { category?: string; author?: string; generatedBy?: string }
                  | undefined;
                const fromChanakya =
                  entry.actorId === "chanakya" || payload?.generatedBy === "CHANAKYA";
                const fromEde =
                  entry.actorId === "ede" || payload?.generatedBy === "Enterprise Decision Engine";
                const categoryLabel = payload?.category
                  ? DIALOGUE_CATEGORY_LABELS[payload.category as PlaceholderDialogueCategory] ??
                    payload.category
                  : entry.eventType.replace(/_/g, " ");
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
                                : categoryLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{entry.description}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(entry.occurredOn).toLocaleString()} ·{" "}
                          {payload?.author ?? entry.actorId}
                          {payload?.category ? ` · ${categoryLabel}` : ""}
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
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No dialogue entries for this filter.</p>
        )}
      </div>
    </OwGlassPanel>
  );
}
