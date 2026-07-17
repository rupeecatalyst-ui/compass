"use client";

import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { formatINRCompact } from "@/lib/format-currency";
import { useEiVizInteractionOptional } from "@/components/catalyst-one/executive-intelligence/ei-viz-interaction-context";
import type { EiTreemapCell } from "@/types/executive-intelligence-platform";
import type { EiHoverInsight } from "@/types/executive-intelligence-capabilities";

function Cell(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
  count?: number;
  onDrill?: (name: string) => void;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, fill, count, onDrill } = props;
  if (width < 28 || height < 22) return null;
  return (
    <g
      className="cursor-pointer"
      onClick={() => name && onDrill?.(name)}
    >
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.9} stroke="#0f172a" strokeWidth={2} rx={4} />
      {width > 48 && height > 34 ? (
        <>
          <text x={x + 6} y={y + 14} fill="#f8fafc" fontSize={10} fontWeight={600}>
            {name && name.length > 16 ? `${name.slice(0, 15)}…` : name}
          </text>
          <text x={x + 6} y={y + 28} fill="#cbd5e1" fontSize={9}>
            {count} files
          </text>
        </>
      ) : null}
    </g>
  );
}

/** Product Mix → Treemap */
export function EiTreemapChart({
  cells,
  onHover,
}: {
  cells: EiTreemapCell[];
  onHover?: (insight: EiHoverInsight | null) => void;
}) {
  const interaction = useEiVizInteractionOptional();

  if (cells.length === 0) {
    return null;
  }

  return (
    <div
      className="h-[240px] w-full"
      onMouseEnter={() =>
        onHover?.({
          title: "Product mix",
          detail: "Treemap by portfolio value — click a tile to drill",
          value: `${cells.length} products`,
        })
      }
      onMouseLeave={() => onHover?.(null)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={cells}
          dataKey="size"
          stroke="#0f172a"
          content={
            <Cell
              onDrill={(name) =>
                interaction?.drillDown({
                  dimension: "product",
                  key: name,
                  label: name,
                })
              }
            />
          }
          isAnimationActive
        >
          <Tooltip
            content={({ payload }) => {
              const p = payload?.[0]?.payload as EiTreemapCell | undefined;
              if (!p) return null;
              return (
                <div className="rounded-md border bg-popover px-2 py-1 text-[10px] shadow">
                  <p className="font-semibold">{p.name}</p>
                  <p>
                    {p.count} files · {formatINRCompact(p.size)}
                  </p>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
