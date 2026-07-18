"use client";

import { type ReactNode, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Pin } from "lucide-react";
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

export type EnterpriseGridSortDirection = "asc" | "desc";

interface EnterpriseDataGridProps<T> {
  storageKey: string;
  columns: EnterpriseGridColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  highlightedRowKey?: string | null;
  /** Optional toolbar label (left) */
  toolbarLabel?: string;
  /** Optional actions (right of column chooser) */
  toolbarActions?: ReactNode;
  /** Optional second header row (column filters) */
  filterRow?: ReactNode;
  sortColumnId?: string | null;
  sortDirection?: EnterpriseGridSortDirection;
  onSort?: (columnId: string) => void;
  maxHeightClassName?: string;
}

export function EnterpriseDataGrid<T>({
  storageKey,
  columns,
  rows,
  rowKey,
  emptyMessage = "No records found.",
  onRowClick,
  className,
  highlightedRowKey,
  toolbarLabel = "Enterprise grid",
  toolbarActions,
  filterRow,
  sortColumnId,
  sortDirection = "asc",
  onSort,
  maxHeightClassName = "max-h-[min(70vh,720px)]",
}: EnterpriseDataGridProps<T>) {
  const {
    activeView,
    visibleColumns,
    toggleColumn,
    toggleFreezeColumn,
    resetToDefault,
    prefs,
    setActiveViewId,
    setColumnWidth,
  } = useEnterpriseGridPreferences(storageKey, columns);

  const [resizing, setResizing] = useState<string | null>(null);

  const frozenIds = useMemo(
    () => new Set(activeView.frozenColumnIds),
    [activeView.frozenColumnIds],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {toolbarLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarActions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-2 rounded-lg">
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
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
              <DropdownMenuLabel className="flex items-center gap-1.5">
                <Pin className="h-3 w-3" /> Freeze columns
              </DropdownMenuLabel>
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={`freeze-${col.id}`}
                  checked={activeView.frozenColumnIds.includes(col.id)}
                  onCheckedChange={() => toggleFreezeColumn(col.id)}
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
      </div>

      <div
        className={cn(
          "overflow-auto rounded-xl border border-border/80 bg-card shadow-sm shadow-black/[0.02]",
          maxHeightClassName,
        )}
      >
        <table className="w-full min-w-[1280px] border-collapse text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-border bg-slate-50/95 backdrop-blur dark:bg-zinc-900/95">
              {visibleColumns.map((col) => {
                const sortable = Boolean(col.sortable && onSort);
                const active = sortColumnId === col.id;
                return (
                  <th
                    key={col.id}
                    className={cn(
                      "relative px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                      frozenIds.has(col.id) &&
                        "sticky left-0 z-30 bg-slate-50/95 backdrop-blur dark:bg-zinc-900/95",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                    )}
                    style={{
                      width: activeView.columnWidths[col.id] ?? col.defaultWidth ?? 140,
                      minWidth: col.minWidth ?? 80,
                    }}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className="inline-flex max-w-full items-center gap-1 hover:text-foreground"
                        onClick={() => onSort?.(col.id)}
                      >
                        <span className="truncate">{col.label}</span>
                        {active ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 shrink-0" />
                          ) : (
                            <ArrowDown className="h-3 w-3 shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" />
                        )}
                      </button>
                    ) : (
                      <span className="truncate">{col.label}</span>
                    )}
                    <span
                      className={cn(
                        "absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/35",
                        resizing === col.id && "bg-primary/50",
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setResizing(col.id);
                        const startX = e.clientX;
                        const startW =
                          activeView.columnWidths[col.id] ?? col.defaultWidth ?? 140;
                        const onMove = (ev: MouseEvent) => {
                          const next = Math.max(80, startW + (ev.clientX - startX));
                          const th = (e.target as HTMLElement).closest("th");
                          if (th) th.style.width = `${next}px`;
                        };
                        const onUp = (ev: MouseEvent) => {
                          setColumnWidth(col.id, Math.max(80, startW + (ev.clientX - startX)));
                          window.removeEventListener("mousemove", onMove);
                          window.removeEventListener("mouseup", onUp);
                          setResizing(null);
                        };
                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                    />
                  </th>
                );
              })}
            </tr>
            {filterRow}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(visibleColumns.length, 1)}
                  className="px-6 py-16 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const key = rowKey(row);
                const highlighted = highlightedRowKey === key;
                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-b border-border/50 transition-colors duration-150",
                      index % 2 === 1 && "bg-slate-50/60 dark:bg-white/[0.02]",
                      onRowClick && "cursor-pointer",
                      "hover:bg-teal-50/70 dark:hover:bg-teal-950/30",
                      highlighted &&
                        "bg-teal-50/90 ring-1 ring-inset ring-primary/20 dark:bg-teal-950/40",
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "px-3 py-2.5 align-middle text-[13px] text-foreground",
                          frozenIds.has(col.id) &&
                            cn(
                              "sticky left-0 z-[1]",
                              index % 2 === 1 ? "bg-slate-50 dark:bg-zinc-950" : "bg-card",
                            ),
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
