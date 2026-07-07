import { cn } from "@/lib/utils";
import type { PriorityItem, PriorityLevel } from "@/modules/intelligence/types";

const LEVEL_ORDER: PriorityLevel[] = ["critical", "high", "medium", "low"];

const LEVEL_LABELS: Record<PriorityLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const LEVEL_STYLES: Record<PriorityLevel, string> = {
  critical: "border-red-800/60 text-red-300",
  high: "border-amber-800/60 text-amber-300",
  medium: "border-slate-600 text-slate-300",
  low: "border-slate-700 text-slate-400",
};

function PriorityGroup({ level, items }: { level: PriorityLevel; items: PriorityItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4
        className={cn(
          "inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
          LEVEL_STYLES[level],
        )}
      >
        {LEVEL_LABELS[level]}
        <span className="ml-1.5 tabular-nums opacity-70">({items.length})</span>
      </h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-slate-800 bg-[#0f1419] px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-200">{item.title}</p>
              {item.dueLabel && (
                <span className="shrink-0 text-[10px] text-slate-500">{item.dueLabel}</span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 text-[10px] text-slate-600">
              {item.owner && <span>Owner · {item.owner}</span>}
              {item.loanRef && <span>{item.loanRef}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface PriorityPanelProps {
  items: PriorityItem[];
  className?: string;
  maxPerLevel?: number;
}

/** 10.3B — Grouped priority items panel. */
export function PriorityPanel({ items, className, maxPerLevel }: PriorityPanelProps) {
  const grouped = LEVEL_ORDER.map((level) => ({
    level,
    items: items.filter((i) => i.level === level).slice(0, maxPerLevel),
  }));

  return (
    <div className={cn("space-y-6", className)}>
      {grouped.map(({ level, items: levelItems }) => (
        <PriorityGroup key={level} level={level} items={levelItems} />
      ))}
    </div>
  );
}
