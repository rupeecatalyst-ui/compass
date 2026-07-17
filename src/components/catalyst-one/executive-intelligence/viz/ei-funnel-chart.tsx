"use client";

import { formatINRCompact } from "@/lib/format-currency";
import { useEiVizInteractionOptional } from "@/components/catalyst-one/executive-intelligence/ei-viz-interaction-context";
import type { EiFunnelStage } from "@/types/executive-intelligence-platform";
import type { EiHoverInsight } from "@/types/executive-intelligence-capabilities";

/**
 * Pipeline → Funnel
 * True trapezoid geometry — executives read conversion by shape, not bar length.
 */
export function EiFunnelChart({
  stages,
  onHover,
}: {
  stages: EiFunnelStage[];
  onHover?: (insight: EiHoverInsight | null) => void;
}) {
  const interaction = useEiVizInteractionOptional();
  const max = Math.max(...stages.map((s) => s.count), 1);
  const W = 360;
  const rowH = 38;
  const gap = 3;
  const widthOf = (count: number) => 72 + (count / max) * 250;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${stages.length * (rowH + gap)}`} className="h-auto w-full">
        {stages.map((stage, index) => {
          const topW = widthOf(stages[index]!.count);
          const nextCount = stages[Math.min(stages.length - 1, index + 1)]!.count;
          const botW = index === stages.length - 1 ? topW * 0.9 : widthOf(nextCount);
          const y = index * (rowH + gap);
          const topL = (W - topW) / 2;
          const topR = W - topL;
          const botL = (W - botW) / 2;
          const botR = W - botL;
          const path = `M${topL},${y} L${topR},${y} L${botR},${y + rowH} L${botL},${y + rowH} Z`;
          const active = interaction?.filters.stageId === stage.id;
          const midY = y + rowH / 2 + 4;

          return (
            <g
              key={stage.id}
              className="cursor-pointer"
              onMouseEnter={() =>
                onHover?.({
                  title: stage.label,
                  detail:
                    stage.conversionFromPrior != null
                      ? `${stage.conversionFromPrior}% conversion from prior stage`
                      : "Pipeline entry — mouth of the funnel",
                  value: `${stage.count} files · ${formatINRCompact(stage.value)}`,
                })
              }
              onMouseLeave={() => onHover?.(null)}
              onClick={() =>
                interaction?.drillDown({
                  dimension: "stage",
                  key: stage.id,
                  label: stage.label,
                })
              }
            >
              <path
                d={path}
                fill={stage.color}
                fillOpacity={active ? 0.95 : 0.8}
                stroke={active ? "#0f766e" : "rgba(15,23,42,0.1)"}
                strokeWidth={active ? 2 : 1}
                className="transition-opacity duration-300 hover:opacity-100"
              />
              <text
                x={W / 2}
                y={midY - 6}
                textAnchor="middle"
                className="fill-white text-[10px] font-semibold"
              >
                {stage.label}
              </text>
              <text
                x={W / 2}
                y={midY + 8}
                textAnchor="middle"
                className="fill-white/90 text-[9px]"
              >
                {stage.count}
                {stage.conversionFromPrior != null ? ` · ${stage.conversionFromPrior}%` : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Narrower = fewer files · shape is the insight
      </p>
    </div>
  );
}
