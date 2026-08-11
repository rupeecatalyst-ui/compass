"use client";

/**
 * CO-ARCH-ELD-001 — Right slide-over Lender Workspace (~65% width).
 * CO-LENDER-HIERARCHY-REMEDIATION-001 — Hierarchy / Contacts / Employees share ECM SSOT.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  X,
} from "lucide-react";
import {
  ELD_WORKSPACE_TABS,
  type EldEmployeeWorkspaceSectionId,
  type EldWorkspaceTabId,
} from "@/constants/enterprise-lender-directory";
import { subscribeEcmContactRegistry } from "@/lib/enterprise-contact-master";
import {
  composeEldLenderEmployeeRows,
  composeEldLenderHierarchyForest,
  composeEldLenderChanakyaInsights,
  filterEmployeesForInstitution,
  loadEldLenderEmployeeContacts,
} from "@/lib/enterprise-lender-directory";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { ensureEnterpriseRegistryHydrated } from "@/lib/enterprise-registry/hydrate";
import { useProductMasterOptions } from "@/lib/enterprise-product-master";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { ROUTES } from "@/constants/routes";
import type { EnterpriseLenderDirectoryRow } from "@/types/enterprise-lender-directory-ops";
import type { EldLenderEmployeeRow } from "@/types/enterprise-lender-directory-ops";
import type {
  EnterpriseLenderDocumentRecord,
  EnterpriseLenderProgramRecord,
} from "@/types/enterprise-lender-registry";
import { EldHierarchyChart } from "@/components/catalyst-one/enterprise-lender-workspace/eld-hierarchy-chart";
import { EldLenderEmployeeSlideOver } from "@/components/catalyst-one/enterprise-lender-directory/eld-employee-slide-over";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Link from "next/link";

function displayMetric(value: string | number | null | undefined): string {
  if (value == null) return "Not available";
  const s = String(value).trim();
  if (!s || s === "Not Specified") return "Not available";
  return s;
}

function telHref(mobile?: string | null) {
  const digits = (mobile ?? "").replace(/\D/g, "");
  return digits ? `tel:${digits}` : undefined;
}

function mailHref(email?: string | null) {
  return email?.trim() ? `mailto:${email.trim()}` : undefined;
}

function waHref(mobile?: string | null) {
  const digits = (mobile ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : undefined;
}

export function EnterpriseLenderDirectorySlideOver({
  open,
  onOpenChange,
  row,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: EnterpriseLenderDirectoryRow | null;
}) {
  const [tab, setTab] = useState<EldWorkspaceTabId>("summary");
  const [programs, setPrograms] = useState<EnterpriseLenderProgramRecord[]>([]);
  const [documents, setDocuments] = useState<EnterpriseLenderDocumentRecord[]>([]);
  const [employees, setEmployees] = useState<EldLenderEmployeeRow[]>([]);
  const [contactQuery, setContactQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<EldLenderEmployeeRow | null>(null);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [employeeSection, setEmployeeSection] =
    useState<EldEmployeeWorkspaceSectionId>("profile");
  const [employeeEditing, setEmployeeEditing] = useState(false);
  /** Hierarchy Create/Assign/RM dialog open — disable parent Escape so dialog owns dismiss. */
  const [hierarchyNestedOpen, setHierarchyNestedOpen] = useState(false);
  const { options: productOptions } = useProductMasterOptions(true);

  const lenderId = row?.lenderId ?? null;
  const lenderName = row?.lenderName ?? "Lender";
  const productKey = productOptions.map((p) => p.code).join("|");

  const dismissWorkspace = useCallback(() => {
    setEmployeeOpen(false);
    setSelectedEmployee(null);
    setEmployeeEditing(false);
    setHierarchyNestedOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const {
    requestClose,
    confirmOpen,
    setConfirmOpen,
    handleDiscard,
    handleSaveAndClose,
    saving: closeSaving,
  } = useWorkspaceClose({
    onClose: dismissWorkspace,
    hasUnsavedChanges: employeeOpen && employeeEditing,
    enableEscapeKey: open && !employeeOpen && !hierarchyNestedOpen,
    onSaveAndClose: async () => {
      // Employee Save & Exit is owned by employee slide-over; block parent close while dirty.
      return false;
    },
  });

  useEffect(() => {
    if (!open) setTab("summary");
  }, [open]);

  const reloadEmployees = useCallback(async () => {
    if (!lenderId) {
      setEmployees([]);
      return;
    }
    await ensureEnterpriseRegistryHydrated(false).catch(() => undefined);
    const [contacts, lendersResult, dealsResult] = await Promise.all([
      loadEldLenderEmployeeContacts(),
      lenderRegistryClient.queryLenders({
        status: "active",
        enabled: true,
        pageSize: 500,
      }),
      enterpriseDealApiClient
        .searchDeals({ archived: false, pageSize: 200, view: "full" })
        .catch(() => ({ items: [] as Awaited<
          ReturnType<typeof enterpriseDealApiClient.searchDeals>
        >["items"] })),
    ]);
    const lenderItems = lendersResult.items ?? [];
    const composed = composeEldLenderEmployeeRows({
      contacts,
      lenders: lenderItems,
      deals: dealsResult.items ?? [],
      productOptions,
    });
    setEmployees(filterEmployeesForInstitution(composed, lenderId));
  }, [lenderId, productOptions]);

  useEffect(() => {
    if (!open || !lenderId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [prog, docs] = await Promise.all([
          lenderRegistryClient.queryPrograms({
            lenderId,
            publishedOnly: true,
            pageSize: 200,
          }),
          lenderRegistryClient.listDocuments(lenderId),
        ]);
        if (cancelled) return;
        setPrograms(prog.items ?? []);
        setDocuments(Array.isArray(docs) ? docs : []);
        await reloadEmployees();
      } catch {
        if (!cancelled) {
          setPrograms([]);
          setDocuments([]);
          setEmployees([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- productKey stabilizes options
  }, [open, lenderId, reloadToken, productKey]);

  useEffect(() => {
    if (!open) return;
    return subscribeEcmContactRegistry(() => setReloadToken((n) => n + 1));
  }, [open]);

  const forest = useMemo(() => {
    if (!lenderId) {
      return { lenderId: "", employeeCount: 0, rootCount: 0, trees: [] };
    }
    const f = composeEldLenderHierarchyForest(employees);
    return { ...f, lenderId };
  }, [employees, lenderId]);

  const chanakyaInsights = useMemo(() => {
    if (!row) return [];
    return composeEldLenderChanakyaInsights({ row, employees, programs });
  }, [row, employees, programs]);

  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((c) =>
      [c.employeeName, c.designationLabel, c.mobile, c.email, c.productsHandledLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [employees, contactQuery]);

  const openEmployee = (
    emp: EldLenderEmployeeRow,
    opts?: { section?: EldEmployeeWorkspaceSectionId; editing?: boolean },
  ) => {
    setSelectedEmployee(emp);
    setEmployeeSection(opts?.section ?? "profile");
    setEmployeeEditing(Boolean(opts?.editing));
    setEmployeeOpen(true);
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            requestClose();
            return;
          }
          onOpenChange(true);
        }}
      >
        <SheetContent
          side="right"
          allowOutsideClose={!(employeeOpen && employeeEditing)}
          hideCloseButton
          className={cn(
            "flex h-full w-full flex-col gap-0 border-l border-border/60 bg-background p-0 shadow-2xl",
            "z-[95] duration-[250ms] data-[state=open]:duration-[250ms] data-[state=closed]:duration-200",
            "sm:max-w-[min(100vw,70vw)] md:max-w-[65vw]",
          )}
          overlayClassName="z-[94] bg-black/40 duration-200"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
                  Lender Workspace
                </p>
                <SheetTitle className="truncate text-base">
                  {row?.lenderName ?? "Lender"}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {row?.categoryLabel}
                  {row?.shortName ? ` · ${row.shortName}` : ""} · Directory stays open behind this
                  panel
                </SheetDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    setReloadToken((n) => n + 1);
                  }}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    requestClose();
                  }}
                >
                  Save & Exit
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    requestClose();
                  }}
                  aria-label="Close lender workspace"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {ELD_WORKSPACE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "h-7 rounded-md border px-2 text-[10px] font-medium",
                    tab === t.id
                      ? "border-teal-500/50 bg-teal-500/15 text-foreground"
                      : "border-border/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {!row ? null : loading ? (
              <p className="text-sm text-muted-foreground">Loading lender workspace…</p>
            ) : tab === "summary" ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Active Opportunities", value: displayMetric(row.activeOpportunities) },
                  { label: "Active Deals", value: displayMetric(row.activeDeals) },
                  { label: "Pipeline Value", value: displayMetric(row.maxLoanAmountLabel) },
                  { label: "Average TAT", value: displayMetric(row.averageTatLabel) },
                  { label: "Home Loan ROI", value: displayMetric(row.homeLoanRoiLabel) },
                  { label: "BT ROI", value: displayMetric(row.balanceTransferRoiLabel) },
                  { label: "Max LTV", value: displayMetric(row.maxLtvLabel) },
                  { label: "Min CIBIL", value: displayMetric(row.minCibilLabel) },
                  { label: "Max FOIR", value: displayMetric(row.foirLabel) },
                  {
                    label: "Lender Employees",
                    value: displayMetric(employees.length),
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {k.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{k.value}</p>
                  </div>
                ))}
                <p className="sm:col-span-2 lg:col-span-4 text-[11px] text-muted-foreground">
                  Metrics project from Enterprise Lender Registry programmes + Deal Registry
                  counts. Missing values show as Not available — never demo numbers.
                </p>
              </div>
            ) : tab === "products" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Published programmes from Enterprise Lender Program registry.
                  </p>
                  <Button asChild size="sm" variant="outline" className="h-7 text-[10px]">
                    <Link href={ROUTES.ADMIN_PRODUCT_PROGRAMS}>Open Product Programs</Link>
                  </Button>
                </div>
                {programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No published product programmes for this lender.
                  </p>
                ) : (
                  programs.map((p) => {
                    const docs = Array.isArray(p.requiredDocuments)
                      ? p.requiredDocuments
                      : (p.requiredDocumentTypeIds ?? []).map((typeRef) => ({
                          typeRef,
                          mandatory: true,
                        }));
                    return (
                      <article
                        key={p.id}
                        className="rounded-lg border border-border/60 bg-card px-3 py-2"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{p.label}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {[
                                p.productCode,
                                p.employmentType ? `Employment · ${p.employmentType}` : null,
                                p.roiPercent != null ? `ROI ${p.roiPercent}%` : null,
                                p.processingFeeLabel ||
                                  (p.processingFeePct != null
                                    ? `PF ${p.processingFeePct}%`
                                    : null),
                                p.maxLtvPercent != null ? `LTV ${p.maxLtvPercent}%` : null,
                                p.maxTenureMonths != null
                                  ? `Tenure ${p.maxTenureMonths}m`
                                  : null,
                                p.minCibil != null ? `CIBIL ${p.minCibil}` : null,
                                p.maxFoirPercent != null ? `FOIR ${p.maxFoirPercent}%` : null,
                                p.maxDbrPercent != null ? `DBR ${p.maxDbrPercent}%` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Policy ·{" "}
                              {p.creditRiskPolicyRef?.trim() || "Not available"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Documents ·{" "}
                              {docs.length === 0
                                ? "Not available"
                                : docs
                                    .map(
                                      (d) =>
                                        `${"typeRef" in d ? d.typeRef : String(d)}${
                                          "mandatory" in d && d.mandatory === false
                                            ? " (optional)"
                                            : ""
                                        }`,
                                    )
                                    .join(", ")}
                            </p>
                          </div>
                          <Button asChild size="sm" variant="ghost" className="h-7 text-[10px]">
                            <Link href={`${ROUTES.ADMIN_PRODUCT_PROGRAMS}?programId=${p.id}`}>
                              Edit programme
                            </Link>
                          </Button>
                        </div>
                        {p.remarks || p.notes ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {p.remarks || p.notes}
                          </p>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            ) : tab === "hierarchy" ? (
              lenderId ? (
                <EldHierarchyChart
                  lenderId={lenderId}
                  lenderName={lenderName}
                  forest={forest}
                  onOpenEmployee={openEmployee}
                  onChanged={() => setReloadToken((n) => n + 1)}
                  onNestedUiOpenChange={setHierarchyNestedOpen}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Hierarchy unavailable.</p>
              )
            ) : tab === "contacts" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Same Enterprise Contact Registry as Employees / Hierarchy (role
                    lender_employee).
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    onClick={() => setTab("hierarchy")}
                  >
                    Assign / Create Employee
                  </Button>
                </div>
                <input
                  className="h-8 w-full rounded-md border border-border/60 bg-background px-2 text-xs"
                  placeholder="Search employees…"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                />
                {filteredContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No lender employees linked to this institution.
                  </p>
                ) : (
                  filteredContacts.map((c) => (
                    <div
                      key={c.contactId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                    >
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => openEmployee(c)}
                      >
                        <p className="text-sm font-medium">{c.employeeName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {[
                            c.designationLabel,
                            c.productsHandledLabel
                              ? `Products · ${c.productsHandledLabel}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </button>
                      <div className="flex gap-1">
                        {telHref(c.mobile) ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px]"
                          >
                            <a href={telHref(c.mobile)}>
                              <Phone className="mr-1 h-3 w-3" />
                              Call
                            </a>
                          </Button>
                        ) : null}
                        {mailHref(c.email) ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px]"
                          >
                            <a href={mailHref(c.email)}>
                              <Mail className="mr-1 h-3 w-3" />
                              Email
                            </a>
                          </Button>
                        ) : null}
                        {waHref(c.mobile) ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px]"
                          >
                            <a href={waHref(c.mobile)} target="_blank" rel="noreferrer">
                              <MessageCircle className="mr-1 h-3 w-3" />
                              WhatsApp
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : tab === "performance" ? (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  Employee performance projected from Enterprise Deal Registry (same SSOT as
                  Employees tab). Open an employee for detail.
                </p>
                {employees.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                    <Building2 className="mb-2 h-4 w-4 text-teal-600" />
                    No employees to project performance for this lender.
                  </div>
                ) : (
                  employees.map((e) => (
                    <button
                      key={e.contactId}
                      type="button"
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-left hover:bg-muted/30"
                      onClick={() => openEmployee(e, { section: "performance" })}
                    >
                      <div>
                        <p className="text-sm font-medium">{e.employeeName}</p>
                        <p className="text-[11px] text-muted-foreground">{e.designationLabel}</p>
                      </div>
                      <div className="text-right text-[11px] tabular-nums text-muted-foreground">
                        <p>
                          Deals {e.activeDeals} · Opp {e.activeOpportunities}
                        </p>
                        <p>{e.performanceScoreLabel}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : tab === "opportunities" ? (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  Lender-linked Deals from Enterprise Deal Registry (post lender assignment).
                  Directory Opportunity count:{" "}
                  <span className="font-semibold text-foreground">
                    {displayMetric(row.activeOpportunities)}
                  </span>
                  . Deal count:{" "}
                  <span className="font-semibold text-foreground">
                    {displayMetric(row.activeDeals)}
                  </span>
                  .
                </p>
                {employees.flatMap((e) => e.pipeline).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active Deals currently linked to employees of this lender.
                  </p>
                ) : (
                  employees.flatMap((e) =>
                    e.pipeline.map((item) => (
                      <article
                        key={`${e.contactId}-${item.dealId}`}
                        className="rounded-lg border border-border/60 bg-card px-3 py-2"
                      >
                        <p className="text-sm font-semibold">{item.customerName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {e.employeeName} · {item.dealNumber}
                          {item.opportunityNumber ? ` · ${item.opportunityNumber}` : ""} ·{" "}
                          {item.stageLabel}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {item.productLabel} · {item.amountLabel}
                        </p>
                      </article>
                    )),
                  )
                )}
              </div>
            ) : tab === "documents" ? (
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No policy PDFs, circulars, or rate cards attached yet.
                  </p>
                ) : (
                  documents.map((d) => (
                    <a
                      key={d.id}
                      href={d.fileUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/30"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">{d.kind}</span>
                    </a>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  Chanakya insights are derived from Directory, Programme, and Contact Registry
                  facts only — no fabricated Radar scores.
                </p>
                {chanakyaInsights.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                    <Sparkles className="mb-2 h-4 w-4 text-teal-600" />
                    No actionable Chanakya observations for this lender yet. Link employees,
                    publish programmes, or grow Deal pipeline to surface insights.
                  </div>
                ) : (
                  chanakyaInsights.map((insight) => (
                    <article
                      key={insight.id}
                      className="rounded-lg border border-border/60 bg-card px-3 py-2"
                    >
                      <p className="text-sm font-semibold">{insight.headline}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{insight.body}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Source · {insight.source}
                      </p>
                    </article>
                  ))
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <UnsavedChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onDiscard={handleDiscard}
        onSaveAndClose={() => void handleSaveAndClose()}
        saving={closeSaving}
        contentClassName="z-[110]"
        overlayClassName="z-[110]"
      />

      <EldLenderEmployeeSlideOver
        open={employeeOpen}
        onOpenChange={(next) => {
          setEmployeeOpen(next);
          if (!next) setEmployeeEditing(false);
        }}
        row={selectedEmployee}
        initialSection={employeeSection}
        initialEditing={employeeEditing}
        onEditingChange={setEmployeeEditing}
        onSaved={() => setReloadToken((n) => n + 1)}
      />
    </>
  );
}
