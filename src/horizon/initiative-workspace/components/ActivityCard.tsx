"use client";

import { cn } from "@/lib/utils";
import type { Activity } from "../../types";
import {
  HierarchyActionsMenu,
  type HierarchyActionId,
} from "../../components/HierarchyActionsMenu";
import { ExpandCollapseControl } from "./ExpandCollapseControl";
import { InlineEditableText } from "./InlineEditableText";
import { PriorityBadge } from "./PriorityBadge";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ActivityCard({
  node,
  expanded,
  onToggle,
  onChange,
  onOpenDetail,
  onAction,
  className,
}: {
  node: Activity;
  expanded: boolean;
  onToggle: () => void;
  onChange?: (patch: Partial<Activity>) => void;
  onOpenDetail?: () => void;
  onAction?: (action: HierarchyActionId) => void;
  className?: string;
}) {
  const hasChildren = (node.activities?.length ?? 0) > 0;

  return (
    <div className={cn("rounded-md border border-zinc-800/70 bg-zinc-950/40 px-2.5 py-2", className)}>
      <div className="flex items-start gap-2">
        <ExpandCollapseControl
          expanded={expanded}
          onToggle={onToggle}
          label={node.title}
          disabled={!hasChildren}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Activity
              </p>
              <InlineEditableText
                value={node.title}
                ariaLabel="activity title"
                onCommit={(title) => onChange?.({ title })}
                className="text-[13px] font-medium text-zinc-200"
              />
              {node.description ? (
                <p className="mt-0.5 text-[11px] text-zinc-500">{node.description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={node.status} />
              <PriorityBadge priority={node.priority} />
              <HierarchyActionsMenu
                kind="activity"
                label={node.title}
                onAction={(action) => {
                  if (action === "open_detail") onOpenDetail?.();
                  onAction?.(action);
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            <span>
              Assigned{" "}
              <InlineEditableText
                value={node.assignedTo ?? "Unassigned"}
                ariaLabel="assigned to"
                onCommit={(assignedTo) => onChange?.({ assignedTo })}
                className="text-zinc-300"
              />
            </span>
            <span>
              Due <span className="text-zinc-300">{formatDate(node.dueDate)}</span>
            </span>
            <ProgressBar value={node.completion} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
