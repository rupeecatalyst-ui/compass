"use client";

import { useEffect, useState } from "react";
import { CommandShellLoading } from "@/components/design-system/command-shell-loading";
import type { Activity, HorizonSelection, Initiative, Milestone, Workstream } from "../../types";
import type { HierarchyActionId } from "../../components/HierarchyActionsMenu";
import type { InlineEditHandlers } from "../types";
import { createInitiativeWorkspaceProvider } from "../providers";
import { HierarchyTree } from "./HierarchyTree";

/**
 * Initiatives Workspace — primary working area inside Horizon.
 * Expandable hierarchy · inline edit · same-page detail (via parent slide-over).
 */
export function InitiativesWorkspace({
  className,
  initiatives: initiativesProp,
  handlers,
  onSelect,
  onAction,
}: {
  className?: string;
  /** When provided, uses parent workspace data (preferred). */
  initiatives?: Initiative[];
  handlers?: InlineEditHandlers;
  onSelect?: (selection: HorizonSelection) => void;
  onAction?: (action: HierarchyActionId, selection: HorizonSelection) => void;
}) {
  const [localInitiatives, setLocalInitiatives] = useState<Initiative[] | null>(
    initiativesProp ?? null,
  );
  const [asOf, setAsOf] = useState<string>(new Date().toISOString());

  useEffect(() => {
    if (initiativesProp) {
      setLocalInitiatives(initiativesProp);
      return;
    }
    let cancelled = false;
    void createInitiativeWorkspaceProvider()
      .getWorkspace()
      .then((page) => {
        if (cancelled) return;
        setLocalInitiatives(page.initiatives);
        setAsOf(page.asOf);
      });
    return () => {
      cancelled = true;
    };
  }, [initiativesProp]);

  const applyPatch = <T extends { id: string }>(
    list: T[],
    id: string,
    patch: Partial<T>,
  ): T[] => list.map((item) => (item.id === id ? { ...item, ...patch } : item));

  const localHandlers: InlineEditHandlers = {
    onInitiativeChange: (id, patch) => {
      setLocalInitiatives((prev) => {
        if (!prev) return prev;
        return applyPatch(prev, id, patch);
      });
      handlers?.onInitiativeChange?.(id, patch);
    },
    onWorkstreamChange: (id, patch) => {
      setLocalInitiatives((prev) => {
        if (!prev) return prev;
        return prev.map((init) => ({
          ...init,
          workstreams: patchWorkstreams(init.workstreams, id, patch),
        }));
      });
      handlers?.onWorkstreamChange?.(id, patch);
    },
    onMilestoneChange: (id, patch) => {
      setLocalInitiatives((prev) => {
        if (!prev) return prev;
        return prev.map((init) => ({
          ...init,
          workstreams: init.workstreams.map((ws) => ({
            ...ws,
            milestones: patchMilestones(ws.milestones, id, patch),
            workstreams: ws.workstreams?.map((child) => ({
              ...child,
              milestones: patchMilestones(child.milestones, id, patch),
            })),
          })),
        }));
      });
      handlers?.onMilestoneChange?.(id, patch);
    },
    onActivityChange: (id, patch) => {
      setLocalInitiatives((prev) => {
        if (!prev) return prev;
        return prev.map((init) => ({
          ...init,
          workstreams: mapWorkstreamsActivities(init.workstreams, id, patch),
        }));
      });
      handlers?.onActivityChange?.(id, patch);
    },
  };

  if (!localInitiatives) {
    return (
      <section
        className={className}
        aria-label="Initiatives Workspace"
        role="status"
        aria-live="polite"
      >
        <CommandShellLoading
          label="Loading Initiatives Workspace…"
          className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-500"
        />
      </section>
    );
  }

  return (
    <section className={className} aria-label="Initiatives Workspace">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-400/80">
            Initiatives Workspace
          </p>
          <h2 className="mt-1 text-base font-semibold text-zinc-50">
            Expand · nest · refine
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Initiative → Workstream → Milestone → Activity · inline edit · slide-over detail · no
            drag-and-drop yet
          </p>
        </div>
        <p className="text-[10px] tabular-nums text-zinc-600">
          {localInitiatives.length} initiatives · as of{" "}
          {new Date(asOf).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {localInitiatives.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
          No initiatives in the workspace yet.
        </div>
      ) : (
        <HierarchyTree
          initiatives={localInitiatives}
          handlers={localHandlers}
          onSelect={onSelect}
          onAction={onAction}
        />
      )}
    </section>
  );
}

/** @deprecated Prefer InitiativesWorkspace */
export const InitiativeWorkspace = InitiativesWorkspace;

function patchWorkstreams(
  workstreams: Workstream[],
  id: string,
  patch: Partial<Workstream>,
): Workstream[] {
  return workstreams.map((ws) => {
    if (ws.id === id) return { ...ws, ...patch };
    return {
      ...ws,
      workstreams: ws.workstreams ? patchWorkstreams(ws.workstreams, id, patch) : ws.workstreams,
    };
  });
}

function patchMilestones(
  milestones: Milestone[],
  id: string,
  patch: Partial<Milestone>,
): Milestone[] {
  return milestones.map((ms) => {
    if (ms.id === id) return { ...ms, ...patch };
    return {
      ...ms,
      milestones: ms.milestones ? patchMilestones(ms.milestones, id, patch) : ms.milestones,
    };
  });
}

function patchActivities(
  activities: Activity[],
  id: string,
  patch: Partial<Activity>,
): Activity[] {
  return activities.map((act) => {
    if (act.id === id) return { ...act, ...patch };
    return {
      ...act,
      activities: act.activities ? patchActivities(act.activities, id, patch) : act.activities,
    };
  });
}

function mapWorkstreamsActivities(
  workstreams: Workstream[],
  id: string,
  patch: Partial<Activity>,
): Workstream[] {
  return workstreams.map((ws) => ({
    ...ws,
    milestones: ws.milestones.map((ms) => ({
      ...ms,
      activities: patchActivities(ms.activities, id, patch),
      milestones: ms.milestones?.map((child) => ({
        ...child,
        activities: patchActivities(child.activities, id, patch),
      })),
    })),
    workstreams: ws.workstreams ? mapWorkstreamsActivities(ws.workstreams, id, patch) : ws.workstreams,
  }));
}
