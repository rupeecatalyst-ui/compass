"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import {
  RELATIONSHIP_ENGAGEMENT_BAND_META,
  RELATIONSHIP_ENTITY_TYPE_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  RELATIONSHIP_TIME_WINDOW_OPTIONS,
} from "@/constants/relationship-heat-map";
import {
  buildRelationshipHeatMapEntities,
  filterRelationshipHeatMapEntities,
} from "@/lib/relationship-heat-map";
import type {
  RelationshipHeatMapEntity,
  RelationshipHeatMapFilters,
} from "@/types/relationship-heat-map";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function TreemapCell(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
  engagementScore?: number;
  entityTypeLabel?: string;
  activeOpportunities?: number;
  lastActivityLabel?: string;
  onOpen?: (id: string) => void;
  id?: string;
}) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name,
    fill,
    engagementScore,
    entityTypeLabel,
    activeOpportunities,
    lastActivityLabel,
    onOpen,
    id,
  } = props;

  if (width < 18 || height < 16) return null;

  const showCore = width > 56 && height > 40;
  const showExtra = width > 120 && height > 72;

  return (
    <g
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        if (id) onOpen?.(id);
      }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.92}
        stroke="#09090b"
        strokeWidth={2}
        rx={3}
      />
      {showCore ? (
        <>
          <text x={x + 8} y={y + 16} fill="#fafafa" fontSize={11} fontWeight={650}>
            {name && name.length > 22 ? `${name.slice(0, 21)}…` : name}
          </text>
          <text x={x + 8} y={y + 32} fill="#e4e4e7" fontSize={10}>
            Score {engagementScore}
          </text>
          <text x={x + 8} y={y + 46} fill="#a1a1aa" fontSize={9}>
            {entityTypeLabel}
          </text>
          {showExtra ? (
            <>
              <text x={x + 8} y={y + 62} fill="#d4d4d8" fontSize={9}>
                Opps {activeOpportunities ?? 0}
              </text>
              <text x={x + 8} y={y + 76} fill="#a1a1aa" fontSize={9}>
                Last {lastActivityLabel}
              </text>
            </>
          ) : null}
        </>
      ) : null}
    </g>
  );
}

/**
 * Mission Control — Relationship Heat Map (executive intelligence).
 * Treemap is the primary surface; filters + legend stay compact.
 */
export function RelationshipHeatMap() {
  const router = useRouter();
  const [filters, setFilters] = useState<RelationshipHeatMapFilters>({
    entityType: "all",
    timeWindow: "90d",
    status: "all",
    search: "",
  });
  const [tick] = useState(0);

  const entities = useMemo(() => {
    void tick;
    return buildRelationshipHeatMapEntities();
  }, [tick]);

  const visible = useMemo(
    () => filterRelationshipHeatMapEntities(entities, filters),
    [entities, filters],
  );

  const byId = useMemo(() => new Map(visible.map((e) => [e.id, e])), [visible]);

  const openEntity = (id: string) => {
    const entity = byId.get(id);
    if (!entity || entity.isFrameworkDemo) return;
    router.push(entity.workspaceHref);
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[520px] flex-col gap-2">
      {/* Compact filter bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border border-zinc-800 bg-zinc-950/80 px-2 py-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Relationship Heat Map
        </span>
        <Select
          value={filters.entityType}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              entityType: v as RelationshipHeatMapFilters["entityType"],
            }))
          }
        >
          <SelectTrigger className="h-7 w-[150px] rounded-sm border-zinc-700 bg-zinc-900 text-[11px] text-zinc-100">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_ENTITY_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.timeWindow}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              timeWindow: v as RelationshipHeatMapFilters["timeWindow"],
            }))
          }
        >
          <SelectTrigger className="h-7 w-[110px] rounded-sm border-zinc-700 bg-zinc-900 text-[11px] text-zinc-100">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_TIME_WINDOW_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              status: v as RelationshipHeatMapFilters["status"],
            }))
          }
        >
          <SelectTrigger className="h-7 w-[130px] rounded-sm border-zinc-700 bg-zinc-900 text-[11px] text-zinc-100">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search…"
          className="h-7 w-[160px] rounded-sm border-zinc-700 bg-zinc-900 text-[11px] text-zinc-100 placeholder:text-zinc-500"
        />
        <span className="ml-auto text-[10px] tabular-nums text-zinc-500">
          {visible.length} relationships · size = engagement score
        </span>
      </div>

      {/* Treemap — primary viewport (~80–90%) */}
      <div className="relative min-h-0 flex-1 overflow-hidden border border-zinc-800 bg-zinc-950">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No relationships match the current filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={visible}
              dataKey="size"
              nameKey="name"
              stroke="#09090b"
              isAnimationActive
              content={
                <TreemapCell
                  onOpen={openEntity}
                />
              }
            >
              <Tooltip
                content={({ payload }) => {
                  const item = payload?.[0]?.payload as RelationshipHeatMapEntity | undefined;
                  if (!item) return null;
                  const band = RELATIONSHIP_ENGAGEMENT_BAND_META[item.band];
                  return (
                    <div className="max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-[11px] shadow-xl">
                      <p className="font-semibold text-zinc-50">{item.name}</p>
                      <p className="mt-0.5 text-zinc-400">{item.entityTypeLabel}</p>
                      <p className="mt-1 tabular-nums text-zinc-200">
                        Engagement score · {item.engagementScore}
                      </p>
                      <p className="text-zinc-400">
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-sm"
                          style={{ background: band.fill }}
                        />
                        {band.label}
                      </p>
                      <p className="mt-1 text-zinc-500">
                        Active opportunities · {item.activeOpportunities}
                      </p>
                      <p className="text-zinc-500">Last activity · {item.lastActivityLabel}</p>
                      {item.isFrameworkDemo ? (
                        <p className="mt-1 text-[10px] text-amber-500/90">
                          Framework demo tile · scoring algorithm pending
                        </p>
                      ) : (
                        <p className="mt-1 text-[10px] text-zinc-500">Click to open workspace</p>
                      )}
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>

      {/* Compact legend */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border border-zinc-800 bg-zinc-950/80 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Relationship score
          </span>
          <div className="flex h-2 w-28 overflow-hidden rounded-sm">
            <span className="flex-1 bg-zinc-600" />
            <span className="flex-[2] bg-zinc-400" />
            <span className="flex-[3] bg-zinc-200" />
          </div>
          <span className="text-[10px] text-zinc-500">Low → High</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Colour
          </span>
          {(
            Object.entries(RELATIONSHIP_ENGAGEMENT_BAND_META) as [
              keyof typeof RELATIONSHIP_ENGAGEMENT_BAND_META,
              (typeof RELATIONSHIP_ENGAGEMENT_BAND_META)[keyof typeof RELATIONSHIP_ENGAGEMENT_BAND_META],
            ][]
          ).map(([key, meta]) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-[10px] text-zinc-300">
              <span
                className={cn("h-2.5 w-2.5 rounded-sm")}
                style={{ background: meta.fill }}
              />
              {meta.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
