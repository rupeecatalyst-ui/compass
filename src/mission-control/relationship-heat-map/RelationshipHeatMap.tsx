"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import {
  RELATIONSHIP_ENGAGEMENT_BAND_META,
  RELATIONSHIP_ENTITY_TYPE_OPTIONS,
  RELATIONSHIP_HEAT_MAP_HOW_CALCULATED,
  RELATIONSHIP_STATUS_OPTIONS,
  RELATIONSHIP_TIME_WINDOW_OPTIONS,
} from "@/constants/relationship-heat-map";
import {
  buildRelationshipHeatMapEntities,
  filterRelationshipHeatMapEntities,
  loadAuthorisedRelationshipBooks,
  type AuthorisedRelationshipBooks,
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
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EnterpriseChartMetaStrip } from "@/components/enterprise/charts/enterprise-chart-frame";
import { buildEnterpriseChartMeta } from "@/lib/enterprise-chart-readability";
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
  dealCount?: number;
  lastActivityLabel?: string;
  band?: string;
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
    dealCount,
    lastActivityLabel,
    band,
    onOpen,
    id,
  } = props;

  if (width < 18 || height < 16) return null;

  const showCore = width > 56 && height > 40;
  const showExtra = width > 120 && height > 72;
  const bandLabel = band
    ? RELATIONSHIP_ENGAGEMENT_BAND_META[band as keyof typeof RELATIONSHIP_ENGAGEMENT_BAND_META]?.label
    : null;

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
            {bandLabel ? ` · ${bandLabel}` : ""}
          </text>
          <text x={x + 8} y={y + 46} fill="#a1a1aa" fontSize={9}>
            {entityTypeLabel}
          </text>
          {showExtra ? (
            <>
              <text x={x + 8} y={y + 62} fill="#d4d4d8" fontSize={9}>
                Opps {activeOpportunities ?? 0} · Deals {dealCount ?? 0}
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

function DetailRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2 text-[12px]">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-100" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Mission Control — Relationship Heat Map (executive intelligence).
 * Treemap is the primary surface; filters + legend stay compact.
 */
export function RelationshipHeatMap() {
  const [filters, setFilters] = useState<RelationshipHeatMapFilters>({
    entityType: "all",
    timeWindow: "90d",
    status: "all",
    search: "",
  });
  const [books, setBooks] = useState<AuthorisedRelationshipBooks>({
    opportunities: [],
    deals: [],
  });
  const [booksLoading, setBooksLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBooksLoading(true);
    void loadAuthorisedRelationshipBooks()
      .then((next) => {
        if (!cancelled) setBooks(next);
      })
      .finally(() => {
        if (!cancelled) setBooksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entities = useMemo(
    () => buildRelationshipHeatMapEntities(books),
    [books],
  );

  const visible = useMemo(
    () => filterRelationshipHeatMapEntities(entities, filters),
    [entities, filters],
  );

  const byId = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  const windowLabel =
    RELATIONSHIP_TIME_WINDOW_OPTIONS.find((o) => o.id === filters.timeWindow)?.label ?? "90 Days";
  const chartMeta = buildEnterpriseChartMeta({
    id: "relationship-heat-map",
    title: "Relationship Heat Map",
    measurementDefinition:
      "Colour = days since last meaningful interaction. Size = relationship score. Score does not override Dormant.",
    reportingPeriod: windowLabel,
    unit: "contacts",
    lastUpdated: new Date().toISOString(),
    activeFilters: [
      filters.entityType === "all" ? "All types" : filters.entityType,
      filters.status === "all" ? "All status" : filters.status,
      filters.search ? `Search` : "",
    ].filter(Boolean),
    dataSource:
      "Enterprise Contact Master · authorised Opportunity Registry · authorised Deal Registry · EAR",
    kind: "heatmap",
  });

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[520px] flex-col gap-2">
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
          {visible.length} relationships · size = score · colour = activity band
        </span>
      </div>
      <div className="shrink-0 border border-zinc-800 bg-zinc-950/80 px-2 py-1">
        <EnterpriseChartMetaStrip meta={chartMeta} className="text-zinc-500" />
      </div>

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
              content={<TreemapCell onOpen={setSelectedId} />}
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
                        Opportunities · {item.activeOpportunities} · Deals · {item.dealCount}
                      </p>
                      <p className="tabular-nums text-zinc-200">
                        Relationship score · {item.engagementScore}
                      </p>
                      <p className="text-zinc-400">
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-sm"
                          style={{ background: band.fill }}
                        />
                        {band.label} · {band.dayRange}
                      </p>
                      <p className="mt-1 text-zinc-500">
                        Last meaningful contact · {item.lastActivityLabel}
                      </p>
                      <p className="text-zinc-500">Click for details</p>
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-start gap-x-4 gap-y-1 border border-zinc-800 bg-zinc-950/80 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Relationship score
          </span>
          <div className="flex h-2 w-28 overflow-hidden rounded-sm">
            <span className="flex-1 bg-zinc-600" />
            <span className="flex-[2] bg-zinc-400" />
            <span className="flex-[3] bg-zinc-200" />
          </div>
          <span className="text-[10px] text-zinc-500">Low → High (size)</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Activity band
          </span>
          {(
            Object.entries(RELATIONSHIP_ENGAGEMENT_BAND_META) as [
              keyof typeof RELATIONSHIP_ENGAGEMENT_BAND_META,
              (typeof RELATIONSHIP_ENGAGEMENT_BAND_META)[keyof typeof RELATIONSHIP_ENGAGEMENT_BAND_META],
            ][]
          ).map(([key, meta]) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-[10px] text-zinc-300">
              <span className={cn("h-2.5 w-2.5 rounded-sm")} style={{ background: meta.fill }} />
              {meta.label}
              <span className="text-zinc-500">{meta.dayRange}</span>
            </span>
          ))}
        </div>
        <details className="ml-auto max-w-xl text-[10px] text-zinc-400">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
            How this is calculated
          </summary>
          <p className="mt-1 leading-relaxed text-zinc-400">{RELATIONSHIP_HEAT_MAP_HOW_CALCULATED}</p>
        </details>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-md"
          allowOutsideClose
        >
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-zinc-50">{selected.name}</SheetTitle>
                <SheetDescription>{selected.entityTypeLabel}</SheetDescription>
              </SheetHeader>
              <dl className="mt-4 space-y-3">
                <DetailRow
                  label="Activity band"
                  value={`${RELATIONSHIP_ENGAGEMENT_BAND_META[selected.band].label} (${RELATIONSHIP_ENGAGEMENT_BAND_META[selected.band].dayRange})`}
                />
                <DetailRow label="Relationship score" value={String(selected.engagementScore)} />
                <DetailRow label="Last meaningful contact" value={selected.lastActivityLabel} />
                <DetailRow
                  label="Days since contact"
                  value={
                    selected.daysSinceMeaningfulContact == null
                      ? "No meaningful interaction recorded"
                      : `${selected.daysSinceMeaningfulContact} days`
                  }
                />
                <DetailRow label="Interaction channel" value={selected.interactionChannel || "Not recorded"} />
                <DetailRow label="Assigned RC employee" value={selected.assignedRcEmployee || "Not assigned"} />
                <DetailRow
                  label="Opportunities"
                  testId="heat-map-opportunity-count"
                  value={booksLoading ? "Loading authorised book…" : String(selected.activeOpportunities)}
                />
                <DetailRow
                  label="Deals"
                  testId="heat-map-deal-count"
                  value={booksLoading ? "Loading authorised book…" : String(selected.dealCount)}
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Why this classification
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-zinc-300">
                    {selected.classificationReason}
                  </p>
                </div>
              </dl>
              {selected.isFrameworkDemo ? (
                <p className="mt-4 text-[11px] text-amber-400">
                  Framework demo tile — no Contact 360 record.
                </p>
              ) : (
                <Button asChild className="mt-6 h-8 text-xs" size="sm">
                  <Link href={selected.workspaceHref}>Open Contact 360 / timeline</Link>
                </Button>
              )}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
