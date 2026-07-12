"use client";

import { cn } from "@/lib/utils";
import type { Milestone } from "../../types";
import {
  HierarchyActionsMenu,
  type HierarchyActionId,
} from "../../components/HierarchyActionsMenu";
import { ExpandCollapseControl } from "./ExpandCollapseControl";
import { InlineEditableText } from "./InlineEditableText";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MilestoneCard({
  node,
  expanded,
  onToggle,
  onChange,
  onOpenDetail,
  onAction,
  className,
}: {
  node: Milestone;
  expanded: boolean;
  onToggle: () => void;
  onChange?: (patch: Partial<Milestone>) => void;
  onOpenDetail?: () => void;
  onAction?: (action: HierarchyActionId) => void;
  className?: string;
}) {
  const nestedCount = (node.milestones?.length ?? 0) + node.activities.length;
  const hasChildren = nestedCount > 0;

  return (
    <div className={cn("rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-2.5", className)}>
      <div className="flex items-start gap-2">
        <ExpandCollapseControl
          expanded={expanded}
          onToggle={onToggle}
          label={node.name}
          disabled={!hasChildren}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Milestone
              </p>
              <InlineEditableText
                value={node.name}
                ariaLabel="milestone name"
                onCommit={(name) => onChange?.({ name })}
                className="text-sm font-medium text-zinc-100"
              />
              {node.description ? (
                <p className="mt-0.5 text-[11px] text-zinc-500">{node.description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={node.status} />
              <HierarchyActionsMenu
                kind="milestone"
                label={node.name}
                onAction={(action) => {
                  if (action === "open_detail") onOpenDetail?.();
                  onAction?.(action);
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            <span>
              Target <span className="text-zinc-300">{formatDate(node.targetDate)}</span>
            </span>
            <ProgressBar value={node.progress} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
