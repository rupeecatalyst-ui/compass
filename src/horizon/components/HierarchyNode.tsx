"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { HierarchyNodeModel } from "../types";
import { HealthBadge } from "./HealthBadge";
import { ProgressIndicator } from "./ProgressIndicator";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<HierarchyNodeModel["kind"], string> = {
  initiative: "Initiative",
  workstream: "Workstream",
  milestone: "Milestone",
  activity: "Activity",
};

export function HierarchyNode({
  node,
  depth = 0,
}: {
  node: HierarchyNodeModel;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <li className="list-none">
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-zinc-800 hover:bg-zinc-900/50",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 rounded p-0.5 text-zinc-500 outline-none hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-cyan-500/40"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.title}`}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : (
          <span className="mt-0.5 w-4" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider text-zinc-600">
              {KIND_LABEL[node.kind]}
            </span>
            {node.health && <HealthBadge health={node.health} />}
          </div>
          <p className="text-sm font-medium text-zinc-100">{node.title}</p>
          {typeof node.progress === "number" && (
            <ProgressIndicator value={node.progress} size="sm" className="mt-1" />
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <ul className="space-y-0.5" role="group">
          {node.children.map((child) => (
            <HierarchyNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
