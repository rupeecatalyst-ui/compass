"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { EiStoryHero } from "@/components/catalyst-one/executive-intelligence/ei-story-hero";
import { EiCapableChapter } from "@/components/catalyst-one/executive-intelligence/ei-capable-chapter";
import { EiPremiumCanvas } from "@/components/catalyst-one/executive-intelligence/ei-premium-canvas";
import {
  EiVizInteractionProvider,
  useEiVizInteraction,
} from "@/components/catalyst-one/executive-intelligence/ei-viz-interaction-context";
import { EiFunnelChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-funnel-chart";
import { EiSankeyChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-sankey-chart";
import { EiWaterfallChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-waterfall-chart";
import { EiTreemapChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-treemap-chart";
import { EiGeoMap } from "@/components/catalyst-one/executive-intelligence/viz/ei-geo-map";
import { EiRadarChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-radar-chart";
import { EiTrendAreaLine } from "@/components/catalyst-one/executive-intelligence/viz/ei-trend-area-line";
import { EiBubbleChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-bubble-chart";
import { EiScatterChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-scatter-chart";
import { EiTimelineChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-timeline-chart";
import { EiCalendarHeatmap } from "@/components/catalyst-one/executive-intelligence/viz/ei-calendar-heatmap";
import { EiTargetBullets } from "@/components/catalyst-one/executive-intelligence/viz/ei-target-bullets";
import { EiMultiGaugeDashboard } from "@/components/catalyst-one/executive-intelligence/viz/ei-multi-gauge-dashboard";
import { EiForecastBands } from "@/components/catalyst-one/executive-intelligence/viz/ei-forecast-bands";
import { EI_VISUALIZATION_RULES } from "@/constants/executive-intelligence-visualization-rules";
import {
  applyEiCrossFilters,
  deriveExecutiveIntelligenceStory,
} from "@/lib/executive-intelligence-platform";
import { getAllLoanFiles } from "@/lib/loan-files-utils";
import type { EiStoryChapter } from "@/types/executive-intelligence-platform";
import { Button } from "@/components/ui/button";

function EiWorkspaceBody() {
  const { filters, clearFilters, compareEnabled, dateMode } = useEiVizInteraction();
  const [boot, setBoot] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setBoot(false), 450);
    return () => window.clearTimeout(t);
  }, []);

  const story = useMemo(() => {
    try {
      const files = applyEiCrossFilters(getAllLoanFiles(), filters);
      const derived = deriveExecutiveIntelligenceStory(files);
      if (compareEnabled) {
        derived.heroSubline = `${derived.heroSubline} · Date comparison: ${dateMode.replace("_", " ")}`;
        derived.pulse = derived.pulse.map((p) => ({
          ...p,
          deltaLabel:
            dateMode === "yoy"
              ? `${p.deltaLabel} · vs YoY`
              : dateMode === "period"
                ? `${p.deltaLabel} · period`
                : `${p.deltaLabel} · vs prior`,
        }));
      }
      return { data: derived, error: null as string | null };
    } catch (e) {
      return {
        data: deriveExecutiveIntelligenceStory([]),
        error: e instanceof Error ? e.message : "Failed to derive intelligence story.",
      };
    }
  }, [filters, compareEnabled, dateMode]);

  useEffect(() => {
    setError(story.error);
  }, [story.error]);

  const chapterById = (id: string): EiStoryChapter =>
    story.data.chapters.find((c) => c.id === id) ?? story.data.chapters[0]!;

  const filterCount = Object.keys(filters).length;
  const s = story.data;

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-4 py-7 sm:px-6 lg:px-10">
      <EiStoryHero
        headline={s.heroHeadline}
        subline={s.heroSubline}
        pulse={s.pulse}
      />

      <div className="ei-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="ei-eyebrow">Visual storytelling</p>
          <p className="mt-1 text-[0.8125rem] text-[color:var(--ei-ink-soft)]">
            One insight per chart · {EI_VISUALIZATION_RULES.length} executive views
          </p>
        </div>
        {filterCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="ei-toolbar-btn h-8 gap-1.5 px-3"
            onClick={clearFilters}
          >
            <Filter className="h-3 w-3" />
            {filterCount} filter{filterCount === 1 ? "" : "s"} · Clear
          </Button>
        ) : (
          <span className="text-[0.6875rem] tabular-nums text-muted-foreground">
            {new Date(s.generatedAt).toLocaleTimeString("en-IN")}
          </span>
        )}
      </div>

      <div className="ei-stagger grid gap-6 lg:grid-cols-2">
        <EiCapableChapter
          chapter={chapterById("funnel")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.funnel.every((x) => x.count === 0)}
          emptyMessage="No pipeline stages have files under the current filters."
          exportPayload={{ filename: "ei-funnel", data: s.funnel }}
        >
          {({ onHover }) => <EiFunnelChart stages={s.funnel} onHover={onHover} />}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("sankey")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.sankey.links.length === 0}
          emptyMessage="Not enough source → product → stage flow to draw a Sankey."
          exportPayload={{ filename: "ei-sankey", data: s.sankey }}
        >
          {() => <EiSankeyChart model={s.sankey} />}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("waterfall")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.waterfall.length === 0}
          exportPayload={{ filename: "ei-waterfall", data: s.waterfall }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({
                  title: "Revenue bridge",
                  detail: "How pipeline becomes expected revenue",
                  value: `${s.waterfall.length} steps`,
                })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiWaterfallChart steps={s.waterfall} />
            </div>
          )}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("treemap")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.treemap.length === 0}
          emptyMessage="No product mix under current filters."
          exportPayload={{ filename: "ei-treemap", data: s.treemap }}
        >
          {({ onHover }) => <EiTreemapChart cells={s.treemap} onHover={onHover} />}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("geo")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.geo.length === 0}
          emptyMessage="No regional distribution under current filters."
          exportPayload={{ filename: "ei-geo", data: s.geo }}
        >
          {({ onHover }) => <EiGeoMap regions={s.geo} onHover={onHover} />}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("radar")}
          loading={boot}
          error={error}
          exportPayload={{ filename: "ei-radar", data: s.radar }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({
                  title: "Risk distribution",
                  detail: "Delay · Urgency · Stall · Docs · No lender",
                })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiRadarChart axes={s.radar} />
            </div>
          )}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("trend")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.trend.length === 0}
          exportPayload={{ filename: "ei-trend", data: s.trend }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({
                  title: "Trend",
                  detail: compareEnabled
                    ? `Area + line with ${dateMode.replace("_", " ")} comparison`
                    : "Area + line momentum",
                })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiTrendAreaLine points={s.trend} />
            </div>
          )}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("bubble")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.bubble.length === 0}
          exportPayload={{ filename: "ei-bubble", data: s.bubble }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({
                  title: "Relationship",
                  detail: "Amount · Revenue · Days in stage",
                })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiBubbleChart points={s.bubble} />
            </div>
          )}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("scatter")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.scatter.length === 0}
          exportPayload={{ filename: "ei-scatter", data: s.scatter }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({
                  title: "Correlation",
                  detail: "Days in stage vs progress %",
                })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiScatterChart points={s.scatter} />
            </div>
          )}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("timeline")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.timeline.length === 0}
          emptyMessage="No recent timeline events."
          exportPayload={{ filename: "ei-timeline", data: s.timeline }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({ title: "Timeline", detail: "Recent journey events" })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiTimelineChart events={s.timeline} />
            </div>
          )}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("calendar")}
          loading={boot}
          error={error}
          isEmpty={!boot && !error && s.calendar.every((d) => d.count === 0)}
          emptyMessage="No daily activity in the last 35 days."
          exportPayload={{ filename: "ei-calendar", data: s.calendar }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({
                  title: "Daily activity",
                  detail: "Calendar heatmap intensity",
                })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiCalendarHeatmap days={s.calendar} />
            </div>
          )}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("bullet")}
          loading={boot}
          error={error}
          exportPayload={{ filename: "ei-bullets", data: s.bullets }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({
                  title: "Target achievement",
                  detail: "Actual vs plan on bullet charts",
                })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiTargetBullets bullets={s.bullets} />
            </div>
          )}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("gauges")}
          loading={boot}
          error={error}
          exportPayload={{ filename: "ei-gauges", data: s.gauges }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({
                  title: "Technical health",
                  detail: "Multi-gauge operating health",
                })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiMultiGaugeDashboard gauges={s.gauges} />
            </div>
          )}
        </EiCapableChapter>

        <EiCapableChapter
          chapter={chapterById("forecast")}
          loading={boot}
          error={error}
          exportPayload={{ filename: "ei-forecast", data: s.forecast }}
        >
          {({ onHover }) => (
            <div
              onMouseEnter={() =>
                onHover({
                  title: "Forecast",
                  detail: "Forward outlook with confidence bands",
                })
              }
              onMouseLeave={() => onHover(null)}
            >
              <EiForecastBands points={s.forecast} />
            </div>
          )}
        </EiCapableChapter>
      </div>
    </div>
  );
}

/**
 * Flagship Executive Intelligence — rule-mapped charts with full interaction capabilities.
 */
export function ExecutiveIntelligenceWorkspace() {
  return (
    <EiVizInteractionProvider>
      <EiPremiumCanvas>
        <EiWorkspaceBody />
      </EiPremiumCanvas>
    </EiVizInteractionProvider>
  );
}
