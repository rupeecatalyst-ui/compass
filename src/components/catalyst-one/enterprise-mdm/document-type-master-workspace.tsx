"use client";

/**
 * CO-MDM-001 — Document Type Master (API-backed).
 */

import { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api-client";
import { canWriteEnterpriseMdm } from "@/constants/enterprise-mdm";
import { useAuthContext } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/design-system/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DocType = {
  id: string;
  code: string;
  label: string;
  category?: string;
  enabled?: boolean;
  status?: string;
  updatedAt?: string;
};

async function parse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

export function DocumentTypeMasterWorkspace() {
  const { user } = useAuthContext();
  const canWrite = canWriteEnterpriseMdm(user?.role);
  const [items, setItems] = useState<DocType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/document-registry/types?pageSize=200&status=all", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await parse<{ items: DocType[] }>(res);
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load document types");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/document-registry/types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code,
          label,
          category: "general",
          enabled: true,
          status: "active",
        }),
      });
      await parse(res);
      setCode("");
      setLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Document Type Master"
        description="Maintain document types used by Document Center. Seed types remain; administrators may add more."
        actions={
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />
      {!canWrite ? (
        <p className="text-sm text-muted-foreground">Read-only access for your role.</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {canWrite ? (
        <Card className="flex flex-wrap items-end gap-2 border-border/60 p-4">
          <div className="space-y-1">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-9 w-56" />
          </div>
          <Button type="button" size="sm" disabled={saving} onClick={() => void create()}>
            Create
          </Button>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No document types found. Ensure Document Registry persistence is enabled and seeded.
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="text-xs font-medium">{row.label}</TableCell>
                  <TableCell className="text-xs">{row.category ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.enabled ? "default" : "outline"}>
                      {row.status ?? (row.enabled ? "active" : "inactive")}
                    </Badge>
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
