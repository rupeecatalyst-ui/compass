"use client";

import { useEffect, useMemo, useState } from "react";
import {
  computeOpportunityCompassNeedle,
  computeOpportunityPulse,
  listOpportunityRecommendations,
  registerOpportunityRecommendation,
} from "@/lib/enterprise-opportunity-compass";
import type { OpportunityRecommendation } from "@/types/enterprise-opportunity-compass";
import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isDemoSeedEnabled } from "@/lib/demo-seed";

const CONTEXT = "opp-demo-001";

const PRESETS = [
  { label: "North · excellent", completionRatio: 0.9, overdueTaskCount: 0 },
  { label: "Centre · normal", completionRatio: 0.55, overdueTaskCount: 0 },
  { label: "South · attention", completionRatio: 0.25, overdueTaskCount: 2 },
];

function seedRecommendationsIfEmpty() {
  if (!isDemoSeedEnabled()) return;
  if (listOpportunityRecommendations(CONTEXT).length > 0) return;
  const messages = [
    "Follow up on pending KYC documents this afternoon.",
    "Lender executor shortlist is ready for Pune home loan.",
    "Overdue task escalation routed to reporting manager.",
    "Customer prefers evening outreach — schedule accordingly.",
  ];
  messages.forEach((message, i) => {
    registerOpportunityRecommendation({
      contextRef: CONTEXT,
      message,
      priority: messages.length - i,
      enabled: true,
    });
  });
}

const NEEDLE_ROTATION: Record<string, string> = {
  north: "-rotate-45",
  centre: "rotate-0",
  south: "rotate-45",
};

const NEEDLE_COLOUR: Record<string, string> = {
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  red: "bg-rose-500",
};

export function OpportunityCompassPanel() {
  const [completionRatio, setCompletionRatio] = useState(0.55);
  const [overdueTaskCount, setOverdueTaskCount] = useState(0);
  const [recommendations, setRecommendations] = useState<OpportunityRecommendation[]>([]);
  const [recIndex, setRecIndex] = useState(0);

  useEffect(() => {
    seedRecommendationsIfEmpty();
    setRecommendations(listOpportunityRecommendations(CONTEXT));
  }, []);

  useEffect(() => {
    if (recommendations.length === 0) return;
    const id = window.setInterval(() => {
      setRecIndex((i) => (i + 1) % recommendations.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [recommendations.length]);

  const metrics = useMemo(
    () => ({ completionRatio, overdueTaskCount }),
    [completionRatio, overdueTaskCount],
  );
  const needle = useMemo(() => computeOpportunityCompassNeedle(metrics), [metrics]);
  const pulse = useMemo(() => computeOpportunityPulse(metrics), [metrics]);
  const floating = recommendations[recIndex];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunity Compass"
        description="Visual needle (North green / Centre blue / South red) with rotating recommendations."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <EnterpriseEngagementCard
          title="Compass needle"
          description={needle.rationale}
          tone={needle.colour === "green" ? "emerald" : needle.colour === "red" ? "rose" : "blue"}
          badge={needle.signal.replace(/_/g, " ")}
          meta={`Pulse ${pulse.label} · intensity ${(pulse.intensity * 100).toFixed(0)}%`}
        >
          <div className="relative mx-auto mt-2 flex h-48 w-48 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-border" />
            <span className="absolute top-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
              North
            </span>
            <span className="absolute bottom-2 text-[10px] font-semibold uppercase tracking-wider text-rose-600">
              South
            </span>
            <span className="absolute left-2 text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              W
            </span>
            <span className="absolute right-2 text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              E
            </span>
            <div
              className={cn(
                "h-2 w-20 origin-left rounded-full transition-transform duration-500",
                NEEDLE_COLOUR[needle.colour],
                NEEDLE_ROTATION[needle.needle],
              )}
              style={{ transformOrigin: "0% 50%" }}
            />
            <div className="absolute h-3 w-3 rounded-full bg-foreground" />
          </div>
          <p className="mt-2 text-center text-sm font-medium capitalize">{needle.needle}</p>
        </EnterpriseEngagementCard>

        <div className="space-y-4">
          <EnterpriseEngagementCard
            title="Floating recommendation"
            description={floating?.message ?? "No recommendations seeded."}
            tone="violet"
            badge={floating ? `Priority ${floating.priority}` : undefined}
            meta="Cycles every 4 seconds"
          />

          <div className="space-y-4 rounded-xl border bg-card p-4">
            <div className="space-y-2">
              <Label>Completion ratio · {(completionRatio * 100).toFixed(0)}%</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(completionRatio * 100)}
                onChange={(e) => setCompletionRatio(Number(e.target.value) / 100)}
                className="w-full accent-blue-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Overdue tasks · {overdueTaskCount}</Label>
              <input
                type="range"
                min={0}
                max={5}
                value={overdueTaskCount}
                onChange={(e) => setOverdueTaskCount(Number(e.target.value))}
                className="w-full accent-rose-600"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCompletionRatio(p.completionRatio);
                    setOverdueTaskCount(p.overdueTaskCount);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
