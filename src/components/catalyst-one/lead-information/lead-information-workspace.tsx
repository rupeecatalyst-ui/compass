"use client";

/**
 * ADR-018 Wave 2 — Lead Information Workspace.
 * Opportunity Registry capture only — never LoanFile / Deal.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Save } from "lucide-react";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  emptyLeadInformationForm,
  LEAD_INFORMATION_EMPLOYMENT_OPTIONS,
  LEAD_INFORMATION_LENDING_TYPE_OPTIONS,
  LEAD_INFORMATION_NONE,
  LEAD_INFORMATION_PRODUCT_OPTIONS,
  LEAD_INFORMATION_TRANSACTION_OPTIONS,
  parseLeadInformationLendingExtension,
  resolveDefaultLendingTypeForProduct,
  type LeadInformationFormState,
} from "@/constants/lead-information-workspace";
import { OPPORTUNITY_BUSINESS_SOURCES, OPPORTUNITY_PARTICIPATION_ROLES } from "@/constants/opportunity-business-source";
import { opportunityLifecycleLabel } from "@/constants/opportunity-lifecycle";
import { useProductMasterOptions } from "@/lib/enterprise-product-master";
import { OPPORTUNITY_FIELD_NOT_SPECIFIED } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { borrowerDisplayNameOrDash } from "@/lib/enterprise-borrower-identity";
import {
  parseRequestedAmountInput,
  validateLeadInformationForm,
} from "@/lib/lead-information/validate-lead-information";
import {
  buildLeadInformationPatchBody,
  formFromOpportunity,
} from "@/lib/lead-information/form-helpers";
import {
  enterpriseOpportunityApiClient,
  OpportunityApiError,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import { buildOpportunityWorkspaceEntryHref } from "@/lib/loan-journey/adr-018-routing";
import { CitySelect } from "@/components/catalyst-one/shared/city-select";
import { ApproxCibilScoreField } from "@/components/catalyst-one/shared/approx-cibil-score-field";
import { ExistingLoanInformationSection } from "@/components/catalyst-one/shared/existing-loan-information-section";
import { BusinessSourceContactLookupField } from "@/components/catalyst-one/lead-information/business-source-contact-lookup";
import { resolveBusinessSourceContactLookup } from "@/constants/opportunity-business-source";
import {
  isApproxCibilScoreBand,
  type ApproxCibilScoreBand,
} from "@/constants/cibil-score-master";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function selectValue(raw: string): string {
  return raw.trim() ? raw : LEAD_INFORMATION_NONE;
}

function fromSelectValue(value: string): string {
  return value === LEAD_INFORMATION_NONE ? "" : value;
}

function Field({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

export function LeadInformationWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get("opportunityId")?.trim() || "";
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opp, setOpp] = useState<EnterpriseOpportunityApiRecord | null>(null);
  const [form, setForm] = useState<LeadInformationFormState>(emptyLeadInformationForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof LeadInformationFormState, string>>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const { options: productOptions } = useProductMasterOptions(true);
  const productCatalog =
    productOptions.length > 0 ? productOptions : LEAD_INFORMATION_PRODUCT_OPTIONS;

  const load = useCallback(async () => {
    if (!opportunityId) {
      setLoadError("Missing opportunityId. Open Lead Information with ?opportunityId=…");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const row = await enterpriseOpportunityApiClient.getOpportunity(opportunityId);
      setOpp(row);
      setForm(formFromOpportunity(row));
    } catch (err) {
      const message =
        err instanceof OpportunityApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load Opportunity.";
      setLoadError(message);
      setOpp(null);
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchForm = <K extends keyof LeadInformationFormState>(
    key: K,
    value: LeadInformationFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onProductChange = (codeOrNone: string) => {
    const code = fromSelectValue(codeOrNone);
    const hit = productCatalog.find((p) => p.code === code);
    const defaultLending = resolveDefaultLendingTypeForProduct(
      hit?.code ?? "",
      hit?.label ?? "",
    );
    setForm((prev) => ({
      ...prev,
      productCode: hit?.code ?? "",
      productLabel: hit?.label ?? "",
      // Product-driven default — user may still override Secured / Unsecured.
      lendingType: defaultLending || prev.lendingType,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.productCode;
      if (defaultLending) delete next.lendingType;
      return next;
    });
  };

  const sourceContactLookup = useMemo(
    () => resolveBusinessSourceContactLookup(form.businessSource),
    [form.businessSource],
  );

  const validation = useMemo(
    () => validateLeadInformationForm(form, { requireMandatory: false }),
    [form],
  );

  const requirementCaptured =
    Boolean(opp?.requirementCaptured) ||
    opp?.lifecycleStatus === "requirement_captured" ||
    opp?.lifecycleStatus === "active";

  const continueEnabled = requirementCaptured || validation.requirementReady;

  const persist = async (opts: { requireMandatory: boolean; continueAfter: boolean }) => {
    if (!opportunityId || !opp) return;
    const check = validateLeadInformationForm(form, {
      requireMandatory: opts.requireMandatory,
    });
    setErrors(check.errors);
    if (!check.valid) {
      toastError(
        "Complete required fields",
        form.transactionType === "balance_transfer"
          ? "Product, Required Amount, Lending Type, Transaction Type, Business Source, Existing Lender, and Outstanding Amount are required to create the Opportunity."
          : "Product, Required Amount, Lending Type, Transaction Type, and Business Source (with Source Contact where applicable) are required to create the Opportunity.",
      );
      return;
    }

    setSaving(true);
    try {
      const body = buildLeadInformationPatchBody(
        form,
        opp.rowVersion,
        parseLeadInformationLendingExtension(opp.lendingExtension),
        {
          contactId: opp.primaryContactId,
          contactName: borrowerDisplayNameOrDash(opp) !== "—" ? borrowerDisplayNameOrDash(opp) : opp.primaryContactName,
        },
      );
      const updated = await enterpriseOpportunityApiClient.updateOpportunity(
        opportunityId,
        {
          ...body,
          ...(opts.continueAfter ? { markInProgress: true } : {}),
        },
      );
      setOpp(updated);
      setForm(formFromOpportunity(updated));

      const captured =
        Boolean(updated.requirementCaptured) ||
        updated.lifecycleStatus === "requirement_captured" ||
        updated.lifecycleStatus === "in_progress" ||
        updated.lifecycleStatus === "converted_to_deal" ||
        updated.lifecycleStatus === "active";

      success(
        captured ? "Requirement Captured" : "Dialogue saved",
        captured
          ? `${updated.opportunityNumber} · Customer requirement saved. Opportunity is live in the Registry (documents not required).`
          : `${updated.opportunityNumber} · Dialogue — save Product, Amount, Lending Type, Transaction Type, and Business Source for Requirement Captured.`,
      );

      if (opts.continueAfter) {
        if (!captured) {
          toastError(
            "Continue unavailable",
            "Save the Customer Requirement form (Product, Amount, Lending Type, Transaction Type, Business Source) to create the Opportunity.",
          );
          return;
        }
        // ADR-018 Wave 3 — Requirement Captured → Opportunity Workspace.
        router.push(buildOpportunityWorkspaceEntryHref(updated));
      }
    } catch (err) {
      const message =
        err instanceof OpportunityApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Save failed.";
      toastError("Could not save Opportunity", message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ChanakyaLoadingExperience
        module="loan-journey"
        statusLabel="Loading borrower journey..."
        density="panel"
      />
    );
  }

  if (loadError || !opp) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
        <p className="text-sm font-medium text-foreground">Lead Information unavailable</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadError ?? "Unknown error"}</p>
      </div>
    );
  }

  const lifecycleLabel = opportunityLifecycleLabel(opp.lifecycleStatus);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-slate-50/80 via-background to-background dark:from-zinc-950/50">
      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
              Lead Information · Opportunity Registry
            </p>
            <p className="truncate text-sm font-medium text-foreground">
              {opp.opportunityNumber}
              {borrowerDisplayNameOrDash(opp) !== "—"
                ? ` · ${borrowerDisplayNameOrDash(opp)}`
                : ""}
            </p>
            <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
              Lifecycle: {lifecycleLabel}
              {requirementCaptured ? "" : " · Discussion in progress"}
              {" · "}Lending Type: {OPPORTUNITY_FIELD_NOT_SPECIFIED}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5 border border-teal-700/50 bg-teal-700 text-white hover:bg-teal-600"
              disabled={saving}
              onClick={() => void persist({ requireMandatory: false, continueAfter: false })}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5"
              disabled={saving || !continueEnabled}
              title={
                continueEnabled
                  ? "Save mandatory fields and continue (routing in Wave 3)"
                  : "Requires Product, Required Amount, Lending Type, Transaction Type, and Business Source"
              }
              onClick={() => void persist({ requireMandatory: true, continueAfter: true })}
            >
              Save & Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 md:px-6">
        <p className="text-xs text-muted-foreground">
          Capture the customer requirement into the Opportunity Registry. Saving this form creates
          the Opportunity — documents and enrichment are not required. Deals are created only when
          a lender is identified in Loan Workspace.
        </p>

        <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Customer Requirement</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Product" required error={errors.productCode}>
              <Select
                value={selectValue(form.productCode)}
                onValueChange={onProductChange}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Not Selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LEAD_INFORMATION_NONE}>Not Selected</SelectItem>
                  {productCatalog.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Required Amount (₹)"
              required
              error={errors.requestedAmount}
              hint="Persisted as Opportunity requestedAmount"
            >
              <Input
                className="h-9"
                inputMode="numeric"
                placeholder={OPPORTUNITY_FIELD_NOT_SPECIFIED}
                value={form.requestedAmount}
                onChange={(e) => patchForm("requestedAmount", e.target.value)}
              />
            </Field>
            <Field
              label="Lending Type"
              required
              error={errors.lendingType}
              hint="Defaults from Product — Secured or Unsecured"
            >
              <Select
                value={selectValue(form.lendingType)}
                onValueChange={(v) => patchForm("lendingType", fromSelectValue(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Not Specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LEAD_INFORMATION_NONE}>Not Specified</SelectItem>
                  {LEAD_INFORMATION_LENDING_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Business Source</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            How business entered Rupee Catalyst — foundation for commissions, MIS, and partner
            statements.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Business Source"
              required
              error={errors.businessSource}
              hint="Persisted as Opportunity.sourceCode"
            >
              <Select
                value={selectValue(form.businessSource)}
                onValueChange={(v) => {
                  const next = fromSelectValue(v);
                  setForm((prev) => ({
                    ...prev,
                    businessSource: next,
                    sourceContactId: "",
                    sourceContactName: "",
                    sourceWealthPartnerId: "",
                    participationRole: "",
                    sourceCampaignLabel: "",
                  }));
                  setErrors((prev) => {
                    const cleared = { ...prev };
                    delete cleared.businessSource;
                    delete cleared.sourceContactId;
                    delete cleared.sourceContactName;
                    delete cleared.sourceWealthPartnerId;
                    delete cleared.participationRole;
                    delete cleared.sourceCampaignLabel;
                    return cleared;
                  });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LEAD_INFORMATION_NONE}>Not Selected</SelectItem>
                  {OPPORTUNITY_BUSINESS_SOURCES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.label}
                    </SelectItem>
                  ))}
                  {/* Preserve visibility of historical source codes when editing */}
                  {form.businessSource &&
                  !OPPORTUNITY_BUSINESS_SOURCES.some((s) => s.code === form.businessSource) ? (
                    <SelectItem value={form.businessSource}>
                      {form.businessSource} (legacy)
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </Field>

            {sourceContactLookup.showCampaign ? (
              <Field
                label="Campaign"
                error={errors.sourceCampaignLabel}
                hint="Future-ready marketing campaign label"
              >
                <Input
                  className="h-9"
                  value={form.sourceCampaignLabel}
                  placeholder="Campaign name (optional)"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sourceCampaignLabel: e.target.value,
                    }))
                  }
                />
              </Field>
            ) : null}

            {sourceContactLookup.showReferrerName ? (
              <Field
                label="Referrer Name"
                required
                error={errors.sourceContactName}
                hint="No Cost Referral — goodwill only; no commercial participation"
              >
                <Input
                  className="h-9"
                  value={form.sourceContactName}
                  placeholder="Referrer name"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sourceContactName: e.target.value,
                      sourceContactId: "",
                      sourceWealthPartnerId: "",
                    }))
                  }
                />
              </Field>
            ) : null}

            {!sourceContactLookup.showCampaign && !sourceContactLookup.showReferrerName ? (
              <Field
                label={sourceContactLookup.fieldLabel || "Source Name"}
                required={
                  sourceContactLookup.contactMandatory && !sourceContactLookup.hideField
                }
                error={errors.sourceContactId || errors.sourceWealthPartnerId}
                hint={
                  sourceContactLookup.registry === "wealth_partner"
                    ? "Search Wealth Partner Registry — type is on the partner profile"
                    : "Dynamic lookup for the selected Business Source"
                }
              >
                <BusinessSourceContactLookupField
                  businessSource={form.businessSource}
                  selectedId={form.sourceContactId}
                  selectedName={form.sourceContactName}
                  selectedWealthPartnerId={form.sourceWealthPartnerId}
                  autoCustomerName={
                    borrowerDisplayNameOrDash(opp) !== "—"
                      ? borrowerDisplayNameOrDash(opp)
                      : opp.primaryContactName
                  }
                  onSelect={(next) => {
                    setForm((prev) => ({
                      ...prev,
                      sourceContactId: next?.contactId || next?.id || "",
                      sourceContactName: next?.name ?? "",
                      sourceWealthPartnerId: next?.wealthPartnerId ?? "",
                    }));
                    setErrors((prev) => {
                      const cleared = { ...prev };
                      delete cleared.sourceContactId;
                      delete cleared.sourceContactName;
                      delete cleared.sourceWealthPartnerId;
                      return cleared;
                    });
                  }}
                />
              </Field>
            ) : null}

            {sourceContactLookup.showParticipationRole ? (
              <Field
                label="Participation Role"
                required={sourceContactLookup.participationRoleMandatory}
                error={errors.participationRole}
                hint="How the Wealth Partner participated in THIS Opportunity"
              >
                <Select
                  value={selectValue(form.participationRole)}
                  onValueChange={(v) => {
                    setForm((prev) => ({
                      ...prev,
                      participationRole: fromSelectValue(v),
                    }));
                    setErrors((prev) => {
                      const cleared = { ...prev };
                      delete cleared.participationRole;
                      return cleared;
                    });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LEAD_INFORMATION_NONE}>Not Selected</SelectItem>
                    {OPPORTUNITY_PARTICIPATION_ROLES.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Transaction</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Transaction Type" hint="Required to create the Opportunity">
              <Select
                value={selectValue(form.transactionType)}
                onValueChange={(v) => {
                  const next = fromSelectValue(v);
                  setForm((prev) => ({
                    ...prev,
                    transactionType: next,
                    ...(next !== "balance_transfer"
                      ? {
                          btInstitutionId: "",
                          btInstitutionName: "",
                          btAmount: "",
                        }
                      : {}),
                  }));
                  setErrors((prev) => {
                    if (!prev.btInstitutionId && !prev.btAmount && !prev.transactionType) {
                      return prev;
                    }
                    const cleared = { ...prev };
                    delete cleared.btInstitutionId;
                    delete cleared.btAmount;
                    delete cleared.transactionType;
                    return cleared;
                  });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Not Specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LEAD_INFORMATION_NONE}>Not Specified</SelectItem>
                  {LEAD_INFORMATION_TRANSACTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <ExistingLoanInformationSection
                visible={form.transactionType === "balance_transfer"}
                institutionId={form.btInstitutionId || undefined}
                institutionName={form.btInstitutionName || undefined}
                outstandingAmount={
                  form.btAmount.trim()
                    ? (parseRequestedAmountInput(form.btAmount) ?? undefined)
                    : undefined
                }
                onInstitutionChange={(id, name) => {
                  setForm((prev) => ({
                    ...prev,
                    btInstitutionId: id,
                    btInstitutionName: name,
                  }));
                  setErrors((prev) => {
                    if (!prev.btInstitutionId) return prev;
                    const next = { ...prev };
                    delete next.btInstitutionId;
                    return next;
                  });
                }}
                onOutstandingChange={(amount) => {
                  setForm((prev) => ({
                    ...prev,
                    btAmount:
                      typeof amount === "number" && Number.isFinite(amount)
                        ? String(amount)
                        : "",
                  }));
                  setErrors((prev) => {
                    if (!prev.btAmount) return prev;
                    const next = { ...prev };
                    delete next.btAmount;
                    return next;
                  });
                }}
                institutionError={errors.btInstitutionId}
                amountError={errors.btAmount}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Customer Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Employment Type">
              <Select
                value={selectValue(form.employmentTypeCode)}
                onValueChange={(v) => patchForm("employmentTypeCode", fromSelectValue(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Not Specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LEAD_INFORMATION_NONE}>Not Specified</SelectItem>
                  {LEAD_INFORMATION_EMPLOYMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <ApproxCibilScoreField
              id="opportunity-expected-cibil-score"
              label="Expected CIBIL Score"
              required={false}
              value={(form.approxCibilScore || "") as ApproxCibilScoreBand | ""}
              triggerClassName="h-9 text-sm"
              onChange={(v) => patchForm("approxCibilScore", v)}
              error={errors.approxCibilScore}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Optional</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="City" hint="Search and select — State is set from the city master">
              <CitySelect
                city={form.cityLabel}
                state={form.stateLabel}
                placeholder={OPPORTUNITY_FIELD_NOT_SPECIFIED}
                inputClassName="h-9 text-sm"
                onSelect={(entry) => {
                  setForm((prev) => ({
                    ...prev,
                    cityLabel: entry.city,
                    stateLabel: entry.state,
                  }));
                  setErrors((prev) => {
                    if (!prev.cityLabel && !prev.stateLabel) return prev;
                    const next = { ...prev };
                    delete next.cityLabel;
                    delete next.stateLabel;
                    return next;
                  });
                }}
              />
            </Field>
            <Field label="State" hint="Derived from City — not edited separately">
              <Input
                className="h-9 bg-muted/40"
                readOnly
                tabIndex={-1}
                placeholder={OPPORTUNITY_FIELD_NOT_SPECIFIED}
                value={form.stateLabel}
                aria-readonly="true"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes / Remarks">
                <Textarea
                  className={cn("min-h-[88px] text-sm")}
                  placeholder={OPPORTUNITY_FIELD_NOT_SPECIFIED}
                  value={form.remarks}
                  onChange={(e) => patchForm("remarks", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
