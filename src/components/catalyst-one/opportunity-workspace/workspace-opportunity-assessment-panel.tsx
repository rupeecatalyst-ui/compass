"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OPPORTUNITY_ASSESSMENT_CAPTURE_SECTIONS,
  OPPORTUNITY_ASSESSMENT_READINESS_COPY,
} from "@/constants/opportunity-assessment-capture";
import {
  fetchOpportunityAssessmentCapture,
  persistOpportunityAssessmentCapture,
} from "@/lib/enterprise-opportunity/opportunity-assessment-api-client";
import {
  captureKnownValue,
  clearCaptureFact,
  declareKnownZeroObligations,
  setCapturedCibilBand,
  setCapturedCibilExact,
  setCapturedCibilKind,
  setCapturedContribution,
  setCapturedEmploymentFamily,
  setCapturedProduct,
  setCapturedPropertyCategory,
} from "@/lib/opportunity-assessment/capture-facts";
import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import { GOVERNED_PROPERTY_CATEGORIES, isEmploymentClassificationAsPropertyCategory } from "@/constants/product-journey/property-category";
import { captureJourneyFields } from "@/lib/product-journey/applicability";
import { assessmentPathIsConfigured } from "@/lib/product-journey/readiness-fields";
import { emptyOpportunityAssessmentFacts } from "@/lib/opportunity-assessment";
import type {
  AssessmentCibilKind,
  AssessmentContributionDecision,
  AssessmentExpectedCibilBand,
  AssessmentFact,
  AssessmentFactState,
  AssessmentProductCode,
  OpportunityAssessmentFactsV1,
} from "@/types/opportunity-assessment";
import type { OpportunityAssessmentCaptureDto } from "@/types/opportunity-assessment-capture";
import { OwGlassPanel, OwSectionLabel } from "./workspace-design";
import { StrategicTabToolbar } from "./strategic-tab-toolbar";

const CIBIL_BANDS: AssessmentExpectedCibilBand[] = [
  "below_600",
  "600_649",
  "650_699",
  "700_749",
  "750_799",
  "800_plus",
];

function stateLabel(state: AssessmentFactState) {
  switch (state) {
    case "known":
      return "Known";
    case "explicitly_unknown":
      return "Not known";
    case "missing":
      return "Missing";
    case "unconfirmed":
      return "Unconfirmed";
    case "conflicting":
      return "Conflict";
    case "unsupported":
      return "Unsupported";
    default:
      return state;
  }
}

function FactBadge({ fact }: { fact: AssessmentFact<unknown> }) {
  const tone =
    fact.state === "missing"
      ? "outline"
      : fact.state === "known"
        ? "secondary"
        : "destructive";
  return (
    <Badge variant={tone} className="ml-2 text-[10px] font-normal">
      {stateLabel(fact.state)}
    </Badge>
  );
}

function Field({
  label,
  fact,
  children,
}: {
  label: string;
  fact: AssessmentFact<unknown>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center text-[11px] text-zinc-300">
        {label}
        <FactBadge fact={fact} />
      </Label>
      {children}
      {fact.sourceChannel ? (
        <p className="text-[10px] text-zinc-500">
          Source {fact.sourceChannel}
          {fact.sourceFieldKey ? ` · ${fact.sourceFieldKey}` : ""}
        </p>
      ) : (
        <p className="text-[10px] text-zinc-500">Not captured</p>
      )}
    </div>
  );
}

const inputClass = "h-8 border-white/15 bg-zinc-950/70 text-sm text-zinc-50";

export function WorkspaceOpportunityAssessmentPanel({
  opportunityId,
  opportunityContext,
}: {
  opportunityId: string;
  opportunityContext?: { productLabel?: string | null; cityLabel?: string | null };
}) {
  const [model, setModel] = useState<OpportunityAssessmentCaptureDto | null>(null);
  const [facts, setFacts] = useState<OpportunityAssessmentFactsV1>(emptyOpportunityAssessmentFacts());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const next = await fetchOpportunityAssessmentCapture(opportunityId);
    setModel(next);
    setFacts(next.facts);
    setError(null);
  }, [opportunityId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "ASSESSMENT_PERSISTENCE_FAILURE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const persist = async (kind: "SAVED" | "FINALIZED") => {
    if (!model) return;
    setBusy(true);
    try {
      const next = await persistOpportunityAssessmentCapture(opportunityId, {
        kind,
        expectedRowVersion: model.rowVersion,
        commandId: crypto.randomUUID(),
        facts,
        sourceFingerprint: model.sourceFingerprint,
      });
      setModel(next);
      setFacts(next.facts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ASSESSMENT_CONFLICT");
    } finally {
      setBusy(false);
    }
  };

  const product = facts.loanRequirement.productCode.value;
  const employment = facts.borrower.employmentFamily.value;
  const journeyRows = useMemo(() => {
    const configured = model?.journeyFields?.length
      ? model.journeyFields
      : bootstrapProductJourneyFields(product ?? "HOME_LOAN");
    return captureJourneyFields(configured, employment ?? "unknown");
  }, [model?.journeyFields, product, employment]);
  const showPath = (path: string) =>
    path.startsWith("loanRequirement.") || assessmentPathIsConfigured(path, journeyRows, "capture");
  const cibilKind = (facts.cibil.kind.value ?? (facts.cibil.kind.state === "missing" ? "missing" : null)) as
    | AssessmentCibilKind
    | "missing"
    | null;
  const canFinalize = model?.readinessStatus === "ready" && !model.stale;

  const sectionTitles = useMemo(
    () => OPPORTUNITY_ASSESSMENT_CAPTURE_SECTIONS.map((section) => section.title).join(" · "),
    [],
  );

  if (error && !model) return <p className="text-sm text-destructive">{error}</p>;
  if (!model) return <p className="text-sm text-zinc-400">Loading Opportunity Assessment…</p>;

  return (
    <div className="space-y-3">
      <StrategicTabToolbar
        title="Opportunity Assessment"
        description="Capture durable HOME_LOAN / HOME_LOAN_BT facts. Saving does not run Chanakya recommendations."
      >
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void persist("SAVED")}>
          Save draft
        </Button>
        <Button type="button" size="sm" disabled={busy || !canFinalize} onClick={() => void persist("FINALIZED")}>
          Finalize
        </Button>
      </StrategicTabToolbar>

      <div className="flex flex-wrap gap-2">
        <Badge>{model.readinessStatus}</Badge>
        {model.currentRevisionKind ? <Badge variant="outline">{model.currentRevisionKind}</Badge> : <Badge variant="outline">No revision</Badge>}
        <Badge variant="outline">row {model.rowVersion}</Badge>
      </div>
      <p className="text-xs text-zinc-400">{model.readinessCopy}</p>
      {model.unsupportedCopy ? <p className="text-xs text-amber-200">{model.unsupportedCopy}</p> : null}
      {model.missingLabels.length > 0 ? (
        <p className="text-xs text-zinc-400">Missing: {model.missingLabels.join(", ")}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-[10px] text-zinc-500">{sectionTitles}. Zero is not missing. Journey city is not property city.</p>
      {(opportunityContext?.productLabel || opportunityContext?.cityLabel) && (
        <p className="text-[10px] text-zinc-500">
          Opportunity context (not assessment facts)
          {opportunityContext.productLabel ? ` · product ${opportunityContext.productLabel}` : ""}
          {opportunityContext.cityLabel ? ` · journey city ${opportunityContext.cityLabel}` : ""}
        </p>
      )}

      <OwGlassPanel>
        <OwSectionLabel>Borrower</OwSectionLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {showPath("borrower.residency") ? (
          <Field label="Residency" fact={facts.borrower.residency}>
            <select
              className={inputClass}
              value={facts.borrower.residency.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "borrower", "residency", event.target.value)
                    : clearCaptureFact(facts, "borrower", "residency"),
                )
              }
            >
              <option value="">Missing</option>
              <option value="resident">Resident</option>
              <option value="nri">NRI</option>
            </select>
          </Field>
          ) : null}
          {showPath("borrower.dateOfBirth") ? (
          <Field label="Date of birth" fact={facts.borrower.dateOfBirth}>
            <Input
              type="date"
              className={inputClass}
              value={facts.borrower.dateOfBirth.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "borrower", "dateOfBirth", event.target.value)
                    : clearCaptureFact(facts, "borrower", "dateOfBirth"),
                )
              }
            />
          </Field>
          ) : null}
          <Field label="Employment" fact={facts.borrower.employmentFamily}>
            <select
              className={inputClass}
              value={employment ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? setCapturedEmploymentFamily(facts, event.target.value as "salaried" | "self_employed" | "unknown")
                    : clearCaptureFact(facts, "borrower", "employmentFamily"),
                )
              }
            >
              <option value="">Missing</option>
              <option value="salaried">Salaried</option>
              <option value="self_employed">Self-employed</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
          {showPath("borrower.employmentTypeCode") ? (
          <Field label="Occupation type" fact={facts.borrower.employmentTypeCode}>
            <Input
              className={inputClass}
              value={facts.borrower.employmentTypeCode.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "borrower", "employmentTypeCode", event.target.value)
                    : clearCaptureFact(facts, "borrower", "employmentTypeCode"),
                )
              }
            />
          </Field>
          ) : null}
          <Field label="CIBIL status" fact={facts.cibil.kind}>
            <select
              className={inputClass}
              value={cibilKind ?? "missing"}
              onChange={(event) => setFacts(setCapturedCibilKind(facts, event.target.value as AssessmentCibilKind | "missing"))}
            >
              <option value="missing">Missing</option>
              <option value="exact">Exact score</option>
              <option value="expected_band">Expected band</option>
              <option value="explicitly_unknown">Not known</option>
            </select>
          </Field>
          {cibilKind === "exact" ? (
            <Field label="Exact CIBIL" fact={facts.cibil.exactScore}>
              <Input
                className={inputClass}
                inputMode="numeric"
                value={facts.cibil.exactScore.value ?? ""}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  setFacts(value ? setCapturedCibilExact(facts, Number(value)) : setCapturedCibilKind(facts, "exact"));
                }}
              />
            </Field>
          ) : null}
          {cibilKind === "expected_band" ? (
            <Field label="Expected CIBIL band" fact={facts.cibil.expectedBand}>
              <select
                className={inputClass}
                value={facts.cibil.expectedBand.value ?? ""}
                onChange={(event) =>
                  setFacts(
                    event.target.value
                      ? setCapturedCibilBand(facts, event.target.value as AssessmentExpectedCibilBand)
                      : setCapturedCibilKind(facts, "expected_band"),
                  )
                }
              >
                <option value="">Select band</option>
                {CIBIL_BANDS.map((band) => (
                  <option key={band} value={band}>
                    {band}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
      </OwGlassPanel>

      <OwGlassPanel>
        <OwSectionLabel>Income & Obligations</OwSectionLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {employment === "salaried" ? (
            <Field label="Monthly income" fact={facts.incomeAndObligations.monthlyIncome}>
              <Input
                className={inputClass}
                value={facts.incomeAndObligations.monthlyIncome.value ?? ""}
                placeholder="Exact rupees, e.g. 200000.00"
                onChange={(event) =>
                  setFacts(
                    event.target.value
                      ? captureKnownValue(facts, "incomeAndObligations", "monthlyIncome", event.target.value)
                      : clearCaptureFact(facts, "incomeAndObligations", "monthlyIncome"),
                  )
                }
              />
            </Field>
          ) : (
            <p className="text-xs text-zinc-400 sm:col-span-2">
              {employment === "self_employed"
                ? "Turnover is not income. Canonical self-employed methodology remains unsupported."
                : "Monthly income is captured after salaried employment is known."}
            </p>
          )}
          {showPath("incomeAndObligations.existingMonthlyObligations") ? (
          <Field label="Existing monthly obligations" fact={facts.incomeAndObligations.existingMonthlyObligations}>
            <Input
              className={inputClass}
              value={facts.incomeAndObligations.existingMonthlyObligations.value ?? ""}
              placeholder="Leave blank if missing — not zero"
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  setFacts(clearCaptureFact(facts, "incomeAndObligations", "existingMonthlyObligations"));
                  return;
                }
                setFacts(captureKnownValue(facts, "incomeAndObligations", "existingMonthlyObligations", value));
              }}
            />
            <label className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
              <input
                type="checkbox"
                checked={facts.incomeAndObligations.existingMonthlyObligations.knownZeroDeclared === true}
                onChange={(event) =>
                  setFacts(
                    event.target.checked
                      ? declareKnownZeroObligations(facts)
                      : clearCaptureFact(facts, "incomeAndObligations", "existingMonthlyObligations"),
                  )
                }
              />
              I declare zero existing EMI
            </label>
          </Field>
          ) : null}
          {showPath("incomeAndObligations.requestedTenureMonths") ? (
          <Field label="Requested tenure (months)" fact={facts.incomeAndObligations.requestedTenureMonths}>
            <Input
              className={inputClass}
              inputMode="numeric"
              value={facts.incomeAndObligations.requestedTenureMonths.value ?? ""}
              onChange={(event) => {
                const value = event.target.value.trim();
                setFacts(
                  value
                    ? captureKnownValue(facts, "incomeAndObligations", "requestedTenureMonths", Number(value))
                    : clearCaptureFact(facts, "incomeAndObligations", "requestedTenureMonths"),
                );
              }}
            />
          </Field>
          ) : null}
        </div>
      </OwGlassPanel>

      <OwGlassPanel>
        <OwSectionLabel>Loan Requirement</OwSectionLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Product" fact={facts.loanRequirement.productCode}>
            <select
              className={inputClass}
              value={product ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? setCapturedProduct(facts, event.target.value as AssessmentProductCode)
                    : clearCaptureFact(facts, "loanRequirement", "productCode"),
                )
              }
            >
              <option value="">Missing</option>
              <option value="HOME_LOAN">HOME_LOAN</option>
              <option value="HOME_LOAN_BT">HOME_LOAN_BT</option>
            </select>
          </Field>
          <Field label="Transaction type" fact={facts.loanRequirement.transactionType}>
            <Input
              className={inputClass}
              readOnly
              value={
                product === "HOME_LOAN_BT"
                  ? "balance_transfer"
                  : facts.loanRequirement.transactionType.value ?? ""
              }
              placeholder={product === "HOME_LOAN" ? "Blank permitted" : "Set by product"}
            />
          </Field>
          <Field label="Requested amount" fact={facts.loanRequirement.requestedAmount}>
            <Input
              className={inputClass}
              value={facts.loanRequirement.requestedAmount.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "loanRequirement", "requestedAmount", event.target.value)
                    : clearCaptureFact(facts, "loanRequirement", "requestedAmount"),
                )
              }
            />
          </Field>
        </div>
      </OwGlassPanel>

      <OwGlassPanel>
        <OwSectionLabel>Property</OwSectionLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Property value" fact={facts.property.propertyValue}>
            <Input
              className={inputClass}
              value={facts.property.propertyValue.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "property", "propertyValue", event.target.value)
                    : clearCaptureFact(facts, "property", "propertyValue"),
                )
              }
            />
          </Field>
          {showPath("property.propertyCategory") ? (
          <Field label="Property category" fact={facts.property.propertyCategory}>
            <select
              className={inputClass}
              value={
                isEmploymentClassificationAsPropertyCategory(facts.property.propertyCategory.value)
                  ? ""
                  : facts.property.propertyCategory.value ?? ""
              }
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? setCapturedPropertyCategory(facts, event.target.value)
                    : clearCaptureFact(facts, "property", "propertyCategory"),
                )
              }
            >
              <option value="">Missing</option>
              {GOVERNED_PROPERTY_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {isEmploymentClassificationAsPropertyCategory(facts.property.propertyCategory.value) ? (
              <p className="text-[11px] text-amber-200">Stored value is not a property category and cannot be used.</p>
            ) : null}
          </Field>
          ) : null}
          {showPath("property.constructionStatus") ? (
          <Field label="Construction status" fact={facts.property.constructionStatus}>
            <Input
              className={inputClass}
              value={facts.property.constructionStatus.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "property", "constructionStatus", event.target.value)
                    : clearCaptureFact(facts, "property", "constructionStatus"),
                )
              }
            />
          </Field>
          ) : null}
          {showPath("property.occupancy") ? (
          <Field label="Occupancy" fact={facts.property.occupancy}>
            <Input
              className={inputClass}
              value={facts.property.occupancy.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "property", "occupancy", event.target.value)
                    : clearCaptureFact(facts, "property", "occupancy"),
                )
              }
            />
          </Field>
          ) : null}
          {showPath("property.propertyCity") ? (
          <Field label="Property city" fact={facts.property.propertyCity}>
            <Input
              className={inputClass}
              value={facts.property.propertyCity.value ?? ""}
              placeholder="Do not copy journey city"
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "property", "propertyCity", event.target.value)
                    : clearCaptureFact(facts, "property", "propertyCity"),
                )
              }
            />
          </Field>
          ) : null}
          {showPath("borrower.journeyCity") ? (
          <Field label="Journey city (separate)" fact={facts.borrower.journeyCity}>
            <Input
              className={inputClass}
              value={facts.borrower.journeyCity.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "borrower", "journeyCity", event.target.value)
                    : clearCaptureFact(facts, "borrower", "journeyCity"),
                )
              }
            />
          </Field>
          ) : null}
        </div>
      </OwGlassPanel>

      {product === "HOME_LOAN_BT" ? (
        <OwGlassPanel>
          <OwSectionLabel>Home Loan Balance Transfer</OwSectionLabel>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["outstandingPrincipal", "Current outstanding"],
                ["currentRoiPercent", "Current ROI %"],
                ["currentHomeLoanEmi", "Current HL EMI"],
                ["remainingTenureMonths", "Remaining tenure"],
                ["existingLenderInstitution", "Current lender"],
                ["loanStartDate", "Loan start date"],
                ["delayedEmiCount", "Delayed EMI count"],
              ] as const
            )
              .filter(([key]) => showPath(`balanceTransfer.${key}`))
              .map(([key, label]) => (
              <Field key={key} label={label} fact={facts.balanceTransfer[key]}>
                <Input
                  className={inputClass}
                  value={facts.balanceTransfer[key].value ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) {
                      setFacts(clearCaptureFact(facts, "balanceTransfer", key));
                      return;
                    }
                    const numeric = key === "remainingTenureMonths" || key === "delayedEmiCount";
                    setFacts(
                      captureKnownValue(
                        facts,
                        "balanceTransfer",
                        key,
                        (numeric ? Number(value) : value) as never,
                      ),
                    );
                  }}
                />
              </Field>
            ))}
            {showPath("balanceTransfer.repaymentTrack") ? (
            <Field label="Repayment track" fact={facts.balanceTransfer.repaymentTrack}>
              <select
                className={inputClass}
                value={facts.balanceTransfer.repaymentTrack.value ?? ""}
                onChange={(event) =>
                  setFacts(
                    event.target.value
                      ? captureKnownValue(
                          facts,
                          "balanceTransfer",
                          "repaymentTrack",
                          event.target.value as "yes" | "no" | "not_sure",
                        )
                      : clearCaptureFact(facts, "balanceTransfer", "repaymentTrack"),
                  )
                }
              >
                <option value="">Missing</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="not_sure">Not sure</option>
              </select>
            </Field>
            ) : null}
          </div>
        </OwGlassPanel>
      ) : null}

      {showPath("coApplicant.participantRef") || showPath("coApplicant.contributionDecision") ? (
      <OwGlassPanel>
        <OwSectionLabel>Co-applicant</OwSectionLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Participant" fact={facts.coApplicant.participantRef}>
            <Input
              className={inputClass}
              value={facts.coApplicant.participantRef.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? captureKnownValue(facts, "coApplicant", "participantRef", event.target.value)
                    : clearCaptureFact(facts, "coApplicant", "participantRef"),
                )
              }
            />
          </Field>
          <Field label="Financial contribution" fact={facts.coApplicant.contributionDecision}>
            <select
              className={inputClass}
              value={facts.coApplicant.contributionDecision.value ?? ""}
              onChange={(event) =>
                setFacts(
                  event.target.value
                    ? setCapturedContribution(facts, event.target.value as AssessmentContributionDecision)
                    : clearCaptureFact(facts, "coApplicant", "contributionDecision"),
                )
              }
            >
              <option value="">Missing — participant is not a contributor</option>
              <option value="not_decided">Not decided</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
        </div>
      </OwGlassPanel>
      ) : null}

      {employment === "self_employed" ? (
        <OwGlassPanel>
          <OwSectionLabel>Self-employed evidence</OwSectionLabel>
          <p className="mt-2 text-xs text-amber-200">{OPPORTUNITY_ASSESSMENT_READINESS_COPY.unsupported}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Turnover" fact={facts.selfEmployedEvidence.turnover}>
              <Input
                className={inputClass}
                value={facts.selfEmployedEvidence.turnover.value ?? ""}
                onChange={(event) =>
                  setFacts(
                    event.target.value
                      ? captureKnownValue(facts, "selfEmployedEvidence", "turnover", event.target.value)
                      : clearCaptureFact(facts, "selfEmployedEvidence", "turnover"),
                  )
                }
              />
            </Field>
            <Field label="Methodology" fact={facts.selfEmployedEvidence.methodologyStatus}>
              <Input className={inputClass} readOnly value="unsupported" />
            </Field>
          </div>
        </OwGlassPanel>
      ) : null}
    </div>
  );
}
