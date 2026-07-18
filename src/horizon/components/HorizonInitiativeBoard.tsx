"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity, Initiative, Milestone, ModeId, Workstream } from "../types";
import { HorizonChanakyaStrip } from "./HorizonChanakyaStrip";
import { StatusBadge } from "./StatusBadge";
import { ProgressIndicator } from "./ProgressIndicator";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Single-screen initiative board.
 * Hierarchy frozen: Initiative → Workstream → Milestone → Activity.
 */
export function HorizonInitiativeBoard({
  initiatives,
  mode,
  asOf,
}: {
  initiatives: Initiative[];
  mode: ModeId;
  asOf: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="Horizon initiatives"
    >
      {initiatives.map((initiative) => {
        const expanded = expandedId === initiative.id;
        return (
          <article
            key={initiative.id}
            className={cn(
              "flex flex-col rounded-xl border border-zinc-800/90 bg-zinc-950/70 shadow-sm transition-shadow",
              expanded && "sm:col-span-2 xl:col-span-3 border-cyan-500/20 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]",
            )}
          >
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : initiative.id)}
              className="flex w-full items-start gap-3 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
              aria-expanded={expanded}
            >
              <span className="mt-0.5 text-zinc-500">
                {expanded ? (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold leading-snug text-zinc-50">
                    {initiative.name}
                  </h2>
                  <StatusBadge status={initiative.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <ProgressIndicator value={initiative.progress} size="sm" />
                  <p className="text-[11px] text-zinc-500">
                    Target{" "}
                    <span className="font-medium text-zinc-300">{formatDate(initiative.targetDate)}</span>
                  </p>
                </div>
              </div>
            </button>

            {expanded ? (
              <div className="border-t border-zinc-800/80 px-4 pb-4 pt-3">
                <HorizonChanakyaStrip initiative={initiative} asOf={asOf} />
                <div className="mt-4 space-y-3">
                  {initiative.workstreams.length === 0 ? (
                    <p className="text-xs text-zinc-500">No workstreams yet.</p>
                  ) : (
                    initiative.workstreams.map((ws) => (
                      <WorkstreamBlock key={ws.id} workstream={ws} mode={mode} />
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function WorkstreamBlock({ workstream, mode }: { workstream: Workstream; mode: ModeId }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Workstream
          </p>
          <p className="truncate text-xs font-medium text-zinc-100">{workstream.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={workstream.status} />
          <span className="text-[10px] tabular-nums text-zinc-500">{workstream.progress}%</span>
        </div>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-zinc-800/80 px-3 py-2.5">
          {workstream.milestones.map((ms) => (
            <MilestoneBlock key={ms.id} milestone={ms} mode={mode} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MilestoneBlock({ milestone, mode }: { milestone: Milestone; mode: ModeId }) {
  const [open, setOpen] = useState(mode === "operational");
  // Frozen hierarchy — top-level activities only (ignore nested activity trees)
  const activities = (milestone.activities ?? []).map((a) => ({
    ...a,
    activities: undefined,
  }));

  return (
    <div className="rounded-md border border-zinc-800/80 bg-zinc-950/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Milestone
          </p>
          <p className="truncate text-xs font-medium text-zinc-100">{milestone.name}</p>
          <p className="text-[10px] text-zinc-500">Target {formatDate(milestone.targetDate)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={milestone.status} />
          <span className="text-[10px] tabular-nums text-zinc-500">{milestone.progress}%</span>
        </div>
      </button>
      {open ? (
        <ul className="space-y-1 border-t border-zinc-800/60 px-2.5 py-2">
          {activities.length === 0 ? (
            <li className="text-[11px] text-zinc-500">No activities</li>
          ) : mode === "strategic" ? (
            <li className="text-[11px] text-zinc-500">
              {activities.length} activit{activities.length === 1 ? "y" : "ies"} · switch to
              Operational Mode for detail
            </li>
          ) : (
            activities.map((act) => <ActivityRow key={act.id} activity={act} />)
          )}
        </ul>
      ) : null}
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px] text-zinc-300">
      <span className="min-w-0 truncate">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
          Activity ·{" "}
        </span>
        {activity.title}
      </span>
      <span className="shrink-0 tabular-nums text-zinc-500">{activity.completion}%</span>
    </li>
  );
}
