"use client";

/**
 * CO-MDM-001 / CO-MASTER-001 — Product Programs desk.
 * List + create (wizard) + inline edit of commercial / eligibility / policy / documents.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuthContext } from "@/components/providers/auth-provider";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import { listProductMaster } from "@/lib/enterprise-product-master/admin-client";
import { NewProductProgramWizard } from "@/components/catalyst-one/lender-registry-admin/new-product-program-wizard";
import { ROUTES } from "@/constants/routes";
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
import type {
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
} from "@/types/enterprise-lender-registry";
import { listSelectableCreditRiskPolicies } from "@/lib/enterprise-lender-registry/resolve-program-policy";
import {
  listEdieDocumentTypeOptions,
  type ProgramLodRequirement,
} from "@/lib/document-requests/resolve-program-lod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export function ProductProgramsWorkspace() {
  const { user } = useAuthContext();
  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "admin";

  const [programs, setPrograms] = useState<EnterpriseLenderProgramRecord[]>([]);
  const [lenders, setLenders] = useState<EnterpriseLenderRecord[]>([]);
  const [products, setProducts] = useState<{ code: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<EnterpriseLenderProgramRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progRes, prodRes, lenderRes] = await Promise.all([
        lenderRegistryClient.queryPrograms({ pageSize: 200 }),
        listProductMaster().catch(() => ({ items: [] as { code: string; label: string }[] })),
        lenderRegistryClient.queryLenders({ pageSize: 200 }).catch(() => ({ items: [] })),
      ]);
      setPrograms((progRes.items ?? []) as EnterpriseLenderProgramRecord[]);
      setProducts(
        (prodRes.items ?? []).map((p: { code: string; label: string }) => ({
          code: p.code,
          label: p.label,
        })),
      );
      setLenders((lenderRes.items ?? []) as EnterpriseLenderRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load programs");
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const productLabel = (code: string | null | undefined) =>
    products.find((p) => p.code === code)?.label ?? code ?? "—";

  const lenderLabel = (id: string) => {
    const l = lenders.find((x) => x.id === id);
    return l?.displayName || l?.label || id.slice(0, 8);
  };

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await lenderRegistryClient.updateProgram(
        editing.id,
        {
          label: editing.label,
          roiPercent: editing.roiPercent,
          processingFeePct: editing.processingFeePct,
          maxLtvPercent: editing.maxLtvPercent,
          maxTenureMonths: editing.maxTenureMonths,
          minCibil: editing.minCibil,
          minIncomeAmount: editing.minIncomeAmount,
          maxFoirPercent: editing.maxFoirPercent,
          maxDbrPercent: editing.maxDbrPercent,
          minFundingAmount: editing.minFundingAmount,
          creditRiskPolicyRef: editing.creditRiskPolicyRef,
          requiredDocuments: editing.requiredDocuments ?? undefined,
          requiredDocumentTypeIds: undefined,
          employmentType: editing.employmentType,
          borrowerType: editing.borrowerType,
        },
        actor,
      );
      toast.success("Program saved.");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Product Programs"
        description="Lender × Product commercial programs — ROI, fees, LTV, tenure, FOIR/DBR eligibility, policy ref, and document types. SSOT: EnterpriseLenderProgram."
        actions={
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={ROUTES.ADMIN_PRODUCT_LENDER_MATRIX}>Product–Lender Matrix</Link>
            </Button>
            <Button type="button" size="sm" onClick={() => setWizardOpen(true)}>
              New Program
            </Button>
          </div>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {editing ? (
        <Card className="space-y-3 border-border/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{editing.label}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{editing.code}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={() => void saveEdit()}>
                Save Changes
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <EditField
              label="ROI %"
              value={editing.roiPercent ?? ""}
              onChange={(v) =>
                setEditing({ ...editing, roiPercent: v === "" ? null : Number(v) })
              }
            />
            <EditField
              label="Processing Fee %"
              value={editing.processingFeePct ?? ""}
              onChange={(v) =>
                setEditing({ ...editing, processingFeePct: v === "" ? null : Number(v) })
              }
            />
            <EditField
              label="Max LTV %"
              value={editing.maxLtvPercent ?? ""}
              onChange={(v) =>
                setEditing({ ...editing, maxLtvPercent: v === "" ? null : Number(v) })
              }
            />
            <EditField
              label="Max Tenure (months)"
              value={editing.maxTenureMonths ?? ""}
              onChange={(v) =>
                setEditing({ ...editing, maxTenureMonths: v === "" ? null : Number(v) })
              }
            />
            <EditField
              label="Min CIBIL"
              value={editing.minCibil ?? ""}
              onChange={(v) =>
                setEditing({ ...editing, minCibil: v === "" ? null : Number(v) })
              }
            />
            <EditField
              label="Min Income"
              value={editing.minIncomeAmount ?? ""}
              onChange={(v) =>
                setEditing({ ...editing, minIncomeAmount: v === "" ? null : Number(v) })
              }
            />
            <EditField
              label="Max FOIR %"
              value={editing.maxFoirPercent ?? ""}
              onChange={(v) =>
                setEditing({ ...editing, maxFoirPercent: v === "" ? null : Number(v) })
              }
            />
            <EditField
              label="Max DBR %"
              value={editing.maxDbrPercent ?? ""}
              onChange={(v) =>
                setEditing({ ...editing, maxDbrPercent: v === "" ? null : Number(v) })
              }
            />
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-xs">Credit & Risk Policy (published only)</Label>
              <Select
                value={editing.creditRiskPolicyRef || "__none__"}
                onValueChange={(v) =>
                  setEditing({
                    ...editing,
                    creditRiskPolicyRef: v === "__none__" ? null : v,
                  })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select published policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {listSelectableCreditRiskPolicies().map((p) => (
                    <SelectItem key={p.policyId} value={p.policyId}>
                      {p.policyName} ({p.policyCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label className="text-xs">Program LOD (EDIE / Document types)</Label>
              <p className="text-[10px] text-muted-foreground">
                Mandatory / optional overlay for this program. Salaried vs Self-employed programs
                should each configure their own set.
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {listEdieDocumentTypeOptions().slice(0, 40).map((opt) => {
                  const current = editing.requiredDocuments ?? [];
                  const hit = current.find((r) => r.typeRef === opt.typeRef);
                  const checked = Boolean(hit);
                  const mandatory = hit?.mandatory !== false;
                  return (
                    <label
                      key={opt.typeRef}
                      className="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(on) => {
                          const next: ProgramLodRequirement[] = (editing.requiredDocuments ?? []).filter(
                            (r) => r.typeRef !== opt.typeRef,
                          );
                          if (on) {
                            next.push({
                              typeRef: opt.typeRef,
                              mandatory: true,
                              label: opt.label,
                              applicability: "all",
                              active: true,
                            });
                          }
                          setEditing({ ...editing, requiredDocuments: next });
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                      {checked ? (
                        <button
                          type="button"
                          className="text-[10px] text-muted-foreground underline"
                          onClick={() => {
                            const next = (editing.requiredDocuments ?? []).map((r) =>
                              r.typeRef === opt.typeRef
                                ? { ...r, mandatory: !mandatory, optional: mandatory }
                                : r,
                            );
                            setEditing({ ...editing, requiredDocuments: next });
                          }}
                        >
                          {mandatory ? "Mandatory" : "Optional"}
                        </button>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>ROI</TableHead>
              <TableHead>FOIR</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-muted-foreground">
                  No programs yet. Create a program or map products on the Product–Lender Matrix.
                </TableCell>
              </TableRow>
            ) : (
              programs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs font-medium">{row.label}</TableCell>
                  <TableCell className="text-xs">{lenderLabel(row.lenderId)}</TableCell>
                  <TableCell className="text-xs">{productLabel(row.productCode)}</TableCell>
                  <TableCell className="text-xs">
                    {row.roiPercent != null ? `${row.roiPercent}%` : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.maxFoirPercent != null ? `${row.maxFoirPercent}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.enabled ? "default" : "outline"}>
                      {row.status ?? (row.enabled ? "active" : "inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant="ghost" onClick={() => {
                      const docs =
                        row.requiredDocuments ??
                        (row.requiredDocumentTypeIds ?? []).map((typeRef) => ({
                          typeRef,
                          mandatory: true,
                          active: true,
                          applicability: "all" as const,
                        }));
                      setEditing({ ...row, requiredDocuments: docs });
                    }}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <NewProductProgramWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        lenders={lenders}
        onCompleted={() => void load()}
      />
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  text,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  text?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={text ? "text" : "number"}
        step={text ? undefined : "0.01"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
