"use client";

import { cn } from "@/lib/utils";
import type { Workstream } from "../../types";
import {
  HierarchyActionsMenu,
  type HierarchyActionId,
} from "../../components/HierarchyActionsMenu";
import { ExpandCollapseControl } from "./ExpandCollapseControl";
import { HealthBadge } from "./HealthBadge";
import { InlineEditableText } from "./InlineEditableText";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

export function WorkstreamCard({
  node,
  expanded,
  onToggle,
  onChange,
  onOpenDetail,
  onAction,
  depth = 0,
  className,
}: {
  node: Workstream;
  expanded: boolean;
  onToggle: () => void;
  onChange?: (patch: Partial<Workstream>) => void;
  onOpenDetail?: () => void;
  onAction?: (action: HierarchyActionId) => void;
  depth?: number;
  className?: string;
}) {
  const nestedCount = (node.workstreams?.length ?? 0) + node.milestones.length;
  const hasChildren = nestedCount > 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800/90 bg-zinc-950/70 p-3",
        depth > 0 && "border-zinc-800/70",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <ExpandCollapseControl
          expanded={expanded}
          onToggle={onToggle}
          label={node.name}
          disabled={!hasChildren}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Workstream
              </p>
              <InlineEditableText
                value={node.name}
                ariaLabel="workstream name"
                onCommit={(name) => onChange?.({ name })}
                className="text-sm font-medium text-zinc-100"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={node.status} />
              <HealthBadge health={node.health} />
              <HierarchyActionsMenu
                kind="workstream"
                label={node.name}
                onAction={(action) => {
                  if (action === "open_detail") onOpenDetail?.();
                  onAction?.(action);
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-500">
            <span>
              Owner{" "}
              <InlineEditableText
                value={node.owner ?? "Unassigned"}
                ariaLabel="workstream owner"
                onCommit={(owner) => onChange?.({ owner })}
                className="text-zinc-300"
              />
            </span>
            <span>
              Milestones <span className="tabular-nums text-zinc-300">{node.milestoneCount}</span>
            </span>
            <ProgressBar value={node.progress} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
