"use client";

import {
  ARCHITECTURE_TIMELINE_ACTION_LABELS,
} from "@/constants/atlas-timeline";
import { getAssetTimeline } from "@/lib/atlas/atlas-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AtlasTimelinePanelProps {
  enterpriseId: string;
}

export function AtlasTimelinePanel({ enterpriseId }: AtlasTimelinePanelProps) {
  const entries = getAssetTimeline(enterpriseId);

  return (
    <Card className="glass-card border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Architecture Timeline</CardTitle>
        <CardDescription>
          Created, Updated, Validated, Approved, Published, Archived — design-time lifecycle only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline entries yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border/60 pl-4">
            {entries.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {ARCHITECTURE_TIMELINE_ACTION_LABELS[entry.action]}
                    {entry.version && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{entry.version}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actor} · {new Date(entry.timestamp).toLocaleString("en-IN")}
                  </p>
                  {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
