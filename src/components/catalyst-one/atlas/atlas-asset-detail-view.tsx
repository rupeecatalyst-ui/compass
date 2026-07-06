"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  ENTERPRISE_ARTIFACT_STATUS_LABELS,
  ENTERPRISE_ARTIFACT_STATUS_VARIANT,
} from "@/constants/enterprise-architecture";
import {
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_VARIANT,
  ENTERPRISE_ASSET_TYPE_LABELS,
} from "@/constants/atlas";
import { evaluateArtifactCompliance } from "@/lib/enterprise-architecture/compliance-engine";
import { getPerformanceBudgetForArtifact } from "@/lib/enterprise-architecture/registry-store";
import { getAssetTimeline } from "@/lib/atlas/atlas-store";
import type { EnterpriseAsset } from "@/types/atlas";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import { ComplianceVerdictBadge } from "@/components/catalyst-one/architecture/compliance-score-badge";
import { DocumentationStatusBadge } from "@/components/catalyst-one/architecture/documentation-status-badge";
import { AtlasTimelinePanel } from "@/components/catalyst-one/atlas/atlas-timeline-panel";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RESERVED_TABS = [
  "Relationships",
  "Dependencies",
  "Impact Analysis",
  "Knowledge Graph",
  "AI Insights",
] as const;

interface AtlasAssetDetailViewProps {
  asset: EnterpriseAsset;
}

export function AtlasAssetDetailView({ asset }: AtlasAssetDetailViewProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";

  const compliance = evaluateArtifactCompliance({
    enterpriseId: asset.enterpriseId,
    name: asset.name,
    type: asset.assetType,
    parentId: asset.parentAssetId,
    owner: asset.owner,
    status: asset.status,
    version: asset.version,
    description: asset.description,
    createdDate: asset.createdDate,
    modifiedDate: asset.modifiedDate,
    documentationStatus: asset.documentationStatus,
    complianceScore: asset.complianceScore,
    performanceBudgetId: asset.performanceBudgetRef?.id ?? null,
    architectureMetadata: asset.architectureMetadata,
    atlasId: asset.enterpriseId,
    sageId: null,
    forgeId: null,
  });

  const budget = getPerformanceBudgetForArtifact(asset.enterpriseId);
  const timeline = getAssetTimeline(asset.enterpriseId);

  return (
    <ArchitectureShell
      title={asset.name}
      description={`${asset.enterpriseId} · ${ENTERPRISE_ASSET_TYPE_LABELS[asset.assetType]} · ${asset.module}`}
      actions={
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <Link href={ROUTES.ADMIN_ARCHITECTURE_ATLAS_EXPLORER}>Back to Explorer</Link>
        </Button>
      }
    >
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="metadata" className="text-xs">Metadata</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs">Version History</TabsTrigger>
          <TabsTrigger value="documentation" className="text-xs">Documentation</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">Performance Budget</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
          {RESERVED_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab.toLowerCase().replace(/\s/g, "-")} className="text-xs" disabled>
              <Lock className="mr-1 h-3 w-3" />
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <Card className="glass-card border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{asset.name}</CardTitle>
                <StatusPill variant={ENTERPRISE_ARTIFACT_STATUS_VARIANT[asset.status]}>
                  {ENTERPRISE_ARTIFACT_STATUS_LABELS[asset.status]}
                </StatusPill>
                <StatusPill variant={COMPLIANCE_STATUS_VARIANT[asset.complianceStatus]}>
                  {COMPLIANCE_STATUS_LABELS[asset.complianceStatus]}
                </StatusPill>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Meta label="Enterprise ID" value={asset.enterpriseId} mono />
              <Meta label="Asset Type" value={ENTERPRISE_ASSET_TYPE_LABELS[asset.assetType]} />
              <Meta label="Category" value={asset.category} />
              <Meta label="Module" value={asset.module} />
              <Meta label="Owner" value={asset.owner} />
              <Meta label="Version" value={asset.version} mono />
              <Meta label="Parent Asset" value={asset.parentAssetId ?? "—"} mono />
              <Meta label="Compliance Score" value={`${asset.complianceScore}%`} />
              <Meta label="Created" value={new Date(asset.createdDate).toLocaleDateString("en-IN")} />
              <Meta label="Modified" value={new Date(asset.modifiedDate).toLocaleDateString("en-IN")} />
              <Meta label="Description" value={asset.description} className="sm:col-span-2 lg:col-span-3" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Architecture Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {Object.entries(asset.architectureMetadata).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{formatMetaKey(key)}</span>
                  <StatusPill variant={value ? "success" : "muted"}>{value ? "Yes" : "No"}</StatusPill>
                </div>
              ))}
              {asset.platformRef && (
                <Meta
                  label="Platform Reference"
                  value={`${asset.platformRef.module} / ${asset.platformRef.refId}`}
                  className="sm:col-span-2"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asset.versionHistory.map((v) => (
                  <TableRow key={v.version}>
                    <TableCell className="font-mono text-xs">{v.version}</TableCell>
                    <TableCell>
                      <StatusPill variant={ENTERPRISE_ARTIFACT_STATUS_VARIANT[v.status]}>
                        {ENTERPRISE_ARTIFACT_STATUS_LABELS[v.status]}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(v.modifiedDate).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-xs">{v.actor ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="documentation">
          <Card className="glass-card border-border/60">
            <CardContent className="flex items-center gap-4 p-6">
              <DocumentationStatusBadge status={asset.documentationStatus} />
              <p className="text-sm text-muted-foreground">
                SAGE Knowledge Hub integration reserved — documentation readiness tracked at design-time only.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Compliance Evaluation · {compliance.overallScore}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {compliance.results.map((r) => (
                <div
                  key={r.ruleId}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground">{r.message}</p>
                  </div>
                  <ComplianceVerdictBadge verdict={r.verdict} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="glass-card border-border/60">
            <CardContent className="p-6">
              {budget ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Meta label="Budget Label" value={budget.label} />
                  <Meta label="Expected Queries" value={String(budget.expectedQueries)} />
                  <Meta label="Expected API Calls" value={String(budget.expectedApiCalls)} />
                  <Meta label="Cache Usage" value={budget.expectedCacheUsage} />
                  <Meta label="Memory Profile" value={budget.expectedMemoryProfile} />
                  <Meta label="Response Time (ms)" value={String(budget.expectedResponseTimeMs)} />
                  <Meta label="Async Events" value={String(budget.expectedAsyncEvents)} />
                  <Meta label="Sync Operations" value={String(budget.expectedSyncOperations)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No performance budget defined for this asset.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <AtlasTimelinePanel enterpriseId={asset.enterpriseId} />
          {timeline.length === 0 && asset.versionHistory.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Version history entries supplement the architecture timeline.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </ArchitectureShell>
  );
}

function Meta({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function formatMetaKey(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
