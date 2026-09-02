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
import { EnterpriseChartMetaStrip } from "@/components/enterprise/charts/enterprise-chart-frame";
import type { EnterpriseChartMeta } from "@/types/enterprise-chart-readability";
import { cn } from "../cn";

/**
 * CO-REFINEMENT-004 — Full-width analytics card with in-place enlarge (stays in Mission Control).
 * CO-C1-CHART-READABILITY-001 — optional measurement/period/unit/freshness/filter strip.
 */
export function McAnalyticsExpandCard({
  title,
  subtitle,
  children,
  expandedChildren,
  className,
  expandLabel = "Enlarge",
  meta,
  loading,
  error,
  empty,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Larger chart body in dialog; defaults to children */
  expandedChildren?: ReactNode;
  className?: string;
  expandLabel?: string;
  meta?: EnterpriseChartMeta;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const body = expandedChildren ?? children;
  const stripMeta = meta ?? {
    measurementDefinition: subtitle || title,
    reportingPeriod: "Current operational view",
    unitLabel: "See series",
    lastUpdated: null,
    activeFilters: [],
  };

  let surface: ReactNode = children;
  if (loading) {
    surface = (
      <div className="flex h-44 items-center justify-center text-sm text-zinc-400" aria-busy>
        Loading chart…
      </div>
    );
  } else if (error) {
    surface = (
      <div role="alert" className="flex h-44 items-center justify-center px-4 text-center text-sm text-rose-300">
        {error}
      </div>
    );
  } else if (empty) {
    surface = (
      <div className="flex h-44 items-center justify-center px-4 text-center text-sm text-zinc-500">
        {emptyMessage || "No data for the current filters and period."}
      </div>
    );
  }

  return (
    <>
      <article
        className={cn(
          "w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5",
          className,
        )}
        data-enterprise-chart={meta?.id || title}
      >
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-zinc-50">{title}</h4>
            {subtitle ? (
              <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
            ) : null}
            <EnterpriseChartMetaStrip meta={stripMeta} className="text-zinc-500" />
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 gap-1.5 border-zinc-700 bg-zinc-900/80 text-xs text-zinc-200 hover:bg-zinc-800"
            onClick={() => setOpen(true)}
            aria-label={`${expandLabel}: ${title}`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {expandLabel}
          </Button>
        </header>
        {surface}
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-[min(96vw,1200px)] overflow-y-auto border-zinc-800 bg-zinc-950 p-0">
          <DialogHeader className="border-b border-zinc-800 px-5 py-4 pr-12">
            <DialogTitle className="text-base font-semibold text-zinc-50">{title}</DialogTitle>
            <DialogDescription className="text-[12px] text-zinc-500">
              {subtitle || stripMeta.measurementDefinition}
            </DialogDescription>
            <EnterpriseChartMetaStrip meta={stripMeta} className="text-zinc-500" />
          </DialogHeader>
          <div className="min-h-[50vh] px-5 pb-6 pt-4">{body}</div>
          <div className="flex justify-end border-t border-zinc-800 px-5 py-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 border-zinc-700 bg-zinc-900 text-xs"
              onClick={() => setOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
