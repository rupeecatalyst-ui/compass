"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  GripVertical,
  Pin,
  RotateCcw,
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
import { buildEnterpriseGridStorageKey } from "./storage-key";
import { useEnterpriseGridPreferences } from "./use-enterprise-grid-preferences";

export type EnterpriseGridSortDirection = "asc" | "desc";

/** Enterprise Table Standard — dense spreadsheet listing vs default card-adjacent spacing. */
export type EnterpriseGridDensity = "default" | "compact";

interface EnterpriseDataGridProps<T> {
  storageKey: string;
  /**
   * Authenticated user id — scopes saved column layout per user.
   * Anonymous / missing → shared "anonymous" bucket for the browser.
   */
  userId?: string | null;
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
  /**
   * `compact` = Enterprise Table Standard (Excel-like operational listing).
   * Prefer for directory / comparison pages; use default for softer surfaces.
   */
  density?: EnterpriseGridDensity;
}

export function EnterpriseDataGrid<T>({
  storageKey,
  userId,
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
  maxHeightClassName,
  density = "default",
}: EnterpriseDataGridProps<T>) {
  const compact = density === "compact";
  const scopedKey = useMemo(
    () => buildEnterpriseGridStorageKey(storageKey, userId),
    [storageKey, userId],
  );
  const scrollMax =
    maxHeightClassName ??
    (compact ? "max-h-[min(78vh,900px)]" : "max-h-[min(70vh,720px)]");
  const cellPad = compact ? "px-2 py-1" : "px-3 py-2.5";
  const headPad = compact ? "px-2 py-1.5" : "px-3 py-2.5";
  const bodyText = compact ? "text-[12px] leading-4" : "text-[13px]";
  const {
    activeView,
    visibleColumns,
    toggleColumn,
    toggleFreezeColumn,
    resetToDefault,
    reorderColumn,
    prefs,
    setActiveViewId,
    setColumnWidth,
  } = useEnterpriseGridPreferences(scopedKey, columns);

  const [resizing, setResizing] = useState<string | null>(null);
  const [draggingCol, setDraggingCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const frozenIds = useMemo(
    () => new Set(activeView.frozenColumnIds),
    [activeView.frozenColumnIds],
  );

  return (
    <div className={cn(compact ? "space-y-1.5" : "space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            "font-medium uppercase tracking-[0.12em] text-muted-foreground",
            compact ? "text-[10px]" : "text-xs tracking-[0.14em]",
          )}
        >
          {toolbarLabel}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {toolbarActions}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("gap-1.5", compact ? "h-7 rounded-md text-[11px]" : "h-8 rounded-lg")}
            onClick={resetToDefault}
            title="Restore default column layout"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Columns
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("gap-1.5", compact ? "h-7 rounded-md text-[11px]" : "h-8 rounded-lg")}
              >
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
              <DropdownMenuItem onClick={resetToDefault}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Reset Columns
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className={cn(
          "overflow-auto border bg-card",
          compact
            ? "rounded-sm border-slate-300 dark:border-zinc-700"
            : "rounded-xl border-border/80 shadow-sm shadow-black/[0.02]",
          scrollMax,
        )}
      >
        <table
          className={cn(
            "w-full min-w-[1280px] border-collapse",
            compact ? "text-[12px]" : "text-sm",
          )}
        >
          <thead className="sticky top-0 z-20">
            <tr
              className={cn(
                "border-b bg-slate-100 dark:bg-zinc-900",
                compact
                  ? "border-slate-300 dark:border-zinc-700"
                  : "border-border bg-slate-50/95 backdrop-blur dark:bg-zinc-900/95",
              )}
            >
              {visibleColumns.map((col) => {
                const sortable = Boolean(col.sortable && onSort);
                const active = sortColumnId === col.id;
                const isDragOver = dragOverCol === col.id && draggingCol !== col.id;
                return (
                  <th
                    key={col.id}
                    draggable={resizing !== col.id}
                    onDragStart={(e) => {
                      if (resizing) {
                        e.preventDefault();
                        return;
                      }
                      setDraggingCol(col.id);
                      e.dataTransfer.setData("text/plain", col.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverCol !== col.id) setDragOverCol(col.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverCol === col.id) setDragOverCol(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = e.dataTransfer.getData("text/plain") || draggingCol;
                      if (sourceId) reorderColumn(sourceId, col.id);
                      setDraggingCol(null);
                      setDragOverCol(null);
                    }}
                    onDragEnd={() => {
                      setDraggingCol(null);
                      setDragOverCol(null);
                    }}
                    className={cn(
                      "relative text-left font-semibold uppercase text-muted-foreground",
                      headPad,
                      compact
                        ? "border-r border-slate-200 text-[10px] tracking-[0.04em] last:border-r-0 dark:border-zinc-800"
                        : "text-[11px] tracking-[0.08em]",
                      frozenIds.has(col.id) &&
                        (compact
                          ? "sticky left-0 z-30 bg-slate-100 dark:bg-zinc-900"
                          : "sticky left-0 z-30 bg-slate-50/95 backdrop-blur dark:bg-zinc-900/95"),
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      draggingCol === col.id && "opacity-50",
                      isDragOver && "bg-sky-100/80 dark:bg-sky-950/50",
                    )}
                    style={{
                      width: activeView.columnWidths[col.id] ?? col.defaultWidth ?? 140,
                      minWidth: col.minWidth ?? 80,
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-1">
                      <span
                        className="inline-flex shrink-0 cursor-grab text-muted-foreground/70 active:cursor-grabbing"
                        title="Drag to reorder"
                        aria-label={`Reorder ${col.label}`}
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                      {sortable ? (
                        <button
                          type="button"
                          className="inline-flex min-w-0 max-w-full items-center gap-1 hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSort?.(col.id);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
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
                    </div>
                    <span
                      className={cn(
                        "absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/35",
                        resizing === col.id && "bg-primary/50",
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
                      draggable={false}
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
                      "transition-colors duration-75",
                      compact
                        ? "border-b border-slate-200 dark:border-zinc-800"
                        : "border-b border-border/50",
                      index % 2 === 1 &&
                        (compact
                          ? "bg-slate-50/80 dark:bg-white/[0.025]"
                          : "bg-slate-50/60 dark:bg-white/[0.02]"),
                      onRowClick && "cursor-pointer",
                      compact
                        ? "hover:bg-sky-50 dark:hover:bg-sky-950/40"
                        : "hover:bg-teal-50/70 dark:hover:bg-teal-950/30",
                      highlighted &&
                        (compact
                          ? "bg-sky-50 ring-1 ring-inset ring-sky-300/60 dark:bg-sky-950/50"
                          : "bg-teal-50/90 ring-1 ring-inset ring-primary/20 dark:bg-teal-950/40"),
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "align-middle text-foreground",
                          cellPad,
                          bodyText,
                          compact &&
                            "border-r border-slate-100 last:border-r-0 dark:border-zinc-800/80",
                          frozenIds.has(col.id) &&
                            cn(
                              "sticky left-0 z-[1]",
                              index % 2 === 1
                                ? "bg-slate-50 dark:bg-zinc-950"
                                : "bg-card",
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
      <p className="text-[10px] text-muted-foreground">
        Drag column headers to reorder · layout saved for this user
      </p>
    </div>
  );
}
