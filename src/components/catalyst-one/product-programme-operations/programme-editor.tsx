"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { ControlledMultiSelect } from "@/components/catalyst-one/product-programme-operations/controlled-multi-select";
import {
  PROGRAMME_APPLICANT_TYPES,
  PROGRAMME_BENCHMARKS,
  PROGRAMME_EMPLOYMENT_TYPES,
  PROGRAMME_INCOME_ASSESSMENT_METHODS,
  PROGRAMME_LEGAL_CONSTITUTIONS,
  PROGRAMME_PROPERTY_TYPES,
  PROGRAMME_RATE_TYPES,
  PROGRAMME_RESIDENCY,
  PROGRAMME_TRANSACTION_TYPES,
} from "@/constants/product-programme-operations/controlled-masters";
import { evaluateProgrammeCompleteness } from "@/lib/product-programme-operations/completeness";
import { deriveEmploymentFamily } from "@/lib/product-programme-operations/employment";
import {
  emptyProgrammeEditorState,
  formatIndianCurrency,
  recordToEditorState,
  type ProgrammeEditorState,
} from "@/lib/product-programme-operations/editor-state";
import {
  LEGACY_PROGRAMME_REVIEW_LABEL,
  isLegacyProgrammeReviewRequired,
  mustCreateDraftRevision,
} from "@/lib/product-programme-operations/legacy-review";
import { toProgrammeWritePayload } from "@/lib/product-programme-operations/to-write-payload";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import { EDIE_CATALOG } from "@/constants/edie-certified/document-catalog";
import { listEcmMasterOptions } from "@/constants/enterprise-contact-master/masters";
import type { EnterpriseLenderProgramRecord, EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import { cn } from "@/lib/utils";

const SECTIONS = [
  "Programme Identity",
  "Applicant and Constitution",
  "Geography and Transaction",
  "Eligibility",
  "Loan Amount and Tenure",
  "Pricing and Charges",
  "Policy",
  "Required Documents",
  "Effective Dates",
  "Review and Publication",
] as const;

const PROPERTY_PRODUCTS = new Set(["HOME_LOAN", "HOME_LOAN_BT", "LAP"]);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <div className="space-y-1.5" data-field={fieldId}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ProductProgrammeEditor({
  lenders,
  products,
  policies,
  initial,
  actor,
  onClose,
  onSaved,
}: {
  lenders: EnterpriseLenderRecord[];
  products: { id?: string; code: string; label: string }[];
  policies: { id: string; label: string; status?: string }[];
  initial?: EnterpriseLenderProgramRecord | null;
  actor: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = useState<ProgrammeEditorState>(
    initial ? recordToEditorState(initial) : emptyProgrammeEditorState(),
  );
  const [baseline, setBaseline] = useState(JSON.stringify(state));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(state) !== baseline;

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const completeness = useMemo(() => evaluateProgrammeCompleteness(state), [state]);
  const employmentFamily = deriveEmploymentFamily(state.employmentTypes);
  const productCode = (state.productCode ?? "").toUpperCase();
  const isPropertyProduct = PROPERTY_PRODUCTS.has(productCode);
  const isBt = productCode === "HOME_LOAN_BT" || state.transactionTypes.includes("balance_transfer");
  const salariedOnly = employmentFamily === "salaried";
  const selfEmployed = employmentFamily === "self_employed" || employmentFamily === "both";
  const companyOnly =
    state.legalConstitutions.length > 0 &&
    !state.legalConstitutions.includes("individual") &&
    !state.legalConstitutions.includes("huf");

  function patch(next: Partial<ProgrammeEditorState>) {
    setState((current) => {
      const merged = { ...current, ...next };
      merged.employmentFamily = deriveEmploymentFamily(merged.employmentTypes);
      return merged;
    });
  }

  const incomeMethods = PROGRAMME_INCOME_ASSESSMENT_METHODS.filter((method) => {
    if (salariedOnly) return method.id === "salary" || method.id === "not_applicable";
    if (employmentFamily === "self_employed") return method.id !== "salary";
    return true;
  });

  async function saveDraft() {
    setSaving(true);
    try {
      const payload = toProgrammeWritePayload(state);
      const needsDraftRevision = mustCreateDraftRevision({
        isDeleted: false,
        status: state.status,
        lifecycleStatus: state.lifecycleStatus,
        isLivePublished: state.isLivePublished,
        publicationState: state.publicationState,
      });
      const saved =
        state.id && needsDraftRevision
          ? await lenderRegistryClient.updateProgram(
              state.id,
              { ...payload, createDraftRevision: true, expectedLockVersion: state.lockVersion },
              actor,
            )
          : state.id
            ? await lenderRegistryClient.updateProgram(
                state.id,
                { ...payload, expectedLockVersion: state.lockVersion },
                actor,
              )
            : await lenderRegistryClient.createProgram(payload, actor);
      const next = recordToEditorState(saved);
      setState(next);
      setBaseline(JSON.stringify(next));
      toast.success("Draft saved.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function runWorkflow(action: "submit" | "approve" | "publish") {
    if (!state.id) return;
    setSaving(true);
    try {
      const approvalReason =
        action === "approve" ? window.prompt("Approval reason (required for Super Admin self-approval)") ?? "" : undefined;
      const res = await authenticatedJsonFetch(`/api/lender-registry/programs/${state.id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, approvalReason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        const fields = Array.isArray(body?.error?.fieldErrors)
          ? body.error.fieldErrors.map((item: { field: string; message: string }) => `${item.field}: ${item.message}`).join("; ")
          : "";
        throw new Error(body?.error?.message || fields || "Workflow failed");
      }
      if (body.data) {
        const next = recordToEditorState(body.data);
        setState(next);
        setBaseline(JSON.stringify(next));
      }
      toast.success(`${action} succeeded.`);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Workflow failed");
    } finally {
      setSaving(false);
    }
  }
  function requestClose() {
    if (dirty && !window.confirm("You have unsaved changes. Discard and close?")) return;
    onClose();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {state.id ? "Edit Product Programme" : "Create Product Programme"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Controlled inputs only. Save Draft does not publish.
          </p>
          {isLegacyProgrammeReviewRequired({
            isDeleted: false,
            status: state.status,
            lifecycleStatus: state.lifecycleStatus,
            isLivePublished: state.isLivePublished,
            publicationState: state.publicationState,
          }) ? (
            <p
              className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-300"
              data-testid="legacy-programme-review-required"
            >
              {LEGACY_PROGRAMME_REVIEW_LABEL}. Structured completion, maker-checker approval and
              explicit republication are required before recommendation use.
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={requestClose}>
            Close
          </Button>
          <Button data-testid="programme-save-draft" onClick={() => void saveDraft()} disabled={saving}>
            Save Draft
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {SECTIONS.map((section, index) => (
          <div key={section} className="rounded-md border border-border px-3 py-2 text-xs">
            <p className="font-medium">{index + 1}. {section}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="programme-identity">
        <h3 className="text-lg font-semibold">1. Programme Identity</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Lender">
            <Select value={state.lenderId || undefined} onValueChange={(value) => patch({ lenderId: value })}>
              <SelectTrigger data-testid="programme-lender"><SelectValue placeholder="Select lender" /></SelectTrigger>
              <SelectContent>
                {lenders.filter((lender) => !lender.isDeleted).map((lender) => (
                  <SelectItem key={lender.id} value={lender.id}>
                    {lender.displayName || lender.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Product">
            <Select
              value={state.productCode || undefined}
              onValueChange={(value) => {
                const product = products.find((item) => item.code === value);
                patch({
                  productCode: value,
                  productId: product?.id ?? null,
                  propertyTypes: PROPERTY_PRODUCTS.has(value) ? state.propertyTypes : ["not_applicable"],
                  transactionTypes:
                    value === "HOME_LOAN_BT"
                      ? Array.from(new Set([...state.transactionTypes, "balance_transfer"]))
                      : state.transactionTypes,
                });
              }}
            >
              <SelectTrigger data-testid="programme-product"><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.code} value={product.code}>
                    {product.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Programme name">
            <Input value={state.label} onChange={(event) => patch({ label: event.target.value })} />
          </Field>
          <Field label="Programme code">
            <Input value={state.code} onChange={(event) => patch({ code: event.target.value })} disabled={Boolean(state.id)} />
          </Field>
          <Field label="Product variant">
            <Input
              value={state.productVariantCode ?? ""}
              onChange={(event) => patch({ productVariantCode: event.target.value || null })}
            />
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            value={state.description ?? ""}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="applicant-constitution">
        <h3 className="text-lg font-semibold">2. Applicant and Constitution</h3>
        <ControlledMultiSelect
          label="Applicant types"
          values={state.applicantTypes}
          options={PROGRAMME_APPLICANT_TYPES}
          onChange={(applicantTypes) => patch({ applicantTypes })}
        />
        <ControlledMultiSelect
          label="Employment types"
          values={state.employmentTypes}
          options={PROGRAMME_EMPLOYMENT_TYPES}
          onChange={(employmentTypes) => patch({ employmentTypes: employmentTypes as ProgrammeEditorState["employmentTypes"] })}
        />
        <p className="text-sm text-muted-foreground">
          Derived employment family: <strong>{employmentFamily ?? "Not specified"}</strong>
          {employmentFamily === "both" ? " — stored as selected types, never as free text “Both”." : ""}
        </p>
        <ControlledMultiSelect
          label="Legal constitution"
          values={state.legalConstitutions}
          options={PROGRAMME_LEGAL_CONSTITUTIONS}
          onChange={(legalConstitutions) =>
            patch({ legalConstitutions: legalConstitutions as ProgrammeEditorState["legalConstitutions"] })
          }
        />
        <ControlledMultiSelect
          label="Residency eligibility (NRI belongs here)"
          values={state.residencyEligibility}
          options={PROGRAMME_RESIDENCY}
          onChange={(residencyEligibility) =>
            patch({ residencyEligibility: residencyEligibility as ProgrammeEditorState["residencyEligibility"] })
          }
        />
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="geography-transaction">
        <h3 className="text-lg font-semibold">3. Geography and Transaction</h3>
        <ControlledMultiSelect
          label="Eligible states"
          values={state.geographyStates}
          options={listEcmMasterOptions("state").map((item) => ({ id: item.id, label: item.label }))}
          onChange={(geographyStates) => patch({ geographyStates })}
        />
        <ControlledMultiSelect
          label="Eligible cities"
          values={state.geographyCities}
          options={listEcmMasterOptions("city").map((item) => ({ id: item.id, label: item.label }))}
          onChange={(geographyCities) => patch({ geographyCities })}
        />
        <ControlledMultiSelect
          label="Transaction types"
          values={state.transactionTypes}
          options={PROGRAMME_TRANSACTION_TYPES}
          onChange={(transactionTypes) => patch({ transactionTypes })}
        />
        {isBt ? (
          <p className="text-sm">Balance Transfer conditions are required for this product.</p>
        ) : null}
        {isPropertyProduct ? (
          <ControlledMultiSelect
            label="Property types"
            values={state.propertyTypes}
            options={PROGRAMME_PROPERTY_TYPES.filter((item) => item.id !== "not_applicable")}
            onChange={(propertyTypes) => patch({ propertyTypes })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Non-property product — property type recorded as Not applicable.</p>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="eligibility">
        <h3 className="text-lg font-semibold">4. Eligibility</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Minimum CIBIL"><Input type="number" value={state.minCibil ?? ""} onChange={(event) => patch({ minCibil: event.target.value ? Number(event.target.value) : null })} /></Field>
          <Field label="Maximum CIBIL"><Input type="number" value={state.maxCibil ?? ""} onChange={(event) => patch({ maxCibil: event.target.value ? Number(event.target.value) : null })} /></Field>
          <Field label="Minimum age"><Input type="number" value={state.minAge ?? ""} onChange={(event) => patch({ minAge: event.target.value ? Number(event.target.value) : null })} /></Field>
          <Field label="Maximum age"><Input type="number" value={state.maxAge ?? ""} onChange={(event) => patch({ maxAge: event.target.value ? Number(event.target.value) : null })} /></Field>
          {!companyOnly ? (
            <>
              <Field label="Minimum income / turnover (exact decimal)">
                <Input value={state.minIncomeExact ?? ""} onChange={(event) => patch({ minIncomeExact: event.target.value || null })} />
                <p className="text-xs text-muted-foreground">{formatIndianCurrency(state.minIncomeExact)}</p>
              </Field>
              <Field label="Maximum income / turnover (exact decimal)">
                <Input value={state.maxIncomeExact ?? ""} onChange={(event) => patch({ maxIncomeExact: event.target.value || null })} />
              </Field>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Company constitution selected — individual salary-only fields are not forced.</p>
          )}
        </div>
        <ControlledMultiSelect
          label="Income assessment method"
          values={state.incomeAssessmentMethods}
          options={incomeMethods}
          onChange={(incomeAssessmentMethods) => patch({ incomeAssessmentMethods })}
        />
        {selfEmployed ? (
          <p className="text-sm">Self-employed rules may use turnover, ITR, GST or banking assessment.</p>
        ) : null}
        {salariedOnly ? (
          <p className="text-sm">Salaried profile — business turnover inputs are not required.</p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="loan-amount-tenure">
        <h3 className="text-lg font-semibold">5. Loan Amount and Tenure</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Minimum loan amount"><Input value={state.minLoanAmountExact ?? ""} onChange={(event) => patch({ minLoanAmountExact: event.target.value || null })} /><p className="text-xs text-muted-foreground">{formatIndianCurrency(state.minLoanAmountExact)}</p></Field>
          <Field label="Maximum loan amount"><Input value={state.maxLoanAmountExact ?? ""} onChange={(event) => patch({ maxLoanAmountExact: event.target.value || null })} /><p className="text-xs text-muted-foreground">{formatIndianCurrency(state.maxLoanAmountExact)}</p></Field>
          <Field label="Minimum tenure (months)"><Input type="number" value={state.minTenureMonths ?? ""} onChange={(event) => patch({ minTenureMonths: event.target.value ? Number(event.target.value) : null })} /></Field>
          <Field label="Maximum tenure (months)"><Input type="number" value={state.maxTenureMonths ?? ""} onChange={(event) => patch({ maxTenureMonths: event.target.value ? Number(event.target.value) : null })} /></Field>
          {isPropertyProduct ? (
            <>
              <Field label="Minimum LTV %"><Input value={state.minLtvExact ?? ""} onChange={(event) => patch({ minLtvExact: event.target.value || null })} /></Field>
              <Field label="Maximum LTV %"><Input value={state.maxLtvExact ?? ""} onChange={(event) => patch({ maxLtvExact: event.target.value || null })} /></Field>
            </>
          ) : null}
          <Field label="Minimum FOIR %"><Input value={state.minFoirExact ?? ""} onChange={(event) => patch({ minFoirExact: event.target.value || null })} /></Field>
          <Field label="Maximum FOIR %"><Input value={state.maxFoirExact ?? ""} onChange={(event) => patch({ maxFoirExact: event.target.value || null })} /></Field>
          <Field label="Minimum DBR %"><Input value={state.minDbrExact ?? ""} onChange={(event) => patch({ minDbrExact: event.target.value || null })} /></Field>
          <Field label="Maximum DBR %"><Input value={state.maxDbrExact ?? ""} onChange={(event) => patch({ maxDbrExact: event.target.value || null })} /></Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="pricing-roi">
        <h3 className="text-lg font-semibold">6. Pricing and Charges</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Minimum ROI %"><Input data-testid="programme-min-roi" value={state.minRoiExact ?? ""} onChange={(event) => patch({ minRoiExact: event.target.value || null })} /></Field>
          <Field label="Maximum ROI %"><Input value={state.maxRoiExact ?? ""} onChange={(event) => patch({ maxRoiExact: event.target.value || null })} /></Field>
          <Field label="Rate type">
            <Select value={state.rateType ?? undefined} onValueChange={(value) => patch({ rateType: value })}>
              <SelectTrigger><SelectValue placeholder="Select rate type" /></SelectTrigger>
              <SelectContent>
                {PROGRAMME_RATE_TYPES.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Benchmark">
            <Select value={state.benchmarkCode ?? undefined} onValueChange={(value) => patch({ benchmarkCode: value })}>
              <SelectTrigger><SelectValue placeholder="Select benchmark" /></SelectTrigger>
              <SelectContent>
                {PROGRAMME_BENCHMARKS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Spread %"><Input value={state.spreadExact ?? ""} onChange={(event) => patch({ spreadExact: event.target.value || null })} /></Field>
          <Field label="Processing fee amount"><Input value={state.processingFeeAmountExact ?? ""} onChange={(event) => patch({ processingFeeAmountExact: event.target.value || null })} /></Field>
          <Field label="Processing fee %"><Input value={state.processingFeePctExact ?? ""} onChange={(event) => patch({ processingFeePctExact: event.target.value || null })} /></Field>
          <Field label="Processing fee label"><Input value={state.processingFeeLabel ?? ""} onChange={(event) => patch({ processingFeeLabel: event.target.value || null })} /></Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="policy">
        <h3 className="text-lg font-semibold">7. Policy</h3>
        <Field label="Published policy version">
          <Select
            value={state.policyVersionId ?? undefined}
            onValueChange={(value) => patch({ policyVersionId: value, creditRiskPolicyRef: value })}
          >
            <SelectTrigger><SelectValue placeholder="Select published policy" /></SelectTrigger>
            <SelectContent>
              {policies.map((policy) => (
                <SelectItem key={policy.id} value={policy.id}>{policy.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Policy notes">
          <Textarea value={state.remarks ?? ""} onChange={(event) => patch({ remarks: event.target.value || null })} />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="lod">
        <h3 className="text-lg font-semibold">8. Required Documents</h3>
        <ControlledMultiSelect
          label="EDIE document catalogue"
          values={state.requiredDocumentTypeIds}
          options={Object.values(EDIE_CATALOG).map((item) => ({ id: item.typeRef, label: item.label }))}
          onChange={(requiredDocumentTypeIds) =>
            patch({
              requiredDocumentTypeIds,
              requiredDocuments: requiredDocumentTypeIds.map((typeRef) => ({
                typeRef,
                mandatory: true,
                active: true,
                applicability: "all",
              })),
            })
          }
        />
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="effective-dates">
        <h3 className="text-lg font-semibold">9. Effective Dates</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Effective date"><Input type="date" value={(state.effectiveFrom ?? "").slice(0, 10)} onChange={(event) => patch({ effectiveFrom: event.target.value ? new Date(event.target.value).toISOString() : null })} /></Field>
          <Field label="Review date"><Input type="date" value={(state.reviewAt ?? "").slice(0, 10)} onChange={(event) => patch({ reviewAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></Field>
          <Field label="Expiry date"><Input type="date" value={(state.effectiveUntil ?? "").slice(0, 10)} onChange={(event) => patch({ effectiveUntil: event.target.value ? new Date(event.target.value).toISOString() : null })} /></Field>
          <Field label="Average TAT (days)"><Input type="number" value={state.averageTatDays ?? ""} onChange={(event) => patch({ averageTatDays: event.target.value ? Number(event.target.value) : null })} /></Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5" data-section="completeness-review">
        <h3 className="text-lg font-semibold">10. Review and Publication</h3>
        <p className={cn("text-sm", completeness.complete ? "text-foreground" : "text-destructive")}>
          Completeness: {completeness.complete ? "Complete" : `${completeness.errors.length} field(s) remaining`}
        </p>
        <ul className="list-disc pl-5 text-sm">
          {completeness.errors.map((error) => (
            <li key={error.field}>{error.field}: {error.message}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="programme-save-draft-review" onClick={() => void saveDraft()} disabled={saving}>Save Draft</Button>
          <Button
            data-testid="programme-submit"
            variant="secondary"
            disabled={saving || !state.id}
            onClick={() => void runWorkflow("submit")}
          >
            Submit
          </Button>
          <Button
            data-testid="programme-approve"
            variant="secondary"
            disabled={saving || !state.id}
            onClick={() => void runWorkflow("approve")}
          >
            Approve
          </Button>
          <Button
            data-testid="programme-publish"
            disabled={saving || !state.id || !completeness.complete}
            onClick={() => void runWorkflow("publish")}
          >
            Publish
          </Button>
        </div>
        {dirty ? <p className="text-sm text-muted-foreground">Unsaved changes on this programme.</p> : null}
      </section>
    </div>
  );
}
