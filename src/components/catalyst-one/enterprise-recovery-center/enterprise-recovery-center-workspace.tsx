"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import {
  PermanentDeleteConfirmDialog,
} from "@/components/enterprise/soft-delete/soft-delete-dialogs";
import { PageHeader } from "@/components/design-system/page-header";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SOFT_DELETE_MODULE_LABELS,
  SOFT_DELETE_DEFAULT_RETENTION_DAYS,
} from "@/constants/enterprise-soft-delete";
import {
  canPermanentlyDelete,
  canRestoreSoftDeleted,
  softDeleteApi,
} from "@/lib/enterprise-soft-delete";
import { cn } from "@/lib/utils";
import type {
  SoftDeleteModuleId,
  SoftDeleteRecoveryRecord,
} from "@/types/enterprise-soft-delete";

const RECOVERY_TABS: SoftDeleteModuleId[] = [
  "opportunities",
  "contacts",
  "companies",
  "documents",
  "tasks",
  "loan_files",
];

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function EnterpriseRecoveryCenterWorkspace() {
  const { user } = useAuthContext();
  const role = user?.role ?? "VIEWER";
  const [tab, setTab] = useState<SoftDeleteModuleId>("contacts");
  const [records, setRecords] = useState<SoftDeleteRecoveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<SoftDeleteRecoveryRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canRestore = canRestoreSoftDeleted(role);
  const canPurge = canPermanentlyDelete(role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await softDeleteApi.list(tab);
      setRecords(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recovery records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => records.filter((r) => r.module === tab && r.status === "deleted"),
    [records, tab],
  );

  async function handleRestore(row: SoftDeleteRecoveryRecord) {
    setBusyId(row.id);
    setMessage(null);
    try {
      await softDeleteApi.restore({ module: row.module, entityId: row.entityId });
      setMessage(`Restored “${row.entityLabel}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurge() {
    if (!purgeTarget) return;
    setBusyId(purgeTarget.id);
    setMessage(null);
    try {
      await softDeleteApi.permanentlyDelete({
        module: purgeTarget.module,
        entityId: purgeTarget.entityId,
        confirmation: "DELETE",
      });
      setMessage(`Permanently deleted “${purgeTarget.entityLabel}”.`);
      setPurgeTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permanent delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enterprise Recovery Center"
        description={`Soft-deleted business records · ${SOFT_DELETE_DEFAULT_RETENTION_DAYS}-day retention before purge eligibility · SUPER_ADMIN may permanently delete`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Operational screens never show these records. Restore returns them to their module.
        </p>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as SoftDeleteModuleId)}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {RECOVERY_TABS.map((id) => (
            <TabsTrigger key={id} value={id} className="text-xs">
              {SOFT_DELETE_MODULE_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>

        {RECOVERY_TABS.map((id) => (
          <TabsContent key={id} value={id} className="mt-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading deleted records…</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <p className="text-sm font-medium">No deleted {SOFT_DELETE_MODULE_LABELS[id].toLowerCase()}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Soft-deleted records for this module appear here for restore or permanent purge.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Record Name</th>
                      <th className="px-3 py-2 font-medium">Module</th>
                      <th className="px-3 py-2 font-medium">Deleted By</th>
                      <th className="px-3 py-2 font-medium">Deleted On</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                      <th className="px-3 py-2 font-medium">Original Owner</th>
                      <th className="px-3 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2.5 font-medium">{row.entityLabel}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {SOFT_DELETE_MODULE_LABELS[row.module]}
                        </td>
                        <td className="px-3 py-2.5">
                          {row.deletedByName || row.deletedBy.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {formatWhen(row.deletedAt)}
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2.5 text-muted-foreground">
                          {row.deletionReason || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {row.originalOwner || row.ownerName || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs"
                              disabled
                              title="Open the original module after restore to view full detail"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                            {canRestore ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2 text-xs"
                                disabled={busyId === row.id}
                                onClick={() => void handleRestore(row)}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Restore
                              </Button>
                            ) : null}
                            {canPurge ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className={cn("h-7 gap-1 px-2 text-xs")}
                                disabled={busyId === row.id}
                                onClick={() => setPurgeTarget(row)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Permanently Delete
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <PermanentDeleteConfirmDialog
        open={Boolean(purgeTarget)}
        onOpenChange={(open) => {
          if (!open) setPurgeTarget(null);
        }}
        recordLabel={purgeTarget?.entityLabel ?? ""}
        busy={busyId === purgeTarget?.id}
        onConfirm={() => void handlePurge()}
      />
    </div>
  );
}
