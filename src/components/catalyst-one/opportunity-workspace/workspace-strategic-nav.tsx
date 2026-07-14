"use client";

import { cn } from "@/lib/utils";
import { OwGlassPanel, OwSectionLabel } from "./workspace-design";
import { OW_STRATEGIC_NAV, type OwStrategicTabId } from "./strategic-tabs";

/**
 * Prompt 017 — Left Strategic Navigation (implementation-target layout).
 */
export function WorkspaceStrategicNav({
  active,
  onSelect,
}: {
  active: OwStrategicTabId;
  onSelect: (id: OwStrategicTabId) => void;
}) {
  return (
    <OwGlassPanel className="flex h-full min-h-0 flex-col !p-0 overflow-hidden">
      <div className="border-b border-white/10 px-3 py-3">
        <OwSectionLabel>Strategic Workflow</OwSectionLabel>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Analyse · Plan · Structure · Qualify
        </p>
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        {OW_STRATEGIC_NAV.map((item, index) => {
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] font-medium transition-colors",
                selected
                  ? "bg-teal-500/20 text-teal-100 ring-1 ring-teal-400/40"
                  : "text-zinc-300 hover:bg-white/5 hover:text-zinc-50",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums",
                  selected ? "bg-teal-500 text-zinc-950" : "bg-white/10 text-zinc-400",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </OwGlassPanel>
  );
}
