"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import {
  EAL_ASSET_TYPE_LABELS,
  EAL_ASSET_TYPES,
  EAL_LIFECYCLE_LABELS,
  EAL_LIFECYCLE_PILL_VARIANT,
  EAL_LIFECYCLE_ORDER,
  EAL_STATUS_LABELS,
  EAL_STATUS_PILL_VARIANT,
} from "@/constants/enterprise-asset-lifecycle";
import { getEnterpriseAssetCategories, searchEnterpriseAssetRegistry } from "@/lib/enterprise-asset-library/eal-store";
import type { EnterpriseAssetRegistrySortField, EnterpriseAssetType } from "@/types/enterprise-asset-library";
import { EalShell } from "@/components/catalyst-one/enterprise-asset-library/eal-shell";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function EalRegistryView() {
  const [query, setQuery] = useState("");
  const [assetType, setAssetType] = useState<EnterpriseAssetType | "all">("all");
  const [lifecycle, setLifecycle] = useState<(typeof EAL_LIFECYCLE_ORDER)[number] | "all">("all");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [sortField, setSortField] = useState<EnterpriseAssetRegistrySortField>("assetName");
  const [sortAsc, setSortAsc] = useState(true);

  const categories = getEnterpriseAssetCategories();
  const registry = useMemo(
    () =>
      searchEnterpriseAssetRegistry(
        query,
        { assetType, lifecycle, categoryId },
        sortField,
        sortAsc,
      ),
    [query, assetType, lifecycle, categoryId, sortField, sortAsc],
  );

  return (
    <EalShell
      title="Asset Registry"
      description="Generic enterprise asset catalog with search, filter, and sort."
      showSearch
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search name, type, category, tag, version..."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={assetType} onValueChange={(v) => setAssetType(v as EnterpriseAssetType | "all")}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Asset type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {EAL_ASSET_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{EAL_ASSET_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={lifecycle} onValueChange={(v) => setLifecycle(v as typeof lifecycle)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Lifecycle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lifecycle</SelectItem>
              {EAL_LIFECYCLE_ORDER.map((l) => (
                <SelectItem key={l} value={l}>{EAL_LIFECYCLE_LABELS[l]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={(v) => setSortField(v as EnterpriseAssetRegistrySortField)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="assetName">Name</SelectItem>
              <SelectItem value="assetType">Type</SelectItem>
              <SelectItem value="categoryName">Category</SelectItem>
              <SelectItem value="versionLabel">Version</SelectItem>
              <SelectItem value="lifecycle">Lifecycle</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="updatedDate">Updated</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSortAsc((v) => !v)}>
            {sortAsc ? "Asc" : "Desc"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{registry.length} asset(s)</p>

        <Card className="glass-card overflow-hidden border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registry.map((row) => (
                <TableRow key={row.assetId}>
                  <TableCell className="font-mono text-xs">{row.assetId}</TableCell>
                  <TableCell className="max-w-[12rem] truncate text-xs font-medium">{row.assetName}</TableCell>
                  <TableCell className="text-xs">{EAL_ASSET_TYPE_LABELS[row.assetType]}</TableCell>
                  <TableCell className="text-xs">{row.categoryName}</TableCell>
                  <TableCell className="font-mono text-xs">{row.versionLabel}</TableCell>
                  <TableCell>
                    <StatusPill variant={EAL_STATUS_PILL_VARIANT[row.status]}>{EAL_STATUS_LABELS[row.status]}</StatusPill>
                  </TableCell>
                  <TableCell className="text-xs">{row.owner}</TableCell>
                  <TableCell>
                    <StatusPill variant={EAL_LIFECYCLE_PILL_VARIANT[row.lifecycle]}>{EAL_LIFECYCLE_LABELS[row.lifecycle]}</StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                      <Link href={`${ROUTES.ADMIN_ENTERPRISE_ASSETS_REGISTRY}/${row.assetId}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </EalShell>
  );
}
