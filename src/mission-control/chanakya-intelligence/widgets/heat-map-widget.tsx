"use client";

import type { WidgetComponentProps } from "@/mission-control/shared/widget-framework";
import type { ChanakyaIntelligenceModel } from "@/types/chanakya-intelligence";
import { CI_TONE_CELL } from "./tone";
import { cn } from "@/mission-control/shared/cn";

type Payload = {
  model: ChanakyaIntelligenceModel;
  selectedHeatCell: string | null;
  setSelectedHeatCell: (k: string | null) => void;
  onOpenDeal: (href: string) => void;
};

export function HeatMapWidget({ payload }: WidgetComponentProps) {
  const p = payload as Payload | undefined;
  if (!p?.model) return null;
  const { model, selectedHeatCell, setSelectedHeatCell, onOpenDeal } = p;
  const { heat, galaxy } = model;
  const nodeById = new Map(galaxy.nodes.map((n) => [n.id, n]));

  const cellAt = (row: string, col: string) =>
    heat.cells.find((c) => c.rowKey === row && c.colKey === col);

  const selected = selectedHeatCell
    ? heat.cells.find((c) => `${c.rowKey}||${c.colKey}` === selectedHeatCell)
    : null;

  return (
    <div className="flex h-full min-h-[280px] flex-col gap-3">
      <div className="overflow-auto rounded-xl border border-zinc-800/80">
        <table className="w-full min-w-[420px] border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-zinc-950 px-2 py-2 text-left font-semibold text-zinc-500">
                /
              </th>
              {heat.cols.map((col) => (
                <th
                  key={col}
                  className="max-w-[5.5rem] truncate px-1.5 py-2 text-center font-semibold text-zinc-400"
                  title={col}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heat.rows.map((row) => (
              <tr key={row} className="border-t border-zinc-800/60">
                <th
                  className="sticky left-0 max-w-[7rem] truncate bg-zinc-950 px-2 py-1.5 text-left font-medium text-zinc-300"
                  title={row}
                >
                  {row}
                </th>
                {heat.cols.map((col) => {
                  const cell = cellAt(row, col);
                  const key = `${row}||${col}`;
                  const active = selectedHeatCell === key;
                  return (
                    <td key={col} className="p-0.5">
                      <button
                        type="button"
                        disabled={!cell}
                        onClick={() => {
                          if (!cell) return;
                          setSelectedHeatCell(active ? null : key);
                        }}
                        className={cn(
                          "flex h-9 w-full items-center justify-center rounded-md tabular-nums transition",
                          cell
                            ? cn(CI_TONE_CELL[cell.tone], "hover:ring-1 hover:ring-teal-400/40")
                            : "bg-zinc-900/30 text-zinc-700",
                          active && "ring-2 ring-teal-400/60",
                        )}
                        title={cell ? `${cell.value} deals` : "Empty"}
                      >
                        {cell?.value ?? "·"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {selected.rowLabel} × {selected.colLabel} · {selected.value} records
          </p>
          {selected.dealIds.slice(0, 8).map((id) => {
            const node = nodeById.get(id);
            if (!node) return null;
            return (
              <button
                key={id}
                type="button"
                className="block w-full truncate text-left text-[11px] text-teal-200/90 hover:text-teal-100"
                onClick={() => onOpenDeal(node.href)}
              >
                {node.dealId} · {node.borrower} · {node.product}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[10px] text-zinc-500">Click a cell to open detailed records.</p>
      )}
    </div>
  );
}
