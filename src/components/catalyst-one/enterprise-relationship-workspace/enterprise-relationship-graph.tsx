"use client";

/**
 * Reusable Enterprise Relationship Graph — SVG radial layout with zoom / pan.
 * Future view modes (company, opportunity, wealth partner, hierarchy) share this engine.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Expand,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { erwColourToken } from "@/lib/enterprise-relationship-workspace";
import { cn } from "@/lib/utils";
import type { ErwGraphEdge, ErwGraphNode } from "@/types/enterprise-relationship-workspace";

export interface EnterpriseRelationshipGraphProps {
  nodes: ErwGraphNode[];
  edges: ErwGraphEdge[];
  centreNodeId: string;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  className?: string;
  /** Collapse outer ring into summary chips when true */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function layoutRadial(
  nodes: ErwGraphNode[],
  centreNodeId: string,
  width: number,
  height: number,
) {
  const cx = width / 2;
  const cy = height / 2;
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(centreNodeId, { x: cx, y: cy });

  const satellites = nodes.filter((n) => n.id !== centreNodeId);
  const radius = Math.min(width, height) * 0.34;
  satellites.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(satellites.length, 1) - Math.PI / 2;
    positions.set(node.id, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  });
  return positions;
}

export function EnterpriseRelationshipGraph({
  nodes,
  edges,
  centreNodeId,
  selectedNodeId,
  onSelectNode,
  className,
  collapsed = false,
  onCollapsedChange,
}: EnterpriseRelationshipGraphProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 420 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(320, width), h: Math.max(280, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const positions = useMemo(
    () => layoutRadial(nodes, centreNodeId, size.w, size.h),
    [nodes, centreNodeId, size.w, size.h],
  );

  const fit = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-erw-node]")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.x),
      y: dragRef.current.panY + (e.clientY - dragRef.current.y),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const visibleNodes = collapsed
    ? nodes.filter((n) => n.isCentre || n.id === selectedNodeId)
    : nodes;

  return (
    <div className={cn("flex h-full min-h-[320px] flex-col", className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Relationship Network
          </p>
          <p className="text-[11px] text-zinc-500">
            Contact at centre · click any node for details
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-200"
            onClick={() => setScale((s) => Math.min(2.2, s + 0.15))}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-200"
            onClick={() => setScale((s) => Math.max(0.55, s - 0.15))}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-200"
            onClick={fit}
            aria-label="Fit to screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-200"
            onClick={() => onCollapsedChange?.(!collapsed)}
            aria-label={collapsed ? "Expand network" : "Collapse network"}
          >
            {collapsed ? <Expand className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            {collapsed ? "Expand" : "Collapse"}
          </Button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden rounded-xl border border-zinc-800 bg-[radial-gradient(ellipse_at_center,_rgba(39,39,42,0.9),_rgba(9,9,11,1))] active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <defs>
            <filter id="erw-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {edges.map((edge) => {
            if (collapsed && edge.toNodeId !== selectedNodeId && edge.fromNodeId !== selectedNodeId) {
              return null;
            }
            const from = positions.get(edge.fromNodeId);
            const to = positions.get(edge.toNodeId);
            if (!from || !to) return null;
            const tone = erwColourToken(edge.colourFamily);
            return (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={tone.hex}
                strokeOpacity={0.35}
                strokeWidth={1.5}
              />
            );
          })}

          {visibleNodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const tone = erwColourToken(node.colourFamily);
            const selected = selectedNodeId === node.id;
            const r = node.isCentre ? 42 : 28;
            return (
              <g
                key={node.id}
                data-erw-node
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectNode(node.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${node.name}, ${node.relationshipTypeLabel}`}
              >
                <circle
                  r={r + (selected ? 6 : 2)}
                  fill="transparent"
                  stroke={selected ? tone.hex : "transparent"}
                  strokeWidth={2}
                  strokeOpacity={0.85}
                />
                <circle
                  r={r}
                  fill={node.isCentre ? "#0f766e" : tone.soft}
                  stroke={node.isCentre ? "#2dd4bf" : tone.hex}
                  strokeWidth={node.isCentre ? 2.5 : 1.75}
                  filter={selected || node.isCentre ? "url(#erw-glow)" : undefined}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none select-none"
                  fill={node.isCentre ? "#ecfdf5" : tone.text}
                  fontSize={node.isCentre ? 11 : 9}
                  fontWeight={600}
                >
                  {(node.isCentre ? node.name : node.relationshipTypeLabel).slice(0, 14)}
                </text>
                {!node.isCentre && (
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                    fill="#a1a1aa"
                    fontSize={9}
                  >
                    {node.name.length > 18 ? `${node.name.slice(0, 16)}…` : node.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {collapsed && (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
            {nodes
              .filter((n) => !n.isCentre)
              .slice(0, 8)
              .map((n) => {
                const tone = erwColourToken(n.colourFamily);
                return (
                  <span
                    key={n.id}
                    className="rounded-full border px-2 py-0.5 text-[10px]"
                    style={{
                      borderColor: tone.ring,
                      color: tone.text,
                      background: tone.soft,
                    }}
                  >
                    {n.relationshipTypeLabel}
                  </span>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
