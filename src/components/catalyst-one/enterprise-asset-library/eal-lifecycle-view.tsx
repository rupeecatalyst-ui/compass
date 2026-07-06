"use client";

import { EAL_LIFECYCLE_LABELS, EAL_LIFECYCLE_ORDER } from "@/constants/enterprise-asset-lifecycle";
import { getEnterpriseAssetsByLifecycle } from "@/lib/enterprise-asset-library/eal-store";
import { EalShell } from "@/components/catalyst-one/enterprise-asset-library/eal-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";
import type { EnterpriseAssetLifecycleStatus } from "@/types/enterprise-asset-library";

const LIFECYCLE_DESCRIPTIONS: Record<EnterpriseAssetLifecycleStatus, string> = {
  draft: "Initial authoring — asset metadata only.",
  review: "Under governance review.",
  approved: "Approved for publication.",
  published: "Immutable published snapshot available for composition references.",
  deprecated: "Superseded — references retained, no new bindings.",
  archived: "Historical record — read-only.",
};

export function EalLifecycleView() {
  return (
    <EalShell title="Lifecycle" description="Governed enterprise asset lifecycle — design-time only.">
      <div className="space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Lifecycle Pipeline</CardTitle>
            <CardDescription>Draft → Review → Approved → Published → Deprecated → Archived</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {EAL_LIFECYCLE_ORDER.map((stage, i) => (
                <div key={stage} className="flex items-center gap-2">
                  <StatusPill variant="info">{EAL_LIFECYCLE_LABELS[stage]}</StatusPill>
                  {i < EAL_LIFECYCLE_ORDER.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {EAL_LIFECYCLE_ORDER.map((stage) => {
            const assets = getEnterpriseAssetsByLifecycle(stage);
            return (
              <Card key={stage} className="glass-card border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{EAL_LIFECYCLE_LABELS[stage]}</CardTitle>
                  <CardDescription className="text-xs">{LIFECYCLE_DESCRIPTIONS[stage]}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-2xl font-bold">{assets.length}</p>
                  {assets.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {assets.slice(0, 5).map((a) => (
                        <li key={a.assetId}>{a.assetName}</li>
                      ))}
                      {assets.length > 5 && <li>+{assets.length - 5} more</li>}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </EalShell>
  );
}
