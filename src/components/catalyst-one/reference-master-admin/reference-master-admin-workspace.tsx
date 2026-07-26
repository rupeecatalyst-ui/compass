"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { REFERENCE_MASTER_DOMAINS } from "@/constants/enterprise-master-data";
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import { referenceMasterAdminClient } from "@/lib/enterprise-master-data/reference-master-admin-client";
import type { EnterpriseReferenceMasterRecord } from "@/types/enterprise-master-data";

function formatDomainLabel(domain: ReferenceMasterDomainCode): string {
  return domain
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusBadgeVariant(
  status: EnterpriseReferenceMasterRecord["status"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "draft":
      return "secondary";
    case "inactive":
      return "outline";
    case "archived":
      return "destructive";
    default:
      return "outline";
  }
}

export function ReferenceMasterAdminWorkspace() {
  const [domain, setDomain] = useState<ReferenceMasterDomainCode>("city");
  const [records, setRecords] = useState<EnterpriseReferenceMasterRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await referenceMasterAdminClient.query({
        domain,
        pageSize: 500,
        status: "all",
        enabled: "all",
      });
      setRecords(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reference masters");
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const code = newCode.trim();
    const label = newLabel.trim();
    if (!code || !label) {
      setError("Code and label are required.");
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      await referenceMasterAdminClient.create({ domain, code, label });
      setNewCode("");
      setNewLabel("");
      setMessage(`Created "${label}" (${code}).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reference master");
    } finally {
      setCreating(false);
    }
  }

  async function handleActivate(record: EnterpriseReferenceMasterRecord) {
    setBusyId(record.id);
    setError(null);
    setMessage(null);
    try {
      await referenceMasterAdminClient.activate(record.id);
      setMessage(`Activated "${record.label}".`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeactivate(record: EnterpriseReferenceMasterRecord) {
    setBusyId(record.id);
    setError(null);
    setMessage(null);
    try {
      await referenceMasterAdminClient.deactivate(record.id);
      setMessage(`Deactivated "${record.label}".`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reference Master"
        description="Maintain Tier 1 enterprise reference data — city, industry, employment type, and related lookup domains."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Domain</p>
          <Select value={domain} onValueChange={(v) => setDomain(v as ReferenceMasterDomainCode)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent>
              {REFERENCE_MASTER_DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>
                  {formatDomainLabel(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="pb-2 text-xs text-muted-foreground">
          {loading ? "Loading…" : `${total} record${total === 1 ? "" : "s"}`}
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-teal-800/50 bg-teal-950/30 px-3 py-2 text-sm text-teal-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <Card className="glass-card border-border/60 p-4">
        <form onSubmit={(e) => void handleCreate(e)} className="flex flex-wrap items-end gap-2">
          <p className="w-full text-xs font-medium text-muted-foreground">Create record</p>
          <Input
            className="h-9 w-40 font-mono text-xs"
            placeholder="Code"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            disabled={creating}
          />
          <Input
            className="h-9 min-w-[12rem] flex-1 text-xs"
            placeholder="Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            disabled={creating}
          />
          <Button type="submit" size="sm" className="h-9 gap-1.5 text-xs" disabled={creating}>
            <Plus className="h-3.5 w-3.5" />
            {creating ? "Creating…" : "Create"}
          </Button>
        </form>
      </Card>

      <Card className="glass-card overflow-hidden border-border/60">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading {formatDomainLabel(domain)} records…
          </p>
        ) : records.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No records for {formatDomainLabel(domain)}.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((row) => {
                const isBusy = busyId === row.id;
                const canActivate = row.status !== "active";
                const canDeactivate = row.status === "active";

                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="max-w-[16rem] truncate text-xs font-medium">
                      {row.label}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.enabled ? "default" : "outline"}>
                        {row.enabled ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canActivate ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 text-[11px]"
                            disabled={isBusy}
                            onClick={() => void handleActivate(row)}
                          >
                            Activate
                          </Button>
                        ) : null}
                        {canDeactivate ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            disabled={isBusy}
                            onClick={() => void handleDeactivate(row)}
                          >
                            Deactivate
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
