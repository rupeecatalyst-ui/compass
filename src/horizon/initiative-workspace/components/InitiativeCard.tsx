"use client";

import { cn } from "@/lib/utils";
import type { Initiative } from "../../types";
import {
  HierarchyActionsMenu,
  type HierarchyActionId,
} from "../../components/HierarchyActionsMenu";
import { ExpandCollapseControl } from "./ExpandCollapseControl";
import { HealthBadge } from "./HealthBadge";
import { InlineEditableText } from "./InlineEditableText";
import { PriorityBadge } from "./PriorityBadge";
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

export function InitiativeCard({
  node,
  expanded,
  onToggle,
  onChange,
  onOpenDetail,
  onAction,
  className,
}: {
  node: Initiative;
  expanded: boolean;
  onToggle: () => void;
  onChange?: (patch: Partial<Initiative>) => void;
  onOpenDetail?: () => void;
  onAction?: (action: HierarchyActionId) => void;
  className?: string;
}) {
  const hasChildren = node.workstreams.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-teal-500/20 bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 p-3.5 shadow-[0_0_0_1px_rgba(20,184,166,0.04)] transition-colors",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <ExpandCollapseControl
          expanded={expanded}
          onToggle={onToggle}
          label={node.name}
          disabled={!hasChildren}
        />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <InlineEditableText
                value={node.name}
                ariaLabel="initiative name"
                onCommit={(name) => onChange?.({ name })}
                className="text-sm font-semibold text-zinc-50"
              />
              <InlineEditableText
                value={node.description}
                ariaLabel="initiative description"
                multiline
                onCommit={(description) => onChange?.({ description })}
                className="block w-full text-xs leading-relaxed text-zinc-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={node.status} />
              <HealthBadge health={node.health} />
              <PriorityBadge priority={node.priority} />
              <HierarchyActionsMenu
                kind="initiative"
                label={node.name}
                onAction={(action) => {
                  if (action === "open_detail") onOpenDetail?.();
                  onAction?.(action);
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-zinc-500">
            <span>
              Owner{" "}
              <InlineEditableText
                value={node.owner ?? "Unassigned"}
                ariaLabel="owner"
                onCommit={(owner) => onChange?.({ owner })}
                className="text-zinc-300"
              />
            </span>
            <span>
              Start <span className="text-zinc-300">{formatDate(node.startDate)}</span>
            </span>
            <span>
              Target <span className="text-zinc-300">{formatDate(node.targetDate)}</span>
            </span>
            <span>
              Category <span className="text-zinc-300">{node.category}</span>
            </span>
            <ProgressBar value={node.progress} size="sm" />
          </div>

          {node.notes ? (
            <p className="text-[11px] text-zinc-500">
              Notes <span className="text-zinc-400">{node.notes}</span>
            </p>
          ) : null}

          {node.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {node.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-zinc-800 bg-zinc-950/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onOpenDetail}
            className="text-[10px] uppercase tracking-wider text-cyan-400/80 transition hover:text-cyan-300"
          >
            Open detail panel
          </button>
        </div>
      </div>
    </div>
  );
}
