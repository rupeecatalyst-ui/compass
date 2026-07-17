"use client";

import { useMemo } from "react";
import type { EiSankeyModel } from "@/types/executive-intelligence-platform";

/**
 * Process Flow → Sankey
 * Node height and link thickness proportional to flow — volume is readable at a glance.
 */
export function EiSankeyChart({ model }: { model: EiSankeyModel }) {
  const layout = useMemo(() => {
    const width = 560;
    const height = 280;
    const layers = [0, 1, 2];
    const positions = new Map<string, { x: number; y: number; h: number }>();

    const flowThrough = (id: string) => {
      const asSource = model.links
        .filter((l) => l.source === id)
        .reduce((s, l) => s + l.value, 0);
      const asTarget = model.links
        .filter((l) => l.target === id)
        .reduce((s, l) => s + l.value, 0);
      return Math.max(asSource, asTarget, 1);
    };

    for (const layer of layers) {
      const nodes = model.nodes.filter((n) => n.layer === layer);
      const weights = nodes.map((n) => flowThrough(n.id));
      const totalW = weights.reduce((a, b) => a + b, 0) || 1;
      const usable = height - 24;
      let y = 12;
      nodes.forEach((n, i) => {
        const h = Math.max(14, (weights[i]! / totalW) * usable * 0.92);
        positions.set(n.id, {
          x: 28 + layer * ((width - 56) / 2),
          y,
          h,
        });
        y += h + 8;
      });
    }

    const maxLink = Math.max(1, ...model.links.map((l) => l.value));
    const paths = model.links
      .map((link) => {
        const s = positions.get(link.source);
        const t = positions.get(link.target);
        if (!s || !t) return null;
        const y1 = s.y + s.h / 2;
        const y2 = t.y + t.h / 2;
        const x1 = s.x + 96;
        const x2 = t.x;
        const mid = (x1 + x2) / 2;
        const stroke = 2 + (link.value / maxLink) * 14;
        return {
          d: `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`,
          stroke,
          value: link.value,
          key: `${link.source}-${link.target}`,
        };
      })
      .filter(Boolean);

    return { width, height, positions, paths };
  }, [model]);

  if (model.nodes.length === 0) {
    return null;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-auto w-full">
        {layout.paths.map((p) =>
          p ? (
            <path
              key={p.key}
              d={p.d}
              fill="none"
              stroke="rgb(15 118 110 / 0.32)"
              strokeWidth={p.stroke}
              strokeLinecap="round"
            />
          ) : null,
        )}
        {model.nodes.map((n) => {
          const pos = layout.positions.get(n.id);
          if (!pos) return null;
          return (
            <g key={n.id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={96}
                height={pos.h}
                rx={5}
                className="fill-teal-800"
              />
              <text
                x={pos.x + 8}
                y={pos.y + Math.min(pos.h / 2 + 3, pos.h - 4)}
                className="fill-white text-[9px] font-semibold"
              >
                {n.label.length > 14 ? `${n.label.slice(0, 13)}…` : n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Source → Product → Stage · thickness = volume
      </p>
    </div>
  );
}
