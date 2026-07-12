"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { EnterpriseGridColumnDef } from "./types";
import { useEnterpriseGridPreferences } from "./use-enterprise-grid-preferences";

interface EnterpriseDataGridProps<T> {
  storageKey: string;
  columns: EnterpriseGridColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function EnterpriseDataGrid<T>({
  storageKey,
  columns,
  rows,
  rowKey,
  emptyMessage = "No records found.",
  onRowClick,
  className,
}: EnterpriseDataGridProps<T>) {
  const {
    activeView,
    visibleColumns,
    toggleColumn,
    moveColumn,
    setColumnWidth,
    resetToDefault,
    prefs,
    setActiveViewId,
  } = useEnterpriseGridPreferences(storageKey, columns);

  const [resizing, setResizing] = useState<string | null>(null);

  const frozenIds = useMemo(
    () => new Set(activeView.frozenColumnIds),
    [activeView.frozenColumnIds],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Columns3 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Show / hide</DropdownMenuLabel>
            {columns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={activeView.visibleColumnIds.includes(col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Views</DropdownMenuLabel>
            {prefs.views.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => setActiveViewId(view.id)}
                className={cn(view.id === activeView.id && "bg-accent")}
              >
                {view.name}
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                  {view.scope}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetToDefault}>Reset to default view</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    "relative px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    frozenIds.has(col.id) && "sticky left-0 z-10 bg-muted/90 backdrop-blur",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                  )}
                  style={{
                    width: activeView.columnWidths[col.id] ?? col.defaultWidth ?? 140,
                    minWidth: col.minWidth ?? 80,
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span className="flex-1 truncate">{col.label}</span>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-background"
                      aria-label={`Move ${col.label} left`}
                      onClick={() => moveColumn(col.id, "left")}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-background"
                      aria-label={`Move ${col.label} right`}
                      onClick={() => moveColumn(col.id, "right")}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                    <span
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setResizing(col.id);
                        const startX = e.clientX;
                        const startW =
                          activeView.columnWidths[col.id] ?? col.defaultWidth ?? 140;
                        const onMove = (ev: MouseEvent) => {
                          const next = startW + (ev.clientX - startX);
                          // width updates via preference hook are debounced by mouseup only
                          (e.currentTarget as HTMLElement).parentElement!.style.width = `${Math.max(80, next)}px`;
                        };
                        const onUp = (ev: MouseEvent) => {
                          const next = Math.max(80, startW + (ev.clientX - startX));
                          setColumnWidth(col.id, next);
                          window.removeEventListener("mousemove", onMove);
                          window.removeEventListener("mouseup", onUp);
                          setResizing(null);
                        };
                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                    />
                    <GripVertical
                      className={cn(
                        "h-3 w-3 text-muted-foreground/50",
                        resizing === col.id && "text-primary",
                      )}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(visibleColumns.length, 1)}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-b border-border/70 transition-colors hover:bg-muted/30",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        "px-3 py-2.5 align-middle text-foreground",
                        frozenIds.has(col.id) && "sticky left-0 z-[1] bg-card",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right",
                      )}
                      style={{
                        width: activeView.columnWidths[col.id] ?? col.defaultWidth ?? 140,
                        minWidth: col.minWidth ?? 80,
                      }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
