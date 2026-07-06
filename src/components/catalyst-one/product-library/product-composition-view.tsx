"use client";

import { getPlatformCompositionRef } from "@/lib/product-library/product-store";
import type { PlatformCompositionRef, ProductCompositionAsset, ProductDefinition } from "@/types/product-library";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_VARIANT = {
  draft: "warning",
  published: "success",
  archived: "muted",
} as const;

function resolvePlatformRef(refId: string): PlatformCompositionRef {
  return (
    getPlatformCompositionRef(refId) ?? {
      refId,
      refType: "policy",
      version: "—",
      status: "draft",
      description: "Platform reference — catalog entry not registered.",
    }
  );
}

interface CompositionTableRow {
  refId: string;
  assetType: string;
  version: string;
  status: ProductCompositionAsset["status"];
  description: string;
}

function PlatformRefPanel({ title, refIds }: { title: string; refIds: string[] }) {
  const rows: CompositionTableRow[] = refIds.map((refId) => {
    const entry = resolvePlatformRef(refId);
    return {
      refId: entry.refId,
      assetType: entry.refType.replace("_", " ").toUpperCase(),
      version: entry.version,
      status: entry.status,
      description: entry.description,
    };
  });
  return <CompositionTable title={title} rows={rows} />;
}

function CompositionTable({ title, rows }: { title: string; rows: CompositionTableRow[] }) {
  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">No references bound.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference ID</TableHead>
                <TableHead>Asset Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.refId}>
                  <TableCell className="font-mono text-xs">{row.refId}</TableCell>
                  <TableCell className="text-xs">{row.assetType}</TableCell>
                  <TableCell className="font-mono text-xs">{row.version}</TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[row.status]}>{row.status}</StatusPill>
                  </TableCell>
                  <TableCell className="max-w-md text-xs text-muted-foreground">{row.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

interface ProductCompositionViewProps {
  product: ProductDefinition;
}

export function ProductCompositionView({ product }: ProductCompositionViewProps) {
  const enterpriseRows: CompositionTableRow[] = product.compositionAssets.map((asset) => ({
    refId: asset.assetId,
    assetType: asset.assetType,
    version: asset.version,
    status: asset.status,
    description: asset.description,
  }));

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Enterprise Composition</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Metadata-only blueprint assembling reusable enterprise capabilities. EAL-ready generic asset references. No execution.
          </p>
        </CardContent>
      </Card>

      <PlatformRefPanel title="Policies" refIds={product.policyIds} />
      <PlatformRefPanel title="Rules" refIds={product.ruleIds} />
      <PlatformRefPanel title="Workflows" refIds={product.workflowIds} />
      <PlatformRefPanel title="Decision Matrices" refIds={product.decisionMatrixIds} />
      <CompositionTable title="Enterprise Assets" rows={enterpriseRows} />
    </div>
  );
}
