"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE } from "@/lib/organization-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizationSecurityConfigDto } from "@/types/enterprise-organization-workspace";

const textareaClassName =
  "flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono text-xs";

function recordToLines(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join("\n");
}

function linesToRecord(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

export function OrganizationSecurityForm() {
  const [featureFlags, setFeatureFlags] = useState("");
  const [defaults, setDefaults] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDto = (dto: OrganizationSecurityConfigDto) => {
    setFeatureFlags(recordToLines(dto.featureFlags));
    setDefaults(recordToLines(dto.defaults));
    const branding =
      dto.branding && typeof dto.branding === "object"
        ? (dto.branding as Record<string, unknown>)
        : {};
    setPrimaryColor(String(branding.primaryColor ?? ""));
    setLogoUrl(String(branding.logoUrl ?? ""));
    setDisplayName(String(branding.displayName ?? ""));
    setVersionNumber(dto.versionNumber);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dto = await organizationWorkspaceApi.getSecurityConfig();
      applyDto(dto);
    } catch (err) {
      setError(err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const dto = await organizationWorkspaceApi.updateSecurityConfig({
        featureFlags: linesToRecord(featureFlags),
        defaults: linesToRecord(defaults),
        branding: {
          primaryColor: primaryColor || undefined,
          logoUrl: logoUrl || undefined,
          displayName: displayName || undefined,
        },
        permissions: [],
      });
      applyDto(dto);
      toast.success(`Security configuration saved (v${dto.versionNumber})`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading security configuration…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card border-border/60">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Security & Branding</CardTitle>
            <CardDescription>
              Feature flags, org defaults, and platform branding overrides
            </CardDescription>
            {versionNumber != null && (
              <p className="mt-1 text-xs text-muted-foreground">Version {versionNumber}</p>
            )}
          </div>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div>
            <Label>Feature Flags (key=value, one per line)</Label>
            <textarea
              className={textareaClassName}
              value={featureFlags}
              onChange={(e) => setFeatureFlags(e.target.value)}
              placeholder={"shadowMode=true\nbetaFeatures=false"}
            />
          </div>

          <div>
            <Label>Organization Defaults (key=value, one per line)</Label>
            <textarea
              className={textareaClassName}
              value={defaults}
              onChange={(e) => setDefaults(e.target.value)}
              placeholder={"sessionTimeoutMinutes=30\ndefaultLocale=en-IN"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Branding — Primary Color</Label>
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#0d9488"
              />
            </div>
            <div>
              <Label>Branding — Logo URL</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label>Branding — Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Rupee Catalyst"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Role-based access is managed in Administration — not in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            User permissions and role grants are owned by the Enterprise Identity module. Configure
            roles, grants, and module access from Roles & Permissions in the Administration Console.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href={ROUTES.ADMIN_ROLES_PERMISSIONS}>
              <ExternalLink className="h-4 w-4" />
              Open Roles & Permissions
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
