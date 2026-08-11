"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, Save, Stamp } from "lucide-react";
import { toast } from "sonner";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE } from "@/lib/organization-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { CompanySealRecord } from "@/types/organization";

export function CompanySealView() {
  const [seal, setSeal] = useState<CompanySealRecord | null>(null);
  const [initials, setInitials] = useState("RC");
  const [version, setVersion] = useState("v1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dto = await organizationWorkspaceApi.getSeal();
      const next = {
        lastUpdated: dto.lastUpdated ?? dto.updatedAt,
        version: dto.version ?? "v1",
        initials: dto.initials ?? "RC",
      };
      setSeal(next);
      setInitials(next.initials);
      setVersion(next.version);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dto = await organizationWorkspaceApi.updateSeal({
        initials: initials.trim() || "RC",
        version: version.trim() || "v1",
        lastUpdated: new Date().toISOString(),
      });
      setSeal({
        lastUpdated: dto.lastUpdated ?? dto.updatedAt,
        version: dto.version ?? version,
        initials: dto.initials ?? initials,
      });
      toast.success("Company seal updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save seal");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading company seal…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  const record = seal ?? { lastUpdated: new Date().toISOString(), version: "—", initials: "RC" };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="glass-card border-border/60">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Company Seal</CardTitle>
            <CardDescription>Official seal for Rupee Catalyst documents</CardDescription>
          </div>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Seal
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-4">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-4 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 shadow-inner">
            <div className="absolute inset-3 rounded-full border-2 border-dashed border-primary/20" />
            <div className="text-center z-10">
              <Stamp className="mx-auto h-10 w-10 text-primary" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-primary">
                {initials || record.initials}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Rupee Catalyst</p>
            </div>
          </div>
          <div className="grid w-full max-w-sm gap-3">
            <div className="space-y-1.5">
              <Label>Seal initials</Label>
              <Input value={initials} onChange={(e) => setInitials(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Version label</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(record.lastUpdated).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{record.version}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle>Seal History</CardTitle>
          <CardDescription>Version history from enterprise registry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <div className="flex items-start gap-3 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Current seal — {record.version}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(record.lastUpdated).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <Separator />
            <p className="py-4 text-sm text-muted-foreground">
              Seal updates are recorded in Organization Workspace activity and audit trails.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
