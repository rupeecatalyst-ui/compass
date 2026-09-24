"use client";

import { MY_DEALS_KANBAN_COLUMNS } from "@/constants/my-deals-kanban";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MyDealsKanbanStageFilter({
  selectedStageIds,
  onChange,
}: {
  selectedStageIds: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = new Set(selectedStageIds);

  const toggle = (id: string) => {
    if (selected.has(id)) onChange(selectedStageIds.filter((s) => s !== id));
    else onChange([...selectedStageIds, id]);
  };

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
      data-surface="my-deals-kanban-stage-filter"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Stages
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-[10px]"
        onClick={() => onChange(MY_DEALS_KANBAN_COLUMNS.map((c) => c.id))}
      >
        Select All
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-[10px]"
        onClick={() => onChange([])}
      >
        Clear All
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-[10px]"
        onClick={() =>
          onChange(MY_DEALS_KANBAN_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id))
        }
      >
        Restore Default
      </Button>
      {MY_DEALS_KANBAN_COLUMNS.map((column) => {
        const on = selected.has(column.id);
        return (
          <button
            key={column.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(column.id)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
              on
                ? "border-teal-500/50 bg-teal-500/15 text-teal-100"
                : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200",
              !column.defaultSelected && !on ? "opacity-80" : "",
            )}
          >
            {column.label}
          </button>
        );
      })}
    </div>
  );
}
