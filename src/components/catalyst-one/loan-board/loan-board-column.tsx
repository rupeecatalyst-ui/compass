"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { LOAN_BOARD_STAGE_COLORS } from "@/constants/loan-board";
import { formatINRCompact } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LoanBoardDensity, LoanBoardFieldKey } from "@/constants/loan-board";
import type { LoanFile, LoanFileColumnStats, PipelineStage } from "@/types/catalyst-one";
import { LoanBoardCard } from "./loan-board-card";
import { AnimatePresence } from "framer-motion";

interface LoanBoardColumnProps {
  stats: LoanFileColumnStats;
  files: LoanFile[];
  density: LoanBoardDensity;
  visibleFields: LoanBoardFieldKey[];
  collapsed: boolean;
  isDragOver: boolean;
  onToggleCollapse: () => void;
  onOpen: (id: string) => void;
  onDragStart: (e: React.DragEvent, fileId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onMoveStage: (fileId: string) => void;
}

const columnWidth: Record<LoanBoardDensity, string> = {
  compact: "w-[212px]",
  medium: "w-[248px]",
  large: "w-[284px]",
};

export function LoanBoardColumn({
  stats,
  files,
  density,
  visibleFields,
  collapsed,
  isDragOver,
  onToggleCollapse,
  onOpen,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onMoveStage,
}: LoanBoardColumnProps) {
  const color = LOAN_BOARD_STAGE_COLORS[stats.stage as PipelineStage] ?? "#64748b";

  if (collapsed) {
    return (
      <div
        className={cn("flex shrink-0 flex-col h-full", columnWidth.compact)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-full flex-col items-center gap-2 rounded-lg border border-border bg-card/60 px-1.5 py-3 hover:bg-muted/30 transition-colors"
          style={{ borderTopWidth: 3, borderTopColor: color }}
        >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180">
            {stats.label}
          </span>
          <span className="text-xs font-bold text-foreground tabular-nums">{stats.count}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn("flex shrink-0 flex-col h-full", columnWidth[density])}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        className={cn(
          "shrink-0 rounded-t-lg border border-b-0 border-border bg-card/80 backdrop-blur-sm px-2 py-1.5 transition-colors",
          isDragOver && "border-primary/40 bg-primary/5",
        )}
        style={{ borderTopWidth: 3, borderTopColor: color }}
      >
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-xs font-semibold text-foreground truncate">{stats.label}</h3>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={onToggleCollapse}>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
          {stats.count} {stats.count === 1 ? "File" : "Files"}
        </p>
        <p className="text-sm font-bold text-success tabular-nums leading-tight mt-0.5">
          {formatINRCompact(stats.totalValue)}
        </p>
        {stats.avgAgeing !== undefined && stats.avgAgeing > 0 && (
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
            Avg Age {stats.avgAgeing}d
          </p>
        )}
      </div>

      <div
        className={cn(
          "flex-1 min-h-0 rounded-b-lg border border-t-0 border-border bg-muted/20 p-1 overflow-y-auto scrollbar-thin",
          isDragOver && "bg-primary/5 border-primary/30",
        )}
      >
        <div className="space-y-0.5">
          <AnimatePresence mode="popLayout">
            {files.map((file) => (
              <LoanBoardCard
                key={file.id}
                file={file}
                density={density}
                visibleFields={visibleFields}
                onOpen={onOpen}
                onDragStart={onDragStart}
                onMoveStage={onMoveStage}
              />
            ))}
          </AnimatePresence>
          {files.length === 0 && (
            <div
              className={cn(
                "flex h-14 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground",
                isDragOver && "border-primary/40 text-primary",
              )}
            >
              {isDragOver ? "Drop here" : "No files"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
