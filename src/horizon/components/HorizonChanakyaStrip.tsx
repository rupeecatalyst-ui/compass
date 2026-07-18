"use client";

import { ChanakyaMark } from "@/components/layout/chanakya-mark";
import type { Initiative } from "../types";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function nextMilestone(initiative: Initiative): { title: string; targetDate?: string } | null {
  for (const ws of initiative.workstreams) {
    for (const ms of ws.milestones) {
      if (ms.status !== "completed" && ms.status !== "cancelled") {
        return { title: ms.name, targetDate: ms.targetDate };
      }
    }
  }
  return null;
}

function delayLabel(initiative: Initiative): string | null {
  if (!initiative.targetDate) return null;
  const target = new Date(initiative.targetDate).getTime();
  if (Number.isNaN(target)) return null;
  const days = Math.ceil((target - Date.now()) / 86400000);
  if (initiative.status === "completed") return null;
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past target`;
  if (days === 0) return "Target date is today";
  if (days <= 14) return `${days} day${days === 1 ? "" : "s"} to target`;
  return null;
}

/**
 * Horizon CHANAKYA — factual status only.
 * No advice, recommendations, coaching, or analysis.
 */
export function HorizonChanakyaStrip({
  initiative,
  asOf,
}: {
  initiative: Initiative;
  asOf: string;
}) {
  const next = nextMilestone(initiative);
  const delay = delayLabel(initiative);

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
      <ChanakyaMark size="xs" status="normal" className="mt-0.5" />
      <ul className="min-w-0 flex-1 space-y-0.5 text-[11px] text-zinc-400">
        <li>
          Last updated{" "}
          <span className="font-medium text-zinc-200">
            {new Date(asOf).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </li>
        <li>
          Current status{" "}
          <span className="font-medium capitalize text-zinc-200">
            {initiative.status.replace(/_/g, " ")}
          </span>
        </li>
        <li>
          Next milestone{" "}
          <span className="font-medium text-zinc-200">
            {next
              ? `${next.title}${next.targetDate ? ` · ${formatDate(next.targetDate)}` : ""}`
              : "None scheduled"}
          </span>
        </li>
        {delay ? (
          <li>
            Delay information <span className="font-medium text-zinc-200">{delay}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
