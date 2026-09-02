"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MyDealsKanbanCard } from "@/components/catalyst-one/my-deals/my-deals-kanban-card";
import {
  MyDealsKanbanComposer,
  type MyDealsKanbanComposerKind,
} from "@/components/catalyst-one/my-deals/my-deals-kanban-composer";
import { MyDealsKanbanFieldsControl } from "@/components/catalyst-one/my-deals/my-deals-kanban-fields-control";
import { MyDealsKanbanStageFilter } from "@/components/catalyst-one/my-deals/my-deals-kanban-stage-filter";
import { MY_DEALS_KANBAN_COLUMN_WIDTH_PX } from "@/constants/my-deals-kanban";
import type { MyDealsKanbanFieldId } from "@/constants/my-deals-kanban";
import { formatINRCompact } from "@/lib/format-currency";
import { groupDealsForMyDealsKanban } from "@/lib/my-deals/kanban-board";
import type { DealRegistryRow } from "@/types/deal-registry";
import { cn } from "@/lib/utils";

export function MyDealsKanbanBoard({
  rows,
  selectedStageIds,
  visibleFieldIds,
  role,
  boardScrollLeft,
  columnScrollTops,
  onStageIdsChange,
  onFieldsApply,
  onScrollPersist,
  onOpenDeal,
  onOpenHref,
}: {
  rows: DealRegistryRow[];
  selectedStageIds: string[];
  visibleFieldIds: MyDealsKanbanFieldId[];
  role?: string | null;
  boardScrollLeft: number;
  columnScrollTops: Record<string, number>;
  onStageIdsChange: (next: string[]) => void;
  onFieldsApply: (next: MyDealsKanbanFieldId[]) => void;
  onScrollPersist: (patch: {
    boardScrollLeft?: number;
    columnScrollTops?: Record<string, number>;
  }) => void;
  onOpenDeal: (row: DealRegistryRow) => void;
  onOpenHref: (href: string, row: DealRegistryRow) => void;
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [composer, setComposer] = useState<{
    kind: MyDealsKanbanComposerKind;
    row: DealRegistryRow;
  } | null>(null);

  const columns = useMemo(
    () => groupDealsForMyDealsKanban(rows, selectedStageIds),
    [rows, selectedStageIds],
  );
  const visibleFields = useMemo(() => new Set(visibleFieldIds), [visibleFieldIds]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    el.scrollLeft = boardScrollLeft;
  }, [boardScrollLeft, selectedStageIds.join("|")]);

  useEffect(() => {
    for (const [id, top] of Object.entries(columnScrollTops)) {
      const el = columnRefs.current[id];
      if (el) el.scrollTop = top;
    }
  }, [columnScrollTops, selectedStageIds.join("|")]);

  const persistBoardScroll = () => {
    const el = boardRef.current;
    if (!el) return;
    onScrollPersist({ boardScrollLeft: el.scrollLeft });
  };

  const persistColumnScroll = (id: string) => {
    const el = columnRefs.current[id];
    if (!el) return;
    onScrollPersist({
      columnScrollTops: { ...columnScrollTops, [id]: el.scrollTop },
    });
  };

  const onBoardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const el = boardRef.current;
    if (!el) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      el.scrollBy({ left: MY_DEALS_KANBAN_COLUMN_WIDTH_PX, behavior: "smooth" });
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      el.scrollBy({ left: -MY_DEALS_KANBAN_COLUMN_WIDTH_PX, behavior: "smooth" });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-surface="my-deals-kanban">
      <div className="shrink-0 space-y-2 border-b border-zinc-800 px-2 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <MyDealsKanbanStageFilter
            selectedStageIds={selectedStageIds}
            onChange={onStageIdsChange}
          />
          <MyDealsKanbanFieldsControl
            role={role}
            selectedFieldIds={visibleFieldIds}
            onApply={onFieldsApply}
          />
        </div>
      </div>

      {selectedStageIds.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
          <div>
            <p className="text-sm font-medium text-zinc-100">No stages selected</p>
            <p className="mt-1 max-w-md text-[12px] text-zinc-500">
              Choose one or more stages above to render Deal columns. Restore Default to return
              to the operational loan pipeline.
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={boardRef}
          tabIndex={0}
          role="region"
          aria-label="Loan Deal Kanban"
          onScroll={persistBoardScroll}
          onKeyDown={onBoardKeyDown}
          className="flex min-h-0 flex-1 touch-pan-x gap-3 overflow-x-auto overflow-y-hidden px-2 py-2 outline-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {columns.map((col) => (
            <section
              key={col.column.id}
              className="flex min-h-0 shrink-0 flex-col rounded-lg border border-zinc-800 bg-zinc-950/40"
              style={{ width: MY_DEALS_KANBAN_COLUMN_WIDTH_PX }}
            >
              <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-2.5 py-2 backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-[12px] font-semibold text-zinc-100">
                    {col.column.label}
                  </h2>
                  <span className="tabular-nums text-[11px] text-zinc-400">{col.dealCount}</span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium tabular-nums text-teal-200">
                  {formatINRCompact(col.combinedLoanValue)}
                </p>
              </header>
              <div
                ref={(node) => {
                  columnRefs.current[col.column.id] = node;
                }}
                onScroll={() => persistColumnScroll(col.column.id)}
                className={cn(
                  "min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-2",
                )}
              >
                {col.deals.length === 0 ? (
                  <p className="px-1 py-6 text-center text-[11px] text-zinc-500">No deals</p>
                ) : (
                  col.deals.map((row) => (
                    <MyDealsKanbanCard
                      key={row.enterpriseDealId || row.id}
                      row={row}
                      columnId={col.column.id}
                      visibleFields={visibleFields}
                      onOpenDeal={onOpenDeal}
                      onOpenHref={(href) => onOpenHref(href, row)}
                      onComposer={(kind, deal) => setComposer({ kind, row: deal })}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <MyDealsKanbanComposer
        kind={composer?.kind ?? null}
        row={composer?.row ?? null}
        onClose={() => setComposer(null)}
      />
    </div>
  );
}
