"use client";

import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import type { DashboardDatePreset } from "@/lib/dashboard-date-utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRESET_OPTIONS: { value: DashboardDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "quarter", label: "Quarter" },
  { value: "financial_year", label: "Financial Year" },
  { value: "custom", label: "Custom" },
];

interface DashboardDateFilterProps {
  compact?: boolean;
}

export function DashboardDateFilter({ compact = false }: DashboardDateFilterProps) {
  const { preset, customStart, customEnd, setPreset, setCustomStart, setCustomEnd } =
    useDashboardFilter();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", !compact && "flex-col sm:flex-row")}>
      <Select value={preset} onValueChange={(value) => setPreset(value as DashboardDatePreset)}>
        <SelectTrigger
          className={cn(
            "h-7 text-xs bg-slate-900/80 border-slate-700 text-slate-200",
            compact ? "w-[140px]" : "h-8 w-full sm:w-[160px]",
          )}
        >
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-7 w-[120px] text-xs bg-slate-900 border-slate-700"
          />
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-7 w-[120px] text-xs bg-slate-900 border-slate-700"
          />
        </div>
      )}
    </div>
  );
}
