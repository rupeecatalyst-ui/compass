"use client";

import { cn } from "@/lib/utils";
import { OW_STRATEGIC_NAV, type OwStrategicTabId } from "./strategic-tabs";

/**
 * Strategic Workspace v2 — horizontal tabs (replaces left vertical nav).
 * Lender Strategy (LIFE) uses a distinct accent as the primary strategic activity.
 * CO-C1-DIALOGUE-002A — Activity Timeline gets a soft teal cue for discoverability.
 */
export function WorkspaceStrategicTabs({
  active,
  onSelect,
}: {
  active: OwStrategicTabId;
  onSelect: (id: OwStrategicTabId) => void;
}) {
  return (
    <div className="border-b border-white/10 bg-zinc-950/40">
      <nav
        className="flex gap-0.5 overflow-x-auto px-2 py-1.5 scrollbar-thin"
        aria-label="Strategic Workspace tabs"
      >
        {OW_STRATEGIC_NAV.map((item) => {
          const selected = active === item.id;
          const isLife = item.id === "funding_strategy";
          const isTimeline = item.id === "timeline";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                isLife &&
                  !selected &&
                  "border border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
                isLife &&
                  selected &&
                  "border border-amber-400/60 bg-amber-500/25 text-amber-50 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]",
                isTimeline &&
                  !selected &&
                  "border border-teal-500/30 bg-teal-500/5 text-teal-100 hover:bg-teal-500/15",
                !isLife &&
                  selected &&
                  "bg-teal-500/20 text-teal-50 ring-1 ring-teal-400/40",
                !isLife &&
                  !isTimeline &&
                  !selected &&
                  "text-zinc-300 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
