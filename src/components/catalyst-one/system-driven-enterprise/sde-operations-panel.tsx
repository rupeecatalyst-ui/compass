"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Lightbulb, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  SDE_CATEGORY_LABELS,
  SDE_CORE_PRINCIPLES,
  SDE_EVENT_LABELS,
  SDE_MISSION_CONTROL_MONITORS,
} from "@/constants/system-driven-enterprise";
import {
  getSdeMissionControlFeed,
  resolveControlledException,
} from "@/lib/system-driven-enterprise";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * System-Driven Enterprise — operational feed for Mission Control.
 * Guide before block · Controlled exceptions · SLA visibility
 */
export function SdeOperationsPanel({
  transactionId,
  compact = false,
}: {
  transactionId?: string;
  compact?: boolean;
}) {
  const { user } = useAuthContext();
  const [tick, setTick] = useState(0);
  const feed = useMemo(() => {
    void tick;
    return getSdeMissionControlFeed(12);
  }, [tick]);

  const exceptions = transactionId
    ? feed.openExceptions.filter((e) => e.transactionId === transactionId)
    : feed.openExceptions;
  const events = transactionId
    ? feed.events.filter((e) => e.transactionId === transactionId || !e.transactionId)
    : feed.events;

  const actor = {
    id: user?.id ?? "ui",
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Platform Admin",
  };

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <Card className="glass-card border-border/60 border-teal-500/15">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-teal-700 dark:text-teal-300" />
            System-Driven Enterprise
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            The system guides · Users execute · Management supervises. Exceptions remain visible
            until resolved.
          </p>
        </CardHeader>
        {!compact ? (
          <CardContent className="space-y-2">
            <ul className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
              {SDE_CORE_PRINCIPLES.slice(0, 4).map((p) => (
                <li key={p} className="flex gap-1.5">
                  <span className="text-teal-600">·</span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Monitoring · {SDE_MISSION_CONTROL_MONITORS.slice(0, 4).join(" · ")}…
            </p>
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-border/60 overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Open exceptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-0">
            {exceptions.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No open controlled exceptions.
              </p>
            ) : (
              exceptions.map((ex) => (
                <div
                  key={ex.id}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{ex.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {SDE_CATEGORY_LABELS[ex.category]} · {ex.responsibleUserName} ·{" "}
                        {formatDate(ex.recordedAt)}
                      </p>
                      {ex.reason ? (
                        <p className="mt-1 text-[11px] text-foreground/80">{ex.reason}</p>
                      ) : null}
                      {ex.slaMonitoring ? (
                        <p className="mt-1 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                          SLA monitoring active
                          {ex.slaDueAt ? ` · due ${formatDate(ex.slaDueAt)}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 gap-1 text-[10px]"
                      onClick={() => {
                        resolveControlledException(ex.id, actor);
                        toast.success("Exception resolved");
                        setTick((t) => t + 1);
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Resolve
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60 overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-3.5 w-3.5 text-sky-600" />
              Operational feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-0 max-h-72 overflow-y-auto">
            {events.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No events yet.</p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-md border border-border/50 px-2.5 py-2 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{ev.title}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                        ev.severity === "critical" && "bg-rose-500/15 text-rose-800 dark:text-rose-200",
                        ev.severity === "high" && "bg-amber-500/15 text-amber-900 dark:text-amber-200",
                        ev.severity === "medium" && "bg-sky-500/15 text-sky-900 dark:text-sky-200",
                        (ev.severity === "low" || ev.severity === "info") &&
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {ev.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{ev.summary}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {SDE_EVENT_LABELS[ev.code]} · {ev.actorUserName ?? "System"} ·{" "}
                    {formatDate(ev.at)}
                  </p>
                  {ev.recommendedAction ? (
                    <p className="mt-1 text-[10px] font-medium text-foreground/80">
                      Next: {ev.recommendedAction}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
