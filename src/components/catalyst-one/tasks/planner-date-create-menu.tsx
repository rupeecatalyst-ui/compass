"use client";

/**
 * CO-TASKS-PLANNER-003 — Date-cell create actions (workspace, not calendar widget).
 */

import { Plus } from "lucide-react";
import { PLANNER_CREATE_INTENTS, type PlannerCreateIntent } from "@/constants/enterprise-planner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function PlannerDateCreateMenu({
  dateLabel,
  onSelectIntent,
  compact,
  className,
}: {
  dateLabel: string;
  onSelectIntent: (intent: PlannerCreateIntent) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-6 gap-1 border border-dashed border-white/15 bg-transparent px-1.5 text-[10px] text-slate-400 hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-teal-100",
            compact && "size-6 justify-center px-0",
            className,
          )}
          aria-label={`Add work on ${dateLabel}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Plus className="size-3" />
          {compact ? null : <span>Add</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-52 border-white/10 bg-[#0b1220] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-slate-500">
          {dateLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {PLANNER_CREATE_INTENTS.map((intent) => (
          <DropdownMenuItem
            key={intent.id}
            className="cursor-pointer text-xs focus:bg-teal-500/15 focus:text-teal-50"
            onSelect={() => onSelectIntent(intent)}
          >
            {intent.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
