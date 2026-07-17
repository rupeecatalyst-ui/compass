"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  Brain,
  CalendarRange,
  Download,
  Expand,
  FilterX,
  Loader2,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { useEiVizInteractionOptional } from "@/components/catalyst-one/executive-intelligence/ei-viz-interaction-context";
import type { EiStoryChapter } from "@/types/executive-intelligence-platform";
import type {
  EiExportPayload,
  EiHoverInsight,
} from "@/types/executive-intelligence-capabilities";
import { EI_VIZ_CAPABILITIES } from "@/types/executive-intelligence-capabilities";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface EiVizShellProps {
  chapter: EiStoryChapter;
  children: ReactNode;
  /** Export payload for this visualization */
  exportPayload?: EiExportPayload;
  /** Empty when no data to plot */
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Error state */
  error?: string | null;
  /** Loading skeleton */
  loading?: boolean;
  /** Controlled hover insight (from chart) */
  hoverInsight?: EiHoverInsight | null;
  className?: string;
  /** AI explanation override; defaults from chapter narrative + whyThisViz */
  aiExplanation?: string;
}

/**
 * Shared chrome — every EI visualization must support:
 * Hover Insights, Drill Down, Cross Filtering, Date Comparison,
 * Fullscreen, Export, AI Explanation, Animation, Loading Skeleton,
 * Empty State, Error State.
 */
export function EiVizShell({
  chapter,
  children,
  exportPayload,
  isEmpty,
  emptyMessage = "No data available for this view.",
  error,
  loading,
  hoverInsight,
  className,
  aiExplanation,
}: EiVizShellProps) {
  const interaction = useEiVizInteractionOptional();
  const [fullscreen, setFullscreen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [localHover, setLocalHover] = useState<EiHoverInsight | null>(null);
  const activeHover = hoverInsight ?? localHover;

  const handleExport = useCallback(() => {
    const payload = exportPayload ?? {
      filename: `ei-${chapter.id}`,
      data: {
        chapter: chapter.eyebrow,
        headline: chapter.headline,
        visualization: chapter.visualization,
        why: chapter.whyThisViz,
      },
    };
    const blob = new Blob([JSON.stringify(payload.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chapter, exportPayload]);

  const explanation =
    aiExplanation ||
    [
      `CHANAKYA · ${chapter.eyebrow}`,
      chapter.headline,
      chapter.narrative,
      `Chart chosen because: ${chapter.whyThisViz}`,
      interaction?.compareEnabled
        ? `Date comparison is on (${interaction.dateMode.replace("_", " ")}).`
        : "Date comparison is off.",
      interaction && Object.keys(interaction.filters).length > 0
        ? `Active cross-filters: ${JSON.stringify(interaction.filters)}.`
        : "No cross-filters applied.",
    ].join("\n\n");

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1.5">
      {interaction ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "ei-toolbar-btn gap-1 px-2.5 text-[10px]",
              interaction.compareEnabled && "border-teal-600/30 bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100",
            )}
            onClick={() => interaction.setCompareEnabled(!interaction.compareEnabled)}
            title="Date Comparison"
          >
            <CalendarRange className="h-3 w-3" />
            {interaction.compareEnabled ? "Compare" : "Compare"}
          </Button>
          {interaction.compareEnabled ? (
            <select
              className="ei-toolbar-btn px-2"
              value={interaction.dateMode}
              onChange={(e) =>
                interaction.setDateMode(e.target.value as "period" | "vs_prior" | "yoy")
              }
              aria-label="Date comparison mode"
            >
              <option value="vs_prior">vs Prior</option>
              <option value="yoy">YoY</option>
              <option value="period">Period</option>
            </select>
          ) : null}
          {Object.keys(interaction.filters).length > 0 || interaction.drillStack.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ei-toolbar-btn gap-1 px-2.5"
              onClick={interaction.clearFilters}
              title="Clear cross filters / drill"
            >
              <FilterX className="h-3 w-3" />
              Clear
            </Button>
          ) : null}
        </>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="ei-toolbar-btn gap-1 px-2.5"
        onClick={() => setAiOpen(true)}
        title="AI Explanation"
      >
        <Brain className="h-3 w-3" />
        AI
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="ei-toolbar-btn gap-1 px-2.5"
        onClick={handleExport}
        title="Export"
      >
        <Download className="h-3 w-3" />
        Export
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="ei-toolbar-btn gap-1 px-2.5"
        onClick={() => setFullscreen(true)}
        title="Fullscreen"
      >
        <Maximize2 className="h-3 w-3" />
        Full
      </Button>
    </div>
  );

  const body = (
    <>
      {interaction && interaction.drillStack.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-1 text-[10px]">
          <span className="text-muted-foreground">Drill:</span>
          <button
            type="button"
            className="rounded bg-muted px-1.5 py-0.5 font-medium hover:bg-muted/80"
            onClick={interaction.drillUp}
          >
            ↑ Back
          </button>
          {interaction.drillStack.map((d) => (
            <span
              key={`${d.dimension}-${d.key}`}
              className="rounded border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 font-medium text-teal-800 dark:text-teal-200"
            >
              {d.label}
            </span>
          ))}
        </div>
      ) : null}

      {activeHover ? (
        <div className="ei-insight-strip mb-3 px-3 py-2 text-[0.6875rem] animate-in fade-in duration-300">
          <p className="font-semibold tracking-tight text-foreground">{activeHover.title}</p>
          <p className="mt-0.5 text-muted-foreground">{activeHover.detail}</p>
          {activeHover.value ? (
            <p className="mt-1 font-semibold tabular-nums text-teal-700 dark:text-teal-300">
              {activeHover.value}
            </p>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy aria-label="Loading visualization">
          <Skeleton className="h-6 w-1/3 rounded-full" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-3 w-1/2 rounded-full" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/5 p-5"
        >
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            Visualization error
          </p>
          <p className="text-[12px] text-muted-foreground">{error}</p>
          <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => window.location.reload()}>
            <Loader2 className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </div>
      ) : isEmpty ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/5 p-8 text-center">
          <Expand className="mb-3 h-7 w-7 text-muted-foreground/40" />
          <p className="ei-display text-base">Nothing to show</p>
          <p className="ei-one-insight mt-2 text-center">{emptyMessage}</p>
        </div>
      ) : (
        <div
          className="ei-chart-stage animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
          onMouseLeave={() => setLocalHover(null)}
        >
          {children}
        </div>
      )}
    </>
  );

  return (
    <article
      className={cn("ei-card p-5 sm:p-6", className)}
      data-ei-capabilities={EI_VIZ_CAPABILITIES.join("|")}
    >
      <div className="ei-card-body">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-4">
          <div className="min-w-0 flex-1">
            <p className="ei-eyebrow">{chapter.eyebrow}</p>
            <h2 className="ei-display mt-1.5 text-[1.35rem] leading-snug tracking-tight text-foreground">
              {chapter.headline}
            </h2>
            <p className="ei-one-insight mt-2">{chapter.narrative}</p>
          </div>
          {toolbar}
        </header>

        {body}
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-h-[92vh] max-w-[96vw] overflow-y-auto sm:max-w-[96vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-8">
              <span>{chapter.headline}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-[10px]"
                onClick={() => setFullscreen(false)}
              >
                <Minimize2 className="h-3 w-3" />
                Exit
              </Button>
            </DialogTitle>
            <DialogDescription>{chapter.narrative}</DialogDescription>
          </DialogHeader>
          <div className="min-h-[50vh] pt-2">{loading || error || isEmpty ? body : children}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-teal-700" />
              AI Explanation
            </DialogTitle>
            <DialogDescription>Chanakya interprets this visualization for executives.</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/20 p-3 text-[12px] leading-relaxed text-foreground">
            {explanation}
          </pre>
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAiOpen(false)}>
            <X className="mr-1 h-3 w-3" />
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </article>
  );
}

/** Helper for charts to publish hover without prop drilling through shell. */
export function useEiLocalHover() {
  const [hoverInsight, setHoverInsight] = useState<EiHoverInsight | null>(null);
  return { hoverInsight, setHoverInsight };
}
