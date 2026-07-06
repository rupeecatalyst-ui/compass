"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import {
  getAtlasFilterOptions,
  searchAtlasAssets,
} from "@/lib/atlas/atlas-store";
import type { EnterpriseAssetType } from "@/types/atlas";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import { DocumentationStatusBadge } from "@/components/catalyst-one/architecture/documentation-status-badge";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL = "__all__";

export function AtlasAssetExplorer() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [assetType, setAssetType] = useState(ALL);
  const [module, setModule] = useState(ALL);
  const [owner, setOwner] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [sortBy, setSortBy] = useState<"name" | "modifiedDate" | "complianceScore">("modifiedDate");

  const filterOptions = getAtlasFilterOptions();

  const result = useMemo(
    () =>
      searchAtlasAssets(
        {
          query,
          assetType: assetType === ALL ? "all" : (assetType as EnterpriseAssetType),
          module: module === ALL ? "all" : module,
          owner: owner === ALL ? "all" : owner,
          status: status === ALL ? "all" : status as import("@/types/atlas").AtlasAssetStatus,
          category: category === ALL ? "all" : category,
        },
        page,
        12,
        sortBy,
        "desc",
      ),
    [query, page, assetType, module, owner, status, category, sortBy],
  );

  return (
    <ArchitectureShell
      title="Asset Explorer"
      description="Searchable enterprise asset catalog — design-time only. No graph traversal."
      showSearch
      searchValue={query}
      onSearchChange={(v) => {
        setQuery(v);
        setPage(1);
      }}
      searchPlaceholder="Search by ID, name, module, owner..."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={assetType} onChange={(v) => { setAssetType(v); setPage(1); }} label="Type">
            {(Object.keys(ENTERPRISE_ASSET_TYPE_LABELS) as EnterpriseAssetType[]).map((t) => (
              <SelectItem key={t} value={t}>{ENTERPRISE_ASSET_TYPE_LABELS[t]}</SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect value={module} onChange={(v) => { setModule(v); setPage(1); }} label="Module">
            {filterOptions.modules.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect value={owner} onChange={(v) => { setOwner(v); setPage(1); }} label="Owner">
            {filterOptions.owners.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect value={category} onChange={(v) => { setCategory(v); setPage(1); }} label="Category">
            {filterOptions.categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} label="Status">
            {(Object.keys(ENTERPRISE_ARTIFACT_STATUS_LABELS) as import("@/types/enterprise-architecture").EnterpriseArtifactStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{ENTERPRISE_ARTIFACT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect value={sortBy} onChange={(v) => setSortBy(v as typeof sortBy)} label="Sort">
            <SelectItem value="modifiedDate">Modified Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="complianceScore">Compliance Score</SelectItem>
          </FilterSelect>
        </div>

        <p className="text-sm text-muted-foreground">
          {result.total} asset(s) · Page {result.page} of {result.totalPages}
        </p>

        <Card className="glass-card overflow-hidden border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enterprise ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Documentation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((asset) => (
                <TableRow key={asset.enterpriseId}>
                  <TableCell className="font-mono text-xs">{asset.enterpriseId}</TableCell>
                  <TableCell className="max-w-[10rem] truncate text-xs font-medium">{asset.name}</TableCell>
                  <TableCell className="text-xs">{ENTERPRISE_ASSET_TYPE_LABELS[asset.assetType]}</TableCell>
                  <TableCell className="text-xs">{asset.module}</TableCell>
                  <TableCell className="text-xs">{asset.owner}</TableCell>
                  <TableCell className="font-mono text-xs">{asset.version}</TableCell>
                  <TableCell>
                    <StatusPill variant={ENTERPRISE_ARTIFACT_STATUS_VARIANT[asset.status]}>
                      {ENTERPRISE_ARTIFACT_STATUS_LABELS[asset.status]}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={COMPLIANCE_STATUS_VARIANT[asset.complianceStatus]}>
                      {COMPLIANCE_STATUS_LABELS[asset.complianceStatus]}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <DocumentationStatusBadge status={asset.documentationStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                      <Link href={`${ROUTES.ADMIN_ARCHITECTURE_ATLAS}/${asset.enterpriseId}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={page >= result.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </ArchitectureShell>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[130px] text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}
