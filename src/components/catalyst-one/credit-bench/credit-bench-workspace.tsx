"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  FileText,
  Home,
  Pencil,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import { OpportunityBoundStage } from "@/components/catalyst-one/opportunity-workspace/opportunity-bound-stage";
import { LoanStructureCommandControl } from "@/components/catalyst-one/shared/loan-structure-drawer";
import { ChanakyaOpportunityRecommendationPanel } from "@/components/catalyst-one/credit-bench/chanakya-opportunity-recommendation-panel";
import { OpportunityLoanStructureTab } from "@/components/catalyst-one/credit-bench/opportunity-loan-structure-tab";
import { ModifyLoanDetailsSheet } from "@/components/catalyst-one/credit-bench/modify-loan-details-sheet";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import {
  journeyContextFromLoanFile,
  loadOpportunityJourneyRuntime,
} from "@/lib/lead-opportunity-journey/load-context";
import {
  getActiveOpportunityContext,
  isDashboardNavEntry,
} from "@/lib/lead-opportunity-journey/active-context";
import {
  businessProfileFromLoanFile,
  resolveStatedDraftForFile,
  saveStatedDraft,
} from "@/lib/lead-opportunity-journey/stated-draft";
import {
  getCachedOpportunityRecord,
  isOpportunityRuntimeCase,
} from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import { buildLendingExtensionWithParticipants, resolveOpportunityLoanStructureParticipants } from "@/lib/lead-opportunity-journey/opportunity-loan-structure";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { syncLoanStructureRelationships } from "@/lib/loan-structure";
import { formatINR } from "@/lib/format-currency";
import {
  displayOpportunityAmount,
  displayOpportunityEnumLabel,
  displayOpportunityText,
} from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { getContextAwareVisibility } from "@/lib/context-aware-data-collection";
import { buildJourneyHref, getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import { isPropertySectionVisible, type PropertyType } from "@/constants/loan-stage-master";
import { isProductSecured } from "@/constants/product-master";
import type { LoanStructureNavTarget } from "@/lib/loan-structure";
import { syncParticipantLegacyFields } from "@/lib/loan-participants";
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";
import { ROUTES } from "@/constants/routes";
import { PropertyTypeSelect } from "@/components/catalyst-one/shared/property-type-select";
import { findOperationalEcmContactById } from "@/lib/enterprise-registry";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useRequirementCapturedGate } from "@/lib/loan-journey/use-requirement-captured-gate";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { LoanFile } from "@/types/catalyst-one";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { toast } from "sonner";

/**
 * Lead Stage — Opportunity Setup (formerly Credit Bench).
 * Capture/reuse profile context. Verification stays in Credit Workbench.
 * Context-Aware: Financial vs Business sections follow employment family.
 */
export function CreditBenchWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const fileParam = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const dashboardEntry = isDashboardNavEntry(searchParams);
  const hasUrlContext = Boolean(fileParam || opportunityId);
  const requirementGate = useRequirementCapturedGate(
    dashboardEntry ? null : opportunityId,
  );
  const [file, setFile] = useState<LoanFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stated, setStated] = useState<EcwStatedInformationDraft>({});
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<
    | "customer"
    | "loan"
    | "structure"
    | "financial"
    | "business"
    | "property"
    | "chanakya"
  >("customer");
  /** BAT #19 — section edit toggles (Planning remains editable until Deal). */
  const [editingStructure, setEditingStructure] = useState(false);
  const [editingFinancial, setEditingFinancial] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [editingProperty, setEditingProperty] = useState(false);
  const [contactEditOpen, setContactEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<EcmContact | null>(null);
  const [loanDetailsOpen, setLoanDetailsOpen] = useState(false);

  const reloadRuntime = useCallback(async () => {
    const next = await loadOpportunityJourneyRuntime(fileParam, opportunityId, {
      dashboardEntry,
    });
    // Always apply latest runtime so Chanakya inline saves refresh gaps live.
    setFile(next);
    if (next) setStated(resolveStatedDraftForFile(next));
  }, [fileParam, opportunityId, dashboardEntry]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadOpportunityJourneyRuntime(fileParam, opportunityId, {
      dashboardEntry,
    }).then((next) => {
      if (cancelled) return;
      let identityChanged = true;
      setFile((prev) => {
        if (prev?.id && next?.id && prev.id === next.id) {
          identityChanged = false;
          return prev;
        }
        return next;
      });
      if (identityChanged) {
        if (next) setStated(resolveStatedDraftForFile(next));
        else setStated({});
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fileParam, opportunityId, dashboardEntry]);

  useEffect(() => {
    if (dashboardEntry || hasUrlContext || file) return;
    const active = getActiveOpportunityContext();
    if (active?.fileId || active?.opportunityId) {
      router.replace(
        buildCanonicalJourneyStageHref("lead_creation", {
          fileId: active.fileId ?? null,
          opportunityId: active.opportunityId ?? null,
        }),
      );
    }
  }, [dashboardEntry, hasUrlContext, file, router]);

  const context = useMemo(() => journeyContextFromLoanFile(file), [file]);
  const profile = useMemo(
    () => (file ? businessProfileFromLoanFile(file) : null),
    [file],
  );
  const categoryCtx = useMemo(
    () => getContextAwareVisibility(file?.employmentType),
    [file?.employmentType],
  );

  // BAT #9 — Property section only for secured / hybrid lending (canonical product + lending type gates).
  const propertyApplicable = useMemo(() => {
    if (!file) return false;
    if (isProductSecured(file.loanProduct ?? "")) return true;
    if (file.lendingType && isPropertySectionVisible(file.lendingType)) return true;
    return false;
  }, [file]);

  useEffect(() => {
    // BAT #8 — leave a section immediately when Employment Type hides it.
    if (section === "financial" && !categoryCtx.isSalariedFamily) {
      setSection(categoryCtx.isSelfEmployedFamily ? "business" : "customer");
    } else if (section === "business" && !categoryCtx.isSelfEmployedFamily) {
      setSection(categoryCtx.isSalariedFamily ? "financial" : "customer");
    } else if (section === "property" && !propertyApplicable) {
      setSection("customer");
    }
  }, [
    categoryCtx.isSalariedFamily,
    categoryCtx.isSelfEmployedFamily,
    propertyApplicable,
    section,
  ]);

  const persistDraft = async () => {
    if (!file) return;
    setSaving(true);
    try {
      // BAT #8 — preserve stated fields when a section is hidden; visibility is UI-only.
      saveStatedDraft(file.id, stated);

      // BAT #12 — persist Loan Structure on Opportunity.lendingExtension.participants
      if (isOpportunityRuntimeCase(file)) {
        const oppId = file.enterpriseOpportunityId || opportunityId || file.id;
        const cached = getCachedOpportunityRecord(oppId);
        const updated = await enterpriseOpportunityApiClient.updateOpportunity(oppId, {
          lendingExtension: buildLendingExtensionWithParticipants(
            cached?.lendingExtension,
            file.participants ?? [],
          ),
          rowVersion: cached?.rowVersion,
        });
        setFile((prev) =>
          prev
            ? {
                ...prev,
                participants: resolveOpportunityLoanStructureParticipants(updated),
              }
            : prev,
        );
      }
    } catch (err) {
      // Re-throw so journey chrome / runWithFeedback can show the error toast.
      throw err instanceof Error
        ? err
        : new Error("Unable to save Opportunity. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const finishSectionEdit = async (
    setEditing: (v: boolean) => void,
  ) => {
    try {
      await persistDraft();
      setEditing(false);
      toast.success("Section updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    }
  };

  const openCustomerModify = () => {
    if (!file?.customerId) {
      toast.error("No Contact linked to this Opportunity yet.");
      return;
    }
    const contact = findOperationalEcmContactById(file.customerId);
    if (!contact) {
      toast.error("Contact not found in Enterprise Contact Registry.");
      return;
    }
    setEditContact(contact);
    setContactEditOpen(true);
  };

  const applyParticipants = (nextParticipants: import("@/types/loan-participant").LoanParticipant[]) => {
    if (!file) return;
    const synced = syncParticipantLegacyFields(nextParticipants, file.businessDetails);
    const nextFile = { ...file, ...synced };
    setFile(nextFile);
    syncLoanStructureRelationships(nextFile, synced.participants);
    if (isOpportunityRuntimeCase(file)) return;
    const all = loadLoanFiles().map((f) => (f.id === file.id ? { ...f, ...synced } : f));
    saveLoanFiles(all);
  };

  const handleLoanStructureNavigate = (target: LoanStructureNavTarget) => {
    if (!file) return;
    const toLoan = (tab?: string) =>
      router.push(
        buildJourneyHref(ROUTES.LOAN_FILES, {
          fileId: file.id,
          opportunityId: opportunityId ?? undefined,
          tab,
        }),
      );
    const toDocs = () =>
      router.push(
        buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
          fileId: file.id,
          opportunityId: opportunityId ?? undefined,
        }),
      );

    switch (target.type) {
      case "borrower":
      case "borrower_section":
        setSection("structure");
        break;
      case "co_applicant":
      case "guarantor":
        setSection("structure");
        break;
      case "property":
        if (propertyApplicable) setSection("property");
        else setSection("loan");
        break;
      case "income":
        setSection(
          categoryCtx.isSelfEmployedFamily
            ? "business"
            : categoryCtx.isSalariedFamily
              ? "financial"
              : "customer",
        );
        break;
      case "banking":
        setSection(categoryCtx.isSalariedFamily ? "financial" : "customer");
        break;
      case "lender":
        toLoan("lenders");
        break;
      case "documents":
        toDocs();
        break;
      case "timeline":
        toLoan("timeline");
        break;
      case "add":
        if (target.entity === "lender") toLoan("lenders");
        else if (target.entity === "property") {
          if (propertyApplicable) setSection("property");
          else setSection("loan");
        } else setSection("customer");
        break;
      default:
        break;
    }
  };

  if (requirementGate.status === "loading" || requirementGate.status === "redirecting") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <p className="text-xs text-muted-foreground">
            {requirementGate.status === "redirecting"
              ? "Requirement not captured — opening Lead Information…"
              : "Loading Opportunity Setup…"}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading Opportunity Setup…</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return <OpportunityBoundStage stage="opportunity_creation" />;
  }

  // BAT #8 — Salaried → Financial only; Self-Employed → Business Profile only.
  // BAT #9 — Property tab only when secured lending applies.
  const sections = [
    { id: "customer" as const, label: "Customer", icon: UserRound },
    { id: "loan" as const, label: "Loan Details", icon: FileText },
    { id: "structure" as const, label: "Loan Structure", icon: Users },
    ...(categoryCtx.isSalariedFamily
      ? [{ id: "financial" as const, label: "Financial", icon: Wallet }]
      : []),
    ...(categoryCtx.isSelfEmployedFamily
      ? [{ id: "business" as const, label: "Business Profile", icon: Building2 }]
      : []),
    ...(propertyApplicable
      ? [{ id: "property" as const, label: "Property", icon: Home }]
      : []),
    { id: "chanakya" as const, label: "Chanakya Recommendation", icon: Sparkles },
  ];

  const businessFromProfile = Boolean(
    profile &&
      profile.source !== "none" &&
      (profile.turnover || profile.vintage || profile.natureOfBusiness || profile.companyName),
  );

  /** BAT #19 — Planning remains editable until Opportunity converts to a Deal. */
  const planningCanModify = !file.enterpriseDealId?.trim();
  const resolveOppId =
    (isOpportunityRuntimeCase(file) ? file.enterpriseOpportunityId : null) ||
    opportunityId ||
    (isOpportunityRuntimeCase(file) ? file.id : null);

  const modifyButton = (
    editing: boolean,
    onClick: () => void,
  ) => (
    <Button
      type="button"
      size="sm"
      variant={editing ? "secondary" : "outline"}
      className="h-7 gap-1 px-2.5 text-[11px]"
      disabled={!planningCanModify && !editing}
      title={
        planningCanModify
          ? undefined
          : "Opportunity is read-only after conversion to Deal. Continue in Deal Workspace."
      }
      onClick={onClick}
    >
      <Pencil className="h-3 w-3" />
      {editing ? "Done" : "Modify"}
    </Button>
  );

  return (
    <div className="-mx-4 flex min-h-0 flex-col md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="credit_bench"
        density="compact"
        hideContextChips
        hidePhaseReadiness
        opportunityWorkspaceStage="opportunity_creation"
        title={context.customer || "Opportunity Creation"}
        identityLine={[
          context.opportunity,
          context.product,
          context.amount,
          context.stage,
          context.rm ? `RM ${context.rm}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        context={context}
        fileId={file.id}
        opportunityId={opportunityId}
        headerActions={
          <LoanStructureCommandControl
            file={file}
            participants={file.participants ?? []}
            onNavigate={handleLoanStructureNavigate}
            onParticipantsChange={(next) => {
              applyParticipants(next);
            }}
          />
        }
        onSaveDraft={persistDraft}
        saveSuccessMessage="Opportunity saved successfully."
        saving={saving}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-5">
          {/* BAT #8 — horizontal tabs replace left vertical Setup nav */}
          <nav
            className="flex gap-0.5 overflow-x-auto rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-sm backdrop-blur scrollbar-thin"
            aria-label="Opportunity Setup sections"
          >
            {sections.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                    active
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="space-y-4">
            {section === "customer" && (
              <Panel
                title="Customer Information"
                description="Identity context captured once — reused across Document Center and Credit Workbench."
                headerAction={modifyButton(false, openCustomerModify)}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReadOnly label="Customer Name" value={displayOpportunityText(file.customerName)} />
                  <ReadOnly label="Mobile" value={displayOpportunityText(file.customerMobile)} />
                  <ReadOnly label="Email" value={displayOpportunityText(file.customerEmail)} />
                  <ReadOnly label="City" value={displayOpportunityText(file.city)} />
                  <ReadOnly label="State" value={displayOpportunityText(file.state)} />
                  <ReadOnly
                    label="Employment Type"
                    value={displayOpportunityText(file.employmentType)}
                  />
                </div>
              </Panel>
            )}

            {section === "loan" && (
              <Panel
                title="Loan Details"
                description="Product and amount framing for this engagement."
                headerAction={modifyButton(false, () => {
                  if (!planningCanModify) return;
                  if (!resolveOppId) {
                    toast.error("Opportunity id missing — cannot modify Loan Details.");
                    return;
                  }
                  setLoanDetailsOpen(true);
                })}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReadOnly label="Product" value={displayOpportunityText(file.loanProduct)} />
                  <ReadOnly
                    label="Required Amount"
                    value={
                      isOpportunityRuntimeCase(file)
                        ? displayOpportunityAmount(file.requiredAmount, {
                            captured: file.amountCaptured,
                          })
                        : formatINR(file.requiredAmount || file.loanAmount)
                    }
                  />
                  <ReadOnly
                    label="Lending Type"
                    value={displayOpportunityEnumLabel(file.lendingType)}
                  />
                  <ReadOnly
                    label="Transaction Type"
                    value={displayOpportunityEnumLabel(file.transactionType)}
                  />
                  <ReadOnly
                    label="Stage"
                    value={
                      isOpportunityRuntimeCase(file) && !file.stage?.trim()
                        ? displayOpportunityText(file.stage)
                        : getJourneyStageDisplayLabel(file.stage)
                    }
                  />
                  <ReadOnly
                    label="Relationship Manager"
                    value={displayOpportunityText(file.relationshipManager)}
                  />
                </div>
              </Panel>
            )}

            {section === "structure" && (
              <OpportunityLoanStructureTab
                file={file}
                participants={file.participants ?? []}
                onChange={applyParticipants}
                readOnly={!editingStructure}
                headerAction={modifyButton(editingStructure, () => {
                  if (editingStructure) {
                    void finishSectionEdit(setEditingStructure);
                    return;
                  }
                  if (!planningCanModify) return;
                  setEditingStructure(true);
                })}
              />
            )}

            {section === "financial" && categoryCtx.isSalariedFamily && (
              <Panel
                title="Financial Details"
                description="Reuse salary from Business Profile when present; only capture gaps here."
                headerAction={modifyButton(editingFinancial, () => {
                  if (editingFinancial) {
                    void finishSectionEdit(setEditingFinancial);
                    return;
                  }
                  if (!planningCanModify) return;
                  if (
                    profile?.monthlyIncome &&
                    !stated.statedIncomeMonthly?.startsWith("override:")
                  ) {
                    setStated((p) => ({
                      ...p,
                      statedIncomeMonthly: `override:${String(profile.monthlyIncome).replace(/[^\d.]/g, "")}`,
                    }));
                  }
                  setEditingFinancial(true);
                })}
              >
                {editingFinancial ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Stated Monthly Income">
                      <Input
                        className="h-9 text-sm"
                        value={(stated.statedIncomeMonthly ?? "").replace(/^override:/, "")}
                        onChange={(e) =>
                          setStated((p) => ({
                            ...p,
                            statedIncomeMonthly: `override:${e.target.value}`,
                          }))
                        }
                        placeholder="e.g. 1,85,000"
                      />
                    </Field>
                    <Field label="Stated Obligations / EMIs">
                      <Input
                        className="h-9 text-sm"
                        value={stated.statedObligations ?? ""}
                        onChange={(e) =>
                          setStated((p) => ({ ...p, statedObligations: e.target.value }))
                        }
                        placeholder="Existing obligations"
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReadOnly
                      label="Monthly Income"
                      value={
                        stated.statedIncomeMonthly?.replace(/^override:/, "") ||
                        profile?.monthlyIncome ||
                        "—"
                      }
                      badge={
                        profile?.monthlyIncome &&
                        !stated.statedIncomeMonthly?.startsWith("override:")
                          ? "Reused"
                          : undefined
                      }
                    />
                    <ReadOnly
                      label="Obligations / EMIs"
                      value={stated.statedObligations || "—"}
                    />
                  </div>
                )}
              </Panel>
            )}

            {section === "business" && categoryCtx.isSelfEmployedFamily && (
              <Panel
                title="Business Profile"
                description={
                  businessFromProfile
                    ? "Previously captured Business Profile fields are shown — Modify to update stated values."
                    : "Capture business context when not already on the customer / company profile."
                }
                headerAction={modifyButton(editingBusiness, () => {
                  if (editingBusiness) {
                    void finishSectionEdit(setEditingBusiness);
                    return;
                  }
                  if (!planningCanModify) return;
                  setEditingBusiness(true);
                })}
              >
                {editingBusiness ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Stated Annual Turnover">
                      <Input
                        className="h-9 text-sm"
                        value={stated.statedTurnover ?? ""}
                        onChange={(e) =>
                          setStated((p) => ({ ...p, statedTurnover: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Business Vintage (years)">
                      <Input
                        className="h-9 text-sm"
                        value={stated.statedBusinessVintage ?? ""}
                        onChange={(e) =>
                          setStated((p) => ({ ...p, statedBusinessVintage: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Nature of Business">
                      <Input
                        className="h-9 text-sm"
                        value={stated.statedNatureOfBusiness ?? ""}
                        onChange={(e) =>
                          setStated((p) => ({ ...p, statedNatureOfBusiness: e.target.value }))
                        }
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {profile?.companyName && (
                      <ReadOnly label="Business / Company" value={profile.companyName} badge="Reused" />
                    )}
                    {profile?.constitution && (
                      <ReadOnly label="Constitution" value={profile.constitution} badge="Reused" />
                    )}
                    <ReadOnly
                      label="Annual Turnover"
                      value={stated.statedTurnover || profile?.turnover || "—"}
                      badge={businessFromProfile ? "Reused" : undefined}
                    />
                    <ReadOnly
                      label="Business Vintage (years)"
                      value={stated.statedBusinessVintage || profile?.vintage || "—"}
                      badge={businessFromProfile ? "Reused" : undefined}
                    />
                    <ReadOnly
                      label="Nature of Business"
                      value={stated.statedNatureOfBusiness || profile?.natureOfBusiness || "—"}
                      badge={businessFromProfile ? "Reused" : undefined}
                    />
                  </div>
                )}
              </Panel>
            )}

            {section === "property" && propertyApplicable && (
              <Panel
                title="Property Details"
                description="Stated property context for secured products."
                headerAction={modifyButton(editingProperty, () => {
                  if (editingProperty) {
                    void finishSectionEdit(setEditingProperty);
                    return;
                  }
                  if (!planningCanModify) return;
                  setEditingProperty(true);
                })}
              >
                {editingProperty ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Property Type">
                      <PropertyTypeSelect
                        value={stated.statedPropertyType ?? file.propertyType}
                        onSelect={(type: PropertyType) =>
                          setStated((p) => ({ ...p, statedPropertyType: type }))
                        }
                      />
                    </Field>
                    <Field label="Property Value">
                      <Input
                        className="h-9 text-sm"
                        value={stated.statedPropertyValue ?? ""}
                        onChange={(e) =>
                          setStated((p) => ({ ...p, statedPropertyValue: e.target.value }))
                        }
                        placeholder="Approx. market value"
                      />
                    </Field>
                    <Field label="Property Location">
                      <Input
                        className="h-9 text-sm"
                        value={stated.statedPropertyLocation ?? ""}
                        onChange={(e) =>
                          setStated((p) => ({ ...p, statedPropertyLocation: e.target.value }))
                        }
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReadOnly
                      label="Property Type"
                      value={stated.statedPropertyType ?? file.propertyType ?? "—"}
                    />
                    <ReadOnly
                      label="Property Value"
                      value={stated.statedPropertyValue || "—"}
                    />
                    <ReadOnly
                      label="Property Location"
                      value={stated.statedPropertyLocation || "—"}
                    />
                  </div>
                )}
              </Panel>
            )}

            {section === "chanakya" && (
              <ChanakyaOpportunityRecommendationPanel
                file={file}
                stated={stated}
                opportunityId={resolveOppId}
                onStatedChange={(patch) =>
                  setStated((prev) => {
                    const next = { ...prev, ...patch };
                    saveStatedDraft(file.id, next);
                    return next;
                  })
                }
                onFileChange={(patch) =>
                  setFile((prev) => (prev ? { ...prev, ...patch } : prev))
                }
                onAfterPersist={reloadRuntime}
              />
            )}
          </div>
        </div>
      </LeadOpportunityJourneyChrome>

      <ContactWorkspaceModal
        open={contactEditOpen}
        contact={editContact}
        mode="edit"
        actorId={user?.id ?? "ui"}
        onOpenChange={(open) => {
          setContactEditOpen(open);
          if (!open) setEditContact(null);
        }}
        onSaved={async () => {
          setContactEditOpen(false);
          setEditContact(null);
          await reloadRuntime();
          toast.success("Customer information updated.");
        }}
      />

      {resolveOppId ? (
        <ModifyLoanDetailsSheet
          open={loanDetailsOpen}
          opportunityId={resolveOppId}
          onOpenChange={setLoanDetailsOpen}
          onSaved={async () => {
            await reloadRuntime();
          }}
        />
      ) : null}
    </div>
  );
}

function Panel({
  title,
  description,
  children,
  headerAction,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnly({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string | null;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {badge && (
          <span className="rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-px text-[9px] font-semibold text-teal-800 dark:text-teal-200">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

