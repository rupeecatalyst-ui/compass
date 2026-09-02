/**
 * CO-C1-CHART-READABILITY-001 — Shared chart chrome: title, definition, period, unit,
 * freshness, filters, loading/error/empty/unavailable, enlarge.
 */

"use client";

import { useState, type ReactNode } from "react";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ENTERPRISE_CHART_EMPTY_MESSAGE,
  ENTERPRISE_CHART_ERROR_MESSAGE,
  ENTERPRISE_CHART_UNAVAILABLE_MESSAGE,
} from "@/constants/enterprise-chart-readability";
import { formatChartFreshness, formatChartPeriod } from "@/lib/enterprise-chart-readability/format";
import type { EnterpriseChartMeta } from "@/types/enterprise-chart-readability";
import { cn } from "@/lib/utils";

export function EnterpriseChartMetaStrip({
  meta,
  className,
}: {
  meta: Pick<
    EnterpriseChartMeta,
    | "measurementDefinition"
    | "reportingPeriod"
    | "unitLabel"
    | "lastUpdated"
    | "freshnessLabel"
    | "activeFilters"
  >;
  className?: string;
}) {
  const freshness = meta.freshnessLabel || formatChartFreshness(meta.lastUpdated);
  const filters = (meta.activeFilters ?? []).filter(Boolean);
  return (
    <div className={cn("mt-1 space-y-1 text-[11px] text-muted-foreground", className)}>
      <p>{meta.measurementDefinition}</p>
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums">
        <span>Period · {formatChartPeriod(meta.reportingPeriod)}</span>
        <span>Unit · {meta.unitLabel}</span>
        <span>{freshness}</span>
      </p>
      {filters.length > 0 ? (
        <p>
          Filters · {filters.join(" · ")}
        </p>
      ) : (
        <p>Filters · none</p>
      )}
    </div>
  );
}

export function EnterpriseChartFrame({
  meta,
  children,
  expandedChildren,
  loading,
  error,
  empty,
  emptyMessage,
  className,
  hideEnlarge,
}: {
  meta: EnterpriseChartMeta;
  children: ReactNode;
  expandedChildren?: ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  hideEnlarge?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const body = expandedChildren ?? children;

  let surface: ReactNode = children;
  if (loading) {
    surface = (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground" aria-busy>
        Loading chart…
      </div>
    );
  } else if (error) {
    surface = (
      <div role="alert" className="flex h-44 items-center justify-center px-4 text-center text-sm text-rose-700 dark:text-rose-300">
        {error || ENTERPRISE_CHART_ERROR_MESSAGE}
      </div>
    );
  } else if (meta.unavailable) {
    surface = (
      <div className="flex h-44 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {meta.unavailableMessage || ENTERPRISE_CHART_UNAVAILABLE_MESSAGE}
      </div>
    );
  } else if (empty) {
    surface = (
      <div className="flex h-44 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {emptyMessage || ENTERPRISE_CHART_EMPTY_MESSAGE}
      </div>
    );
  }

  return (
    <>
      <article
        className={cn("flex min-h-0 flex-col", className)}
        data-enterprise-chart={meta.id}
        data-chart-kind={meta.kind}
      >
        <header className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{meta.title}</h3>
            <EnterpriseChartMetaStrip meta={meta} />
          </div>
          {hideEnlarge ? null : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 shrink-0 gap-1.5 text-xs"
              onClick={() => setOpen(true)}
              aria-label={`Enlarge ${meta.title}`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Enlarge
            </Button>
          )}
        </header>
        <div className="min-h-0 flex-1">{surface}</div>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-[min(96vw,1100px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{meta.title}</DialogTitle>
            <DialogDescription className="text-left">
              {meta.measurementDefinition}
            </DialogDescription>
            <EnterpriseChartMetaStrip meta={meta} />
          </DialogHeader>
          <div className="min-h-[50vh] py-2">{body}</div>
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="secondary" className="h-8 gap-1.5" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
