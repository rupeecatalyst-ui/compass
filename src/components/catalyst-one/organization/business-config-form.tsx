"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE } from "@/lib/organization-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizationBusinessConfigDto } from "@/types/enterprise-organization-workspace";

const textareaClassName =
  "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function joinList(values: unknown): string {
  return asStringArray(values).join(", ");
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function hierarchyToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((row) => {
      if (typeof row === "string") return row;
      if (row && typeof row === "object") {
        const o = row as Record<string, unknown>;
        const label = String(o.label ?? o.name ?? "");
        const parent = String(o.parent ?? o.parentLabel ?? "");
        return parent ? `${label}:${parent}` : label;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function textToHierarchy(text: string): Array<{ label: string; parent?: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, parent] = line.split(":").map((p) => p.trim());
      return parent ? { label, parent } : { label };
    });
}

export function BusinessConfigForm() {
  const [businessType, setBusinessType] = useState("");
  const [productsOffered, setProductsOffered] = useState("");
  const [operatingStates, setOperatingStates] = useState("");
  const [branches, setBranches] = useState("");
  const [departments, setDepartments] = useState("");
  const [teams, setTeams] = useState("");
  const [designations, setDesignations] = useState("");
  const [hierarchy, setHierarchy] = useState("");
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDto = (dto: OrganizationBusinessConfigDto) => {
    setBusinessType(dto.businessType ?? "");
    setProductsOffered(joinList(dto.productsOffered));
    setOperatingStates(joinList(dto.operatingStates));
    setBranches(joinList(dto.branches));
    setDepartments(joinList(dto.departments));
    setTeams(joinList(dto.teams));
    setDesignations(joinList(dto.designations));
    setHierarchy(hierarchyToText(dto.hierarchy));
    setVersionNumber(dto.versionNumber);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dto = await organizationWorkspaceApi.getBusinessConfig();
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
      const dto = await organizationWorkspaceApi.updateBusinessConfig({
        businessType: businessType || null,
        productsOffered: splitList(productsOffered),
        operatingStates: splitList(operatingStates),
        branches: splitList(branches),
        departments: splitList(departments),
        teams: splitList(teams),
        designations: splitList(designations),
        hierarchy: textToHierarchy(hierarchy),
      });
      applyDto(dto);
      toast.success(`Business configuration saved (v${dto.versionNumber})`);
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
        Loading business configuration…
      </div>
    );
  }

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Business Configuration</CardTitle>
          <CardDescription>
            Products, geography, org structure, and hierarchy for Rupee Catalyst
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Business Type</Label>
            <Input
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="e.g. NBFC · DSA · Financial Services"
            />
          </div>
          <ListField label="Products Offered" value={productsOffered} onChange={setProductsOffered} />
          <ListField label="Operating States" value={operatingStates} onChange={setOperatingStates} />
          <ListField label="Branches" value={branches} onChange={setBranches} />
          <ListField label="Departments" value={departments} onChange={setDepartments} />
          <ListField label="Teams" value={teams} onChange={setTeams} />
          <ListField label="Designations" value={designations} onChange={setDesignations} />
          <div className="sm:col-span-2">
            <Label>Hierarchy (one per line: Label or Label:Parent)</Label>
            <textarea
              className={textareaClassName}
              value={hierarchy}
              onChange={(e) => setHierarchy(e.target.value)}
              placeholder={"CEO\nOperations:CEO\nSales:CEO"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        className={textareaClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Comma-separated values"
      />
    </div>
  );
}
