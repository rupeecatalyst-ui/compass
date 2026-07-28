"use client";

/**
 * CO-MDM-001 — Enterprise Reference Master administration.
 * Full Create / Edit / Search / Filter / Sort / Activate / Deactivate / Archive / Restore / Duplicate.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import {
  REFERENCE_MASTER_DOMAINS,
  type ReferenceMasterDomainCode,
} from "@/constants/enterprise-master-data";
import { MDM_DOMAIN_LABELS, canWriteEnterpriseMdm } from "@/constants/enterprise-mdm";
import { useAuthContext } from "@/components/providers/auth-provider";
import { referenceMasterAdminClient } from "@/lib/enterprise-master-data/reference-master-admin-client";
import type { EnterpriseReferenceMasterRecord } from "@/types/enterprise-master-data";

type Draft = {
  id?: string;
  code: string;
  label: string;
  description: string;
  sortOrder: string;
  enabled: boolean;
};

const emptyDraft = (): Draft => ({
  code: "",
  label: "",
  description: "",
  sortOrder: "0",
  enabled: true,
});

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ReferenceMasterAdminWorkspace({
  initialDomain,
}: {
  initialDomain?: ReferenceMasterDomainCode;
}) {
  const { user } = useAuthContext();
  const canWrite = canWriteEnterpriseMdm(user?.role);
  const [domain, setDomain] = useState<ReferenceMasterDomainCode>(
    initialDomain ?? "business_source",
  );
  const [records, setRecords] = useState<EnterpriseReferenceMasterRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "active" | "inactive" | "archived"
  >("all");
  const [sortBy, setSortBy] = useState<"sortOrder" | "label" | "code" | "modifiedOn" | "createdOn">(
    "sortOrder",
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState<EnterpriseReferenceMasterRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialDomain) setDomain(initialDomain);
  }, [initialDomain]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await referenceMasterAdminClient.query({
        domain,
        pageSize: 500,
        status: statusFilter,
        enabled: "all",
        search: search || undefined,
        sortBy,
        sortDir: "asc",
      });
      setRecords(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load master records");
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [domain, search, statusFilter, sortBy]);

  useEffect(() => {
    void load();
  }, [load]);

  const domainOptions = useMemo(
    () =>
      REFERENCE_MASTER_DOMAINS.map((d) => ({
        value: d,
        label: MDM_DOMAIN_LABELS[d] ?? d,
      })),
    [],
  );

  const saveDraft = async () => {
    if (!draft || !canWrite) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (draft.id) {
        await referenceMasterAdminClient.update(draft.id, {
          label: draft.label,
          description: draft.description || null,
          sortOrder: Number(draft.sortOrder) || 0,
          enabled: draft.enabled,
          status: draft.enabled ? "active" : "inactive",
        });
        setMessage(`Updated "${draft.label}".`);
      } else {
        await referenceMasterAdminClient.create({
          domain,
          code: draft.code,
          label: draft.label,
          description: draft.description || undefined,
          sortOrder: Number(draft.sortOrder) || 0,
          enabled: draft.enabled,
          status: draft.enabled ? "active" : "draft",
        });
        setMessage(`Created "${draft.label}".`);
      }
      setDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (
    id: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    if (!canWrite) {
      setError("Managers have read-only access to Master Data.");
      return;
    }
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lookup Masters"
        description="Maintain business lookup values used across Opportunity, Contacts, Credit, and Reports. Seed defaults remain available; administrators can add and manage without developer involvement."
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

      {!canWrite ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Read-only access. Only Super Administrators and Administrators can change master data.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Master</p>
          <Select value={domain} onValueChange={(v) => setDomain(v as ReferenceMasterDomainCode)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {domainOptions.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[10rem] space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[10rem] space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Sort</p>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sortOrder">Display order</SelectItem>
              <SelectItem value="label">Name</SelectItem>
              <SelectItem value="code">Code</SelectItem>
              <SelectItem value="modifiedOn">Last modified</SelectItem>
              <SelectItem value="createdOn">Created</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative min-w-[14rem] flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Search</p>
          <Search className="pointer-events-none absolute bottom-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or code…"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={!canWrite}
          onClick={() => setDraft(emptyDraft())}
        >
          <Plus className="h-3.5 w-3.5" />
          Create
        </Button>
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

      {draft ? (
        <Card className="space-y-3 border-border/60 p-4">
          <p className="text-sm font-medium">{draft.id ? "Edit record" : "Create record"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={draft.code}
                disabled={Boolean(draft.id)}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="e.g. direct"
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Business-friendly name"
              />
            </div>
            <div className="space-y-1">
              <Label>Display order</Label>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                checked={draft.enabled}
                onCheckedChange={(v) => setDraft({ ...draft, enabled: Boolean(v) })}
              />
              <Label>Active</Label>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" disabled={saving || !canWrite} onClick={() => void saveDraft()}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {viewing ? (
        <Card className="space-y-2 border-border/60 p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{viewing.label}</p>
            <Button type="button" size="sm" variant="ghost" onClick={() => setViewing(null)}>
              Close
            </Button>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{viewing.code}</p>
          <p>{viewing.description || "No description"}</p>
          <p className="text-xs text-muted-foreground">
            Created by {viewing.createdBy} · {formatWhen(viewing.createdAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            Last modified by {viewing.modifiedBy} · {formatWhen(viewing.updatedAt)}
          </p>
          <p className="text-xs text-muted-foreground">Usage count: tracked in consuming modules</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last modified</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  {loading
                    ? "Loading…"
                    : "No records yet. Seed defaults appear after Seed / Sync, or create a new record."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{row.sortOrder}</TableCell>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="text-xs font-medium">{row.label}</TableCell>
                  <TableCell>
                    <Badge variant={row.enabled ? "default" : "outline"}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatWhen(row.updatedAt)}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setViewing(row)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={!canWrite || busyId === row.id}
                      onClick={() =>
                        setDraft({
                          id: row.id,
                          code: row.code,
                          label: row.label,
                          description: row.description ?? "",
                          sortOrder: String(row.sortOrder ?? 0),
                          enabled: row.enabled,
                        })
                      }
                    >
                      Edit
                    </Button>
                    {row.status === "archived" || row.isDeleted ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={!canWrite || busyId === row.id}
                        onClick={() =>
                          void runAction(row.id, () => referenceMasterAdminClient.restore(row.id), `Restored "${row.label}".`)
                        }
                      >
                        Restore
                      </Button>
                    ) : row.enabled ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={!canWrite || busyId === row.id}
                        onClick={() =>
                          void runAction(
                            row.id,
                            () => referenceMasterAdminClient.deactivate(row.id),
                            `Deactivated "${row.label}".`,
                          )
                        }
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={!canWrite || busyId === row.id}
                        onClick={() =>
                          void runAction(
                            row.id,
                            () => referenceMasterAdminClient.activate(row.id),
                            `Activated "${row.label}".`,
                          )
                        }
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={!canWrite || busyId === row.id}
                      onClick={() =>
                        void runAction(
                          row.id,
                          () =>
                            referenceMasterAdminClient.duplicate(row.id, {
                              code: `${row.code}_COPY`,
                              label: `${row.label} (Copy)`,
                            }),
                          `Duplicated "${row.label}".`,
                        )
                      }
                    >
                      Duplicate
                    </Button>
                    {row.status !== "archived" && !row.isDeleted ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                        disabled={!canWrite || busyId === row.id}
                        onClick={() =>
                          void runAction(
                            row.id,
                            () => referenceMasterAdminClient.archive(row.id),
                            `Archived "${row.label}".`,
                          )
                        }
                      >
                        Archive
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
