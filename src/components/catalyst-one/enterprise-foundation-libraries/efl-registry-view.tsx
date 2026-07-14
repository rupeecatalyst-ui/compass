"use client";

import { getEflRegistrySnapshot } from "@/lib/enterprise-foundation-libraries";
import { EflShell } from "@/components/catalyst-one/enterprise-foundation-libraries/efl-shell";
import { StatusPill } from "@/components/design-system/status-pill";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EflRegistryView() {
  const snap = getEflRegistrySnapshot();

  return (
    <EflShell
      title="Library Registry"
      description="Catalogue of Foundation Libraries — Admin configurable, architecture frozen."
    >
      <div className="space-y-3">
        {snap.libraries.map((lib) => {
          const stats = snap.stats.find((s) => s.libraryCode === lib.libraryCode);
          return (
            <Card key={lib.id} className="glass-card border-border/60">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{lib.name}</CardTitle>
                  <StatusPill variant="muted">{lib.libraryCode}</StatusPill>
                  <StatusPill variant="info">{lib.category}</StatusPill>
                  {lib.enabled ? (
                    <StatusPill variant="success">enabled</StatusPill>
                  ) : (
                    <StatusPill variant="warning">disabled</StatusPill>
                  )}
                </div>
                <CardDescription>{lib.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Target scale</p>
                  <p className="font-medium tabular-nums">{stats?.targetEntryCount ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Capabilities</p>
                  <p className="font-medium">
                    {[
                      lib.supportsSearch && "Search",
                      lib.supportsImportExport && "Import/Export",
                      lib.supportsActiveInactive && "Active/Inactive",
                      lib.supportsLocales && "Locale-ready",
                      lib.adminConfigurable && "Admin",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Consumers</p>
                  <p className="font-medium">{lib.consumerHints.join(", ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Architecture</p>
                  <p className="font-medium capitalize">{lib.architectureStatus}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </EflShell>
  );
}
