"use client";

import { useMemo, useState } from "react";
import {
  ENTERPRISE_ARTIFACT_STATUS_LABELS,
  ENTERPRISE_ARTIFACT_STATUS_VARIANT,
  ENTERPRISE_ARTIFACT_TYPE_LABELS,
} from "@/constants/enterprise-architecture";
import { searchEnterpriseRegistry } from "@/lib/enterprise-architecture/registry-store";
import type { EnterpriseArtifactType } from "@/types/enterprise-architecture";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import { ComplianceScoreBadge } from "@/components/catalyst-one/architecture/compliance-score-badge";
import { DocumentationStatusBadge } from "@/components/catalyst-one/architecture/documentation-status-badge";
import { StatusPill } from "@/components/design-system/status-pill";
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

const ALL_TYPES = "__all__";

export function RegistryView() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);

  const records = useMemo(() => {
    let results = searchEnterpriseRegistry(query);
    if (typeFilter !== ALL_TYPES) {
      results = results.filter((r) => r.type === typeFilter);
    }
    return results;
  }, [query, typeFilter]);

  return (
    <ArchitectureShell
      title="Enterprise Registry"
      description="Module-agnostic enterprise catalog. Not a graph database — no runtime dependency analysis."
      showSearch
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search by ID, name, owner, type..."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>All types</SelectItem>
              {(Object.keys(ENTERPRISE_ARTIFACT_TYPE_LABELS) as EnterpriseArtifactType[]).map((t) => (
                <SelectItem key={t} value={t}>{ENTERPRISE_ARTIFACT_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{records.length} artifact(s)</p>
        </div>

        <Card className="glass-card overflow-hidden border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enterprise ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Documentation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.enterpriseId}>
                  <TableCell className="font-mono text-xs">{record.enterpriseId}</TableCell>
                  <TableCell className="max-w-[10rem] truncate text-xs font-medium">
                    {record.name}
                  </TableCell>
                  <TableCell className="text-xs">
                    {ENTERPRISE_ARTIFACT_TYPE_LABELS[record.type]}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {record.parentId ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">{record.owner}</TableCell>
                  <TableCell>
                    <StatusPill variant={ENTERPRISE_ARTIFACT_STATUS_VARIANT[record.status]}>
                      {ENTERPRISE_ARTIFACT_STATUS_LABELS[record.status]}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{record.version}</TableCell>
                  <TableCell>
                    <ComplianceScoreBadge score={record.complianceScore} />
                  </TableCell>
                  <TableCell>
                    <DocumentationStatusBadge status={record.documentationStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </ArchitectureShell>
  );
}
