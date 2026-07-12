"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { Activity, HorizonSelection, Initiative, Milestone, Workstream } from "../../types";
import type { HierarchyActionId } from "../../components/HierarchyActionsMenu";
import type { InlineEditHandlers } from "../types";
import { ActivityCard } from "./ActivityCard";
import { InitiativeCard } from "./InitiativeCard";
import { MilestoneCard } from "./MilestoneCard";
import { WorkstreamCard } from "./WorkstreamCard";

function useExpandedSet(initial: string[] = []) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initial));
  const isExpanded = useCallback((id: string) => expanded.has(id), [expanded]);
  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  return { isExpanded, toggle };
}

function ActivityBranch({
  node,
  depth,
  isExpanded,
  toggle,
  handlers,
  onSelect,
  onAction,
}: {
  node: Activity;
  depth: number;
  isExpanded: (id: string) => boolean;
  toggle: (id: string) => void;
  handlers?: InlineEditHandlers;
  onSelect?: (selection: HorizonSelection) => void;
  onAction?: (action: HierarchyActionId, selection: HorizonSelection) => void;
}) {
  const open = isExpanded(node.id);
  const children = node.activities ?? [];
  const selection: HorizonSelection = {
    id: node.id,
    kind: "activity",
    title: node.title,
    subtitle: node.description,
  };

  return (
    <div className="space-y-2" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      <ActivityCard
        node={node}
        expanded={open}
        onToggle={() => toggle(node.id)}
        onChange={(patch) => handlers?.onActivityChange?.(node.id, patch)}
        onOpenDetail={() => onSelect?.(selection)}
        onAction={(action) => onAction?.(action, selection)}
      />
      {open && children.length > 0 ? (
        <div className="space-y-2 border-l border-zinc-800/80 pl-3">
          {children.map((child) => (
            <ActivityBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              isExpanded={isExpanded}
              toggle={toggle}
              handlers={handlers}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MilestoneBranch({
  node,
  depth,
  isExpanded,
  toggle,
  handlers,
  onSelect,
  onAction,
}: {
  node: Milestone;
  depth: number;
  isExpanded: (id: string) => boolean;
  toggle: (id: string) => void;
  handlers?: InlineEditHandlers;
  onSelect?: (selection: HorizonSelection) => void;
  onAction?: (action: HierarchyActionId, selection: HorizonSelection) => void;
}) {
  const open = isExpanded(node.id);
  const nested = node.milestones ?? [];
  const selection: HorizonSelection = {
    id: node.id,
    kind: "milestone",
    title: node.name,
    subtitle: node.description,
  };

  return (
    <div className="space-y-2" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      <MilestoneCard
        node={node}
        expanded={open}
        onToggle={() => toggle(node.id)}
        onChange={(patch) => handlers?.onMilestoneChange?.(node.id, patch)}
        onOpenDetail={() => onSelect?.(selection)}
        onAction={(action) => onAction?.(action, selection)}
      />
      {open ? (
        <div className="space-y-2 border-l border-zinc-800/80 pl-3">
          {nested.map((child) => (
            <MilestoneBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              isExpanded={isExpanded}
              toggle={toggle}
              handlers={handlers}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
          {node.activities.map((activity) => (
            <ActivityBranch
              key={activity.id}
              node={activity}
              depth={0}
              isExpanded={isExpanded}
              toggle={toggle}
              handlers={handlers}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WorkstreamBranch({
  node,
  depth,
  isExpanded,
  toggle,
  handlers,
  onSelect,
  onAction,
}: {
  node: Workstream;
  depth: number;
  isExpanded: (id: string) => boolean;
  toggle: (id: string) => void;
  handlers?: InlineEditHandlers;
  onSelect?: (selection: HorizonSelection) => void;
  onAction?: (action: HierarchyActionId, selection: HorizonSelection) => void;
}) {
  const open = isExpanded(node.id);
  const nested = node.workstreams ?? [];
  const selection: HorizonSelection = {
    id: node.id,
    kind: "workstream",
    title: node.name,
    subtitle: node.owner ? `Owner · ${node.owner}` : undefined,
  };

  return (
    <div className="space-y-2.5" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      <WorkstreamCard
        node={node}
        expanded={open}
        onToggle={() => toggle(node.id)}
        onChange={(patch) => handlers?.onWorkstreamChange?.(node.id, patch)}
        onOpenDetail={() => onSelect?.(selection)}
        onAction={(action) => onAction?.(action, selection)}
        depth={depth}
      />
      {open ? (
        <div className="space-y-2.5 border-l border-zinc-800/80 pl-3">
          {nested.map((child) => (
            <WorkstreamBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              isExpanded={isExpanded}
              toggle={toggle}
              handlers={handlers}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
          {node.milestones.map((milestone) => (
            <MilestoneBranch
              key={milestone.id}
              node={milestone}
              depth={0}
              isExpanded={isExpanded}
              toggle={toggle}
              handlers={handlers}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HierarchyTree({
  initiatives,
  handlers,
  className,
  defaultExpandedIds,
  onSelect,
  onAction,
}: {
  initiatives: readonly Initiative[];
  handlers?: InlineEditHandlers;
  className?: string;
  defaultExpandedIds?: string[];
  onSelect?: (selection: HorizonSelection) => void;
  onAction?: (action: HierarchyActionId, selection: HorizonSelection) => void;
}) {
  const defaults =
    defaultExpandedIds ??
    initiatives.flatMap((init) => [init.id, ...init.workstreams.map((ws) => ws.id)]);
  const { isExpanded, toggle } = useExpandedSet(defaults);

  return (
    <div className={cn("space-y-4", className)} role="tree" aria-label="Initiative hierarchy">
      {initiatives.map((initiative) => {
        const open = isExpanded(initiative.id);
        const selection: HorizonSelection = {
          id: initiative.id,
          kind: "initiative",
          title: initiative.name,
          subtitle: initiative.description,
        };
        return (
          <div
            key={initiative.id}
            className="space-y-2.5"
            role="treeitem"
            aria-expanded={open}
            aria-selected={false}
          >
            <InitiativeCard
              node={initiative}
              expanded={open}
              onToggle={() => toggle(initiative.id)}
              onChange={(patch) => handlers?.onInitiativeChange?.(initiative.id, patch)}
              onOpenDetail={() => onSelect?.(selection)}
              onAction={(action) => onAction?.(action, selection)}
            />
            {open && initiative.workstreams.length > 0 ? (
              <div className="ml-3 space-y-2.5 border-l border-teal-500/15 pl-3">
                {initiative.workstreams.map((ws) => (
                  <WorkstreamBranch
                    key={ws.id}
                    node={ws}
                    depth={0}
                    isExpanded={isExpanded}
                    toggle={toggle}
                    handlers={handlers}
                    onSelect={onSelect}
                    onAction={onAction}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
