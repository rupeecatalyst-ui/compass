"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { NewLenderWizard } from "@/components/catalyst-one/lender-registry-admin/new-lender-wizard";
import { NewProductProgramWizard } from "@/components/catalyst-one/lender-registry-admin/new-product-program-wizard";
import { useAuthContext } from "@/components/providers/auth-provider";
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
import { ROUTES } from "@/constants/routes";
import {
  lenderRegistryClient,
  subscribeLenderRegistryUpdated,
} from "@/lib/enterprise-lender-registry";
import { bootstrapLenderMaster } from "@/lib/enterprise-lender-registry/bootstrap-master";
import { seedBaselineCommercialProgramsLocal } from "@/lib/enterprise-lender-registry/seed-baseline-programs";
import { canMaintainEnterpriseLenderRegistry } from "@/lib/enterprise-lender-registry/permissions";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  buildCommercialProgramValidationReport,
  buildLenderRegistryAdminDashboardMetrics,
} from "@/lib/enterprise-lender-registry/program-architecture";
import { validateLenderMaster } from "@/lib/enterprise-lender-registry/validation";
import { downloadCsv } from "@/lib/loan-files-utils";
import {
  LENDER_MASTER_CLASSIFICATION_LABELS,
  type EnterpriseLenderProgramRecord,
  type EnterpriseLenderRecord,
  type LenderMasterClassification,
} from "@/types/enterprise-lender-registry";

function canMaintainRegistry(role: string | undefined): boolean {
  return canMaintainEnterpriseLenderRegistry(role);
}

export function LenderRegistryAdminWorkspace() {
  const { user } = useAuthContext();
  const canMaintain = canMaintainRegistry(user?.role);
  const [lenders, setLenders] = useState<EnterpriseLenderRecord[]>([]);
  const [programs, setPrograms] = useState<EnterpriseLenderProgramRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");
  const [enabledFilter, setEnabledFilter] = useState<"all" | "active" | "inactive">("all");
  const [lenderWizardOpen, setLenderWizardOpen] = useState(false);
  const [programWizardOpen, setProgramWizardOpen] = useState(false);
  const [programWizardLenderId, setProgramWizardLenderId] = useState<string | undefined>();
  const [showValidation, setShowValidation] = useState(false);
  const [seedingPrograms, setSeedingPrograms] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lenderResult, programResult] = await Promise.all([
        lenderRegistryClient.queryLenders({
          pageSize: 500,
          search: search.trim() || undefined,
          status: statusFilter === "all" ? "all" : statusFilter,
          enabled:
            enabledFilter === "all" ? "all" : enabledFilter === "active" ? true : false,
        }),
        lenderRegistryClient.queryPrograms({ pageSize: 2000 }),
      ]);
      setLenders(lenderResult.items);
      setTotal(lenderResult.total);
      setPrograms(programResult.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load lenders");
      setLenders([]);
      setPrograms([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, enabledFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeLenderRegistryUpdated(() => void load()), [load]);

  const metrics = useMemo(
    () => buildLenderRegistryAdminDashboardMetrics(lenders, programs),
    [lenders, programs],
  );
  const masterQuality = useMemo(() => validateLenderMaster(lenders), [lenders]);
  const programValidation = useMemo(
    () => buildCommercialProgramValidationReport(lenders, programs),
    [lenders, programs],
  );

  const filteredLabel = useMemo(() => `${total} lender${total === 1 ? "" : "s"}`, [total]);

  function runMasterBootstrap() {
    try {
      const result = bootstrapLenderMaster(
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "admin",
      );
      toast.success(
        `Master seed v${result.seedVersion}: +${result.created} lenders, ${result.updated} updated.`,
      );
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Master seed failed");
    }
  }

  async function runBaselineProgramSeed() {
    setSeedingPrograms(true);
    try {
      const actor =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "admin";
      if (isEnterprisePersistencePrisma()) {
        const res = await authenticatedJsonFetch("/api/lender-registry/seed-baseline-programs", {
          method: "POST",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) {
          const msg =
            (typeof body?.error?.message === "string" && body.error.message) ||
            "Baseline program seed failed. Soft Go-Live local fallback is disabled.";
          throw new Error(msg);
        }
        const r = body.data as {
          programsCreated: number;
          programsSkipped: number;
          capabilityFilled: number;
          capabilityNormalized: number;
        };
        toast.success(
          `Baseline programs: +${r.programsCreated} created, ${r.programsSkipped} skipped · capability +${r.capabilityFilled} / normalized ${r.capabilityNormalized}.`,
        );
      } else {
        const local = seedBaselineCommercialProgramsLocal(actor);
        toast.success(
          `Baseline programs (local): +${local.programsCreated} created, ${local.programsSkipped} skipped · capability +${local.capabilityFilled}.`,
        );
      }
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Baseline program seed failed");
    } finally {
      setSeedingPrograms(false);
    }
  }

  function openProgramWizard(lenderId?: string) {
    setProgramWizardLenderId(lenderId);
    setProgramWizardOpen(true);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-1 overflow-hidden px-2 py-1 md:px-2.5 md:py-1.5">
      <PageHeader
        density="registry"
        title="Lender Registry"
        description="Identity · capabilities · commercial programs"
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" asChild>
              <a href={ROUTES.LENDERS}>Open comparison</a>
            </Button>
            {canMaintain ? (
              <>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={runMasterBootstrap}>
                  Seed / Refresh Master
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={seedingPrograms}
                  onClick={() => void runBaselineProgramSeed()}
                >
                  {seedingPrograms ? "Seeding…" : "Seed Programs"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openProgramWizard()}>
                  <Plus className="mr-1 h-4 w-4" /> New Product Program
                </Button>
                <Button type="button" size="sm" onClick={() => setLenderWizardOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> New Lender
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {!canMaintain ? (
        <Card className="border-warning/40 bg-warning/5 p-3 text-sm text-warning">
          View only. Create / Edit / Archive / Publish requires Super Admin or Administration role.
        </Card>
      ) : null}

      <div className="grid shrink-0 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Lenders" value={metrics.totalLenders} />
        <MetricCard label="Capabilities" value={metrics.supportedProductAssignments} hint="Product assignments" />
        <MetricCard label="Programs" value={metrics.commercialPrograms} />
        <MetricCard label="Published" value={metrics.publishedPrograms} />
        <MetricCard label="Draft" value={metrics.draftPrograms} />
        <MetricCard label="Awaiting" value={metrics.programsAwaitingApproval} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
      <Card className="space-y-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Validation</p>
            <p className="text-[11px] text-muted-foreground">
              Master quality {masterQuality.passed ? "PASS" : "REVIEW"} ·{" "}
              {programValidation.lendersWithCapabilityButZeroPrograms.length} lenders with
              capability but zero programs · {programValidation.unpublishedPrograms.length}{" "}
              unpublished
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowValidation((v) => !v)}
          >
            {showValidation ? "Hide details" : "Show details"}
          </Button>
        </div>
        {showValidation ? (
          <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <ValidationBlock
              title="No Supported Products"
              items={programValidation.lendersWithoutSupportedProducts.map(
                (l) => `${l.label} (${l.code})`,
              )}
            />
            <ValidationBlock
              title="Capability, zero programs"
              items={programValidation.lendersWithCapabilityButZeroPrograms.map(
                (l) => `${l.label} · ${l.supportedProducts.join(", ")}`,
              )}
            />
            <ValidationBlock
              title="Draft programs"
              items={programValidation.draftPrograms.map((p) => p.label)}
            />
            <ValidationBlock
              title="Missing ROI"
              items={programValidation.programsMissingRoi.map((p) => p.label)}
            />
            <ValidationBlock
              title="Missing LTV"
              items={programValidation.programsMissingLtv.map((p) => p.label)}
            />
            <ValidationBlock
              title="Not published"
              items={programValidation.unpublishedPrograms.map(
                (p) => `${p.label} (${p.status})`,
              )}
            />
            <ValidationBlock
              title="Expired"
              items={programValidation.expiredPrograms.map(
                (p) => `${p.label} · until ${p.effectiveUntil}`,
              )}
            />
            <ValidationBlock
              title="Disabled"
              items={programValidation.disabledPrograms.map((p) => p.label)}
            />
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search lenders…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={enabledFilter}
            onValueChange={(v) => setEnabledFilter(v as typeof enabledFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Active/Inactive" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = lenderRegistryClient.exportCsv(lenders);
              downloadCsv(csv, `lender-registry-${Date.now()}.csv`);
              toast.success("Exported lender registry CSV");
            }}
          >
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{filteredLabel}</p>

        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Supported</TableHead>
                <TableHead>Programs</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Status</TableHead>
                {canMaintain ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : lenders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    No lenders yet. Click <strong>Seed / Refresh Master</strong>, then{" "}
                    <strong>Seed Default Programs</strong> for baseline capability + commercial
                    programs — admins retain full control afterward.
                  </TableCell>
                </TableRow>
              ) : (
                lenders.map((lender) => {
                  const lenderPrograms = programs.filter(
                    (p) => p.lenderId === lender.id && !p.isDeleted,
                  );
                  const publishedCount = lenderPrograms.filter(
                    (p) =>
                      p.enabled && p.status === "active" && p.lifecycleStatus === "active",
                  ).length;
                  return (
                    <TableRow key={lender.id}>
                      <TableCell>
                        <div className="font-medium">{lender.displayName || lender.label}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {lender.legalName || lender.label}
                          {lender.shortName ? ` · ${lender.shortName}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{lender.code}</TableCell>
                      <TableCell className="text-xs">
                        {lender.classification
                          ? LENDER_MASTER_CLASSIFICATION_LABELS[
                              lender.classification as LenderMasterClassification
                            ] ?? lender.classification
                          : lender.institutionCategory}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(lender.productsSupported ?? []).length || 0}
                      </TableCell>
                      <TableCell className="text-xs">{lenderPrograms.length}</TableCell>
                      <TableCell className="text-xs">{publishedCount}</TableCell>
                      <TableCell>
                        <Badge variant={lender.status === "active" ? "default" : "secondary"}>
                          {lender.status}
                        </Badge>
                      </TableCell>
                      {canMaintain ? (
                        <TableCell className="space-x-1 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openProgramWizard(lender.id)}
                          >
                            + Program
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await lenderRegistryClient.publishLender(
                                lender.id,
                                [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                                  user?.email ||
                                  "admin",
                              );
                              toast.success("Lender published");
                              await load();
                            }}
                          >
                            Publish
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await lenderRegistryClient.archiveLender(
                                lender.id,
                                [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                                  user?.email ||
                                  "admin",
                              );
                              toast.success("Archived");
                              await load();
                            }}
                          >
                            Archive
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      </div>

      <NewLenderWizard
        open={lenderWizardOpen}
        onOpenChange={setLenderWizardOpen}
        onCompleted={() => void load()}
      />
      <NewProductProgramWizard
        open={programWizardOpen}
        onOpenChange={setProgramWizardOpen}
        lenders={lenders}
        preselectedLenderId={programWizardLenderId}
        onCompleted={() => void load()}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card className="p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

function ValidationBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <p className="font-medium">
        {title}{" "}
        <span className="text-muted-foreground">({items.length})</span>
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-muted-foreground">None</p>
      ) : (
        <ul className="mt-1 max-h-28 list-disc space-y-0.5 overflow-y-auto pl-4">
          {items.slice(0, 40).map((item) => (
            <li key={item}>{item}</li>
          ))}
          {items.length > 40 ? <li>…and {items.length - 40} more</li> : null}
        </ul>
      )}
    </div>
  );
}
