"use client";

import Link from "next/link";
import { BookMarked, Snowflake } from "lucide-react";
import {
  EFL_ARCHITECTURE_FREEZE_NOTE,
  EFL_FRAMEWORK_VERSION,
} from "@/constants/enterprise-foundation-libraries";
import { ROUTES } from "@/constants/routes";
import { getEflRegistrySnapshot } from "@/lib/enterprise-foundation-libraries";
import { EflShell } from "@/components/catalyst-one/enterprise-foundation-libraries/efl-shell";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EflOverviewDashboard() {
  const snap = getEflRegistrySnapshot();

  return (
    <EflShell
      title="Overview"
      description="Enterprise Foundation Libraries — metadata-driven reference corpus. Build once. Reuse everywhere."
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href={ROUTES.ADMIN_FOUNDATION_LIBRARIES_REGISTRY}>
            <BookMarked className="h-3.5 w-3.5" />
            Library Registry
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">Architecture Freeze</CardTitle>
              <StatusPill variant="info">CF-EFL-001</StatusPill>
              <StatusPill variant="muted">{EFL_FRAMEWORK_VERSION}</StatusPill>
            </div>
            <CardDescription className="mt-2 flex items-start gap-2">
              <Snowflake className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
              <span>{EFL_ARCHITECTURE_FREEZE_NOTE}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Libraries</p>
              <p className="text-xl font-semibold tabular-nums">{snap.libraries.length}</p>
            </div>
            <div className="rounded-lg border border-border/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Architecture seeds
              </p>
              <p className="text-xl font-semibold tabular-nums">{snap.entryCount}</p>
            </div>
            <div className="rounded-lg border border-border/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Frozen since
              </p>
              <p className="text-xl font-semibold tabular-nums">{snap.frozenAt}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Capability Contract</CardTitle>
            <CardDescription>
              Every library supports metadata, Active/Inactive, Import/Export, Search, future multilingual, and Admin configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {[
              "Metadata driven",
              "Active / Inactive",
              "Import / Export",
              "Search",
              "Locale-ready",
              "Admin configurable",
            ].map((cap) => (
              <span
                key={cap}
                className="rounded-md border border-teal-500/25 bg-teal-500/5 px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-300"
              >
                {cap}
              </span>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snap.stats.map((stat) => {
            const lib = snap.libraries.find((l) => l.libraryCode === stat.libraryCode);
            if (!lib) return null;
            return (
              <Card key={stat.libraryCode} className="glass-card border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{lib.name}</CardTitle>
                    <StatusPill variant="muted">frozen</StatusPill>
                  </div>
                  <CardDescription className="line-clamp-2 text-xs">{lib.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Seeds / Target</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {stat.total} / {stat.targetEntryCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active / Inactive</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {stat.active} / {stat.inactive}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-violet-500/70"
                      style={{ width: `${Math.min(100, Math.max(2, stat.populationPct))}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </EflShell>
  );
}
