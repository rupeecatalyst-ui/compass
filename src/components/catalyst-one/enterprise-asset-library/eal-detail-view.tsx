"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import {
  EAL_ASSET_TYPE_LABELS,
  EAL_LIFECYCLE_LABELS,
  EAL_LIFECYCLE_PILL_VARIANT,
  EAL_STATUS_LABELS,
  EAL_STATUS_PILL_VARIANT,
  formatEnterpriseAssetVersion,
} from "@/constants/enterprise-asset-lifecycle";
import {
  getAuditTrailForEnterpriseAsset,
  getEnterpriseAssetCategoryById,
  getEnterpriseAssetVersions,
  transitionEnterpriseAssetLifecycle,
} from "@/lib/enterprise-asset-library/eal-store";
import type { EnterpriseAsset, EnterpriseAssetLifecycleStatus } from "@/types/enterprise-asset-library";
import { EalShell } from "@/components/catalyst-one/enterprise-asset-library/eal-shell";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EalDetailViewProps {
  asset: EnterpriseAsset;
}

export function EalDetailView({ asset }: EalDetailViewProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";
  const category = getEnterpriseAssetCategoryById(asset.categoryId);
  const audit = getAuditTrailForEnterpriseAsset(asset.assetId);
  const versions = getEnterpriseAssetVersions(asset.assetId);

  return (
    <EalShell
      closeTo={WORKSPACE_CLOSE.ENTERPRISE_ASSET_REGISTRY}
      title={asset.assetName}
      description={`${asset.assetCode} · ${formatEnterpriseAssetVersion(asset.majorVersion, asset.minorVersion)} · ${EAL_ASSET_TYPE_LABELS[asset.assetType]}`}
      actions={
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <Link href={ROUTES.ADMIN_ENTERPRISE_ASSETS_REGISTRY}>Back to Registry</Link>
        </Button>
      }
    >
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="metadata" className="text-xs">Metadata</TabsTrigger>
          <TabsTrigger value="dependencies" className="text-xs">Dependencies</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs">Version History</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="glass-card border-border/60">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-base">{asset.assetName}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <StatusPill variant={EAL_LIFECYCLE_PILL_VARIANT[asset.lifecycle]}>{EAL_LIFECYCLE_LABELS[asset.lifecycle]}</StatusPill>
                  <StatusPill variant={EAL_STATUS_PILL_VARIANT[asset.status]}>{EAL_STATUS_LABELS[asset.status]}</StatusPill>
                  <StatusPill variant="muted">{EAL_ASSET_TYPE_LABELS[asset.assetType]}</StatusPill>
                </div>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{asset.assetId}</p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Meta label="Asset Code" value={asset.assetCode} mono />
              <Meta label="Category" value={category?.categoryName ?? asset.categoryId} />
              <Meta label="Version" value={formatEnterpriseAssetVersion(asset.majorVersion, asset.minorVersion)} mono />
              <Meta label="Owner" value={asset.owner} />
              <Meta label="Created By" value={asset.createdBy} />
              <Meta label="Created" value={new Date(asset.createdDate).toLocaleDateString()} />
              <Meta label="Updated" value={new Date(asset.updatedDate).toLocaleDateString()} />
              <Meta label="Published" value={asset.publishedDate ? new Date(asset.publishedDate).toLocaleDateString() : "—"} />
              <Meta label="Description" value={asset.description} className="sm:col-span-2 lg:col-span-3" />
            </CardContent>
          </Card>
          <LifecycleActions asset={asset} />
        </TabsContent>

        <TabsContent value="metadata">
          <Card className="glass-card border-border/60">
            <CardHeader><CardTitle className="text-base">Metadata</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(asset.metadata).length === 0 ? (
                <p className="text-sm text-muted-foreground">No metadata defined.</p>
              ) : (
                Object.entries(asset.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 rounded-lg border border-border/50 px-3 py-2 text-xs">
                    <span className="font-mono text-muted-foreground">{key}</span>
                    <span className="font-medium">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="glass-card mt-4 border-border/60">
            <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {asset.tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags.</p>
              ) : (
                asset.tags.map((tag) => <StatusPill key={tag} variant="muted">{tag}</StatusPill>)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies">
          <Card className="glass-card border-border/60">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Ref ID</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asset.dependencies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-xs text-muted-foreground">No dependencies.</TableCell>
                    </TableRow>
                  ) : (
                    asset.dependencies.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs capitalize">{d.dependencyType}</TableCell>
                        <TableCell className="font-mono text-xs">{d.refId}</TableCell>
                        <TableCell className="text-xs">{d.label}</TableCell>
                        <TableCell className="text-xs">{d.required ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{formatEnterpriseAssetVersion(v.majorVersion, v.minorVersion)}</TableCell>
                    <TableCell>
                      <StatusPill variant={EAL_LIFECYCLE_PILL_VARIANT[v.lifecycle]}>{EAL_LIFECYCLE_LABELS[v.lifecycle]}</StatusPill>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={EAL_STATUS_PILL_VARIANT[v.status]}>{EAL_STATUS_LABELS[v.status]}</StatusPill>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(v.updatedDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.publishedDate ? new Date(v.publishedDate).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-xs text-muted-foreground">No audit entries.</TableCell>
                  </TableRow>
                ) : (
                  audit.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{new Date(e.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{e.actor}</TableCell>
                      <TableCell className="text-xs">{e.action}</TableCell>
                      <TableCell className="text-xs">{e.oldValue && e.newValue ? `${e.oldValue} → ${e.newValue}` : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </EalShell>
  );
}

function Meta({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function LifecycleActions({ asset }: { asset: EnterpriseAsset }) {
  const actions: Array<{ label: string; status: EnterpriseAssetLifecycleStatus }> = [
    { label: "Submit Review", status: "review" },
    { label: "Approve", status: "approved" },
    { label: "Publish", status: "published" },
    { label: "Deprecate", status: "deprecated" },
    { label: "Archive", status: "archived" },
  ];

  return (
    <Card className="glass-card mt-4 border-border/60">
      <CardHeader><CardTitle className="text-base">Lifecycle</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map(({ label, status }) => (
          <Button
            key={status}
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={asset.lifecycle === status}
            onClick={() => transitionEnterpriseAssetLifecycle(asset.assetId, status, "EAL Admin")}
          >
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
