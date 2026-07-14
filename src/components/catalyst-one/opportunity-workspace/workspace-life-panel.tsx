"use client";

import { useEffect, useMemo, useState } from "react";
import { LIFE_ACTIVE_STATUS, LIFE_CONTACT_ROLES } from "@/constants/enterprise-life-engine";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import {
  getLifeRegistrySnapshot,
  registerLifeLenderContact,
  selectLifeLenderExecutors,
} from "@/lib/enterprise-life-engine";
import type { LifeLenderSelectionResult } from "@/types/enterprise-life-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import {
  aggregateLifeInstitutions,
  buildLifeComparisonRows,
  getChanakyaLenderAssignmentMessage,
  getLifePlaceholderState,
  getLifeRecommendationReasons,
  getQuickIntent,
  placeholderBackToLifeInstitution,
  placeholderCancelLifeSelection,
  placeholderCloseLifeSelector,
  placeholderConsumeQuickIntent,
  placeholderEnrichLifeResult,
  placeholderOpenLifeSelector,
  placeholderReplaceLifeSelection,
  placeholderSaveLifeSelection,
  placeholderSelectLifeInstitution,
  placeholderSetLifeDraft,
  placeholderSetLifeSearch,
  type PlaceholderLifeInstitution,
} from "./providers/workspace-placeholder-provider";
import { cn } from "@/lib/utils";

/** Opportunity-owned selection defaults — hidden engine inputs (not shown in UI). */
const OPPORTUNITY_CITY = "Pune";
const OPPORTUNITY_PRODUCT_REF = "product:home-loan";

function seedLifeContactsIfEmpty() {
  if (getLifeRegistrySnapshot().contacts.length > 0) return;

  const seeds = [
    {
      contactCode: "LIFE-HDFC-EXE-001",
      contactName: "Priya Sharma",
      mobile: "9876500001",
      email: "priya.sharma@hdfc.demo",
      lenderRef: "lender:hdfc",
      lenderName: "HDFC Bank",
      branchRef: "branch:hdfc-pune",
      branchName: "Pune Camp",
      city: "Pune",
      productRefs: ["product:home-loan"],
      businessMappingRefs: ["mapping:west"],
      roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR, LIFE_CONTACT_ROLES.RELATIONSHIP_MANAGER],
      reportingManagerRef: "employee:mgr-hdfc-01",
      reportingManagerName: "Anil Mehta",
      reportingHierarchy: ["Priya Sharma", "Anil Mehta", "West Zonal Head"],
    },
    {
      contactCode: "LIFE-HDFC-EXE-002",
      contactName: "Vikram Joshi",
      mobile: "9876500011",
      email: "vikram.joshi@hdfc.demo",
      lenderRef: "lender:hdfc",
      lenderName: "HDFC Bank",
      branchRef: "branch:hdfc-pune-koregaon",
      branchName: "Koregaon Park",
      city: "Pune",
      productRefs: ["product:home-loan", "product:lap"],
      businessMappingRefs: ["mapping:west"],
      roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR],
      reportingManagerRef: "employee:mgr-hdfc-01",
      reportingManagerName: "Anil Mehta",
      reportingHierarchy: ["Vikram Joshi", "Anil Mehta", "West Zonal Head"],
    },
    {
      contactCode: "LIFE-ICICI-EXE-001",
      contactName: "Rahul Verma",
      mobile: "9876500002",
      email: "rahul.verma@icici.demo",
      lenderRef: "lender:icici",
      lenderName: "ICICI Bank",
      branchRef: "branch:icici-pune",
      branchName: "Baner",
      city: "Pune",
      productRefs: ["product:home-loan", "product:lap"],
      businessMappingRefs: ["mapping:west"],
      roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR],
      reportingManagerRef: "employee:mgr-icici-01",
      reportingManagerName: "Sneha Kapoor",
      reportingHierarchy: ["Rahul Verma", "Sneha Kapoor", "Regional Credit Head"],
    },
    {
      contactCode: "LIFE-ICICI-EXE-002",
      contactName: "Neha Kulkarni",
      mobile: "9876500012",
      email: "neha.kulkarni@icici.demo",
      lenderRef: "lender:icici",
      lenderName: "ICICI Bank",
      branchRef: "branch:icici-pune-hinjewadi",
      branchName: "Hinjewadi",
      city: "Pune",
      productRefs: ["product:home-loan"],
      businessMappingRefs: ["mapping:west"],
      roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR],
      reportingManagerRef: "employee:mgr-icici-01",
      reportingManagerName: "Sneha Kapoor",
      reportingHierarchy: ["Neha Kulkarni", "Sneha Kapoor", "Regional Credit Head"],
    },
    {
      contactCode: "LIFE-SBI-EXE-001",
      contactName: "Kavita Nair",
      mobile: "9876500003",
      email: "kavita.nair@sbi.demo",
      lenderRef: "lender:sbi",
      lenderName: "State Bank of India",
      branchRef: "branch:sbi-mumbai",
      branchName: "Andheri",
      city: "Mumbai",
      productRefs: ["product:home-loan"],
      businessMappingRefs: ["mapping:west"],
      roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR],
      reportingManagerRef: "employee:mgr-sbi-01",
      reportingManagerName: "Ravi Desai",
      reportingHierarchy: ["Kavita Nair", "Ravi Desai"],
    },
    {
      contactCode: "LIFE-SBI-EXE-002",
      contactName: "Amit Patil",
      mobile: "9876500013",
      email: "amit.patil@sbi.demo",
      lenderRef: "lender:sbi",
      lenderName: "State Bank of India",
      branchRef: "branch:sbi-pune",
      branchName: "Shivajinagar",
      city: "Pune",
      productRefs: ["product:home-loan"],
      businessMappingRefs: ["mapping:west"],
      roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR],
      reportingManagerRef: "employee:mgr-sbi-01",
      reportingManagerName: "Ravi Desai",
      reportingHierarchy: ["Amit Patil", "Ravi Desai"],
    },
  ] as const;

  for (const s of seeds) {
    registerLifeLenderContact({
      ...s,
      roles: [...s.roles],
      productRefs: [...s.productRefs],
      businessMappingRefs: [...s.businessMappingRefs],
      reportingHierarchy: [...s.reportingHierarchy],
      lenderExecutor: true,
      activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
      createdBy: "system",
    });
  }
}

function designationFromRoles(roles: string[]): string {
  if (roles.includes(LIFE_CONTACT_ROLES.RELATIONSHIP_MANAGER)) return "Relationship Manager";
  if (roles.includes("credit")) return "Credit Officer";
  if (roles.includes("operations")) return "Processing Officer";
  return "Lender Contact";
}

function productDisplayLabel(ref: string): string {
  return ref.replace(/^product:/, "").replace(/-/g, " ");
}

export function WorkspaceLifePanel() {
  const {
    opportunityId,
    refresh,
    refreshKey,
    selectedLender,
    setSelectedLender,
    intelligence,
    productLabel,
    lastPlaceholderStatus,
  } = useOpportunityWorkspace();
  const [results, setResults] = useState<LifeLenderSelectionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [assignConfirmation, setAssignConfirmation] = useState<string[] | null>(null);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [probFlash, setProbFlash] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => {
    seedLifeContactsIfEmpty();
  }, []);

  const lifeState = useMemo(
    () => (opportunityId ? getLifePlaceholderState(opportunityId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opportunityId, refreshKey],
  );

  const successProbability = Math.max(
    5,
    Math.min(98, Math.round((intelligence?.health.score ?? 70) * 0.92)),
  );

  const syncUi = () => {
    bump((n) => n + 1);
    refresh();
  };

  const loadInstitutions = () => {
    if (!opportunityId) return;
    setError(null);
    try {
      placeholderOpenLifeSelector(opportunityId);
      const byId = new Map<string, LifeLenderSelectionResult>();
      for (const city of [OPPORTUNITY_CITY, "Mumbai", "Delhi"]) {
        try {
          for (const r of selectLifeLenderExecutors({
            productRef: OPPORTUNITY_PRODUCT_REF,
            city,
            businessMappingRef: "mapping:west",
            requireActive: true,
          })) {
            byId.set(r.contact.id, r);
          }
        } catch {
          /* no matches for city */
        }
      }
      if (byId.size === 0) {
        for (const contact of getLifeRegistrySnapshot().contacts) {
          if (!contact.lenderExecutor || !contact.enabled) continue;
          if (contact.activeStatus !== LIFE_ACTIVE_STATUS.ACTIVE) continue;
          byId.set(contact.id, {
            contact,
            lenderRef: contact.lenderRef,
            lenderName: contact.lenderName,
            branchRef: contact.branchRef,
            branchName: contact.branchName,
            reportingHierarchy: contact.reportingHierarchy,
            reportingManagerRef: contact.reportingManagerRef,
            reportingManagerName: contact.reportingManagerName,
            selectionReason: `Registry · ${contact.lenderName}`,
            recommendationScore: 50 + contact.productRefs.length,
          });
        }
      }
      setResults([...byId.values()]);
      syncUi();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load institutions");
    }
  };

  useEffect(() => {
    if (!opportunityId) return;
    if (getQuickIntent(opportunityId) !== "open_life_selector") return;
    placeholderConsumeQuickIntent(opportunityId);
    loadInstitutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey]);

  const institutions = useMemo(() => {
    const aggregated = aggregateLifeInstitutions(results);
    const q = (lifeState?.search ?? "").trim().toLowerCase();
    return aggregated
      .map((inst, index) => {
        const enrich = placeholderEnrichLifeResult({
          productRefs: inst.productRefs,
          targetProductRef: OPPORTUNITY_PRODUCT_REF,
          recommended: index === 0,
          index,
        });
        return { ...inst, ...enrich, recommended: index === 0 };
      })
      .filter((inst) => {
        if (!q) return true;
        const hay = `${inst.lenderName} ${inst.cities.join(" ")} ${inst.branchNames.join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (b.successProbability ?? 0) - (a.successProbability ?? 0));
  }, [results, lifeState?.search]);

  const contactsForInstitution = useMemo(() => {
    const lenderRef = lifeState?.institution?.lenderRef;
    if (!lenderRef) return [];
    const q = (lifeState?.search ?? "").trim().toLowerCase();
    const fromRegistry = getLifeRegistrySnapshot()
      .contacts.filter(
        (c) =>
          c.lenderRef === lenderRef &&
          c.lenderExecutor &&
          c.enabled &&
          c.activeStatus === LIFE_ACTIVE_STATUS.ACTIVE,
      )
      .map(
        (contact): LifeLenderSelectionResult => ({
          contact,
          lenderRef: contact.lenderRef,
          lenderName: contact.lenderName,
          branchRef: contact.branchRef,
          branchName: contact.branchName,
          reportingHierarchy: contact.reportingHierarchy,
          reportingManagerRef: contact.reportingManagerRef,
          reportingManagerName: contact.reportingManagerName,
          selectionReason: `Contact at ${contact.lenderName}`,
          recommendationScore: 50 + contact.productRefs.length,
        }),
      );

    const byId = new Map<string, LifeLenderSelectionResult>();
    for (const r of [...results.filter((x) => x.lenderRef === lenderRef), ...fromRegistry]) {
      byId.set(r.contact.id, r);
    }

    return [...byId.values()]
      .filter((r) => {
        if (!q) return true;
        const hay = `${r.contact.contactName} ${r.branchName ?? ""} ${r.reportingManagerName ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, lifeState?.institution?.lenderRef, lifeState?.search, refreshKey]);

  const onSelectInstitution = (inst: (typeof institutions)[number], index: number) => {
    if (!opportunityId) return;
    const payload: PlaceholderLifeInstitution = {
      lenderRef: inst.lenderRef,
      lenderName: inst.lenderName,
      productRefs: inst.productRefs,
      businessMappingRefs: inst.businessMappingRefs,
      cities: inst.cities,
      branchNames: inst.branchNames,
      executorCount: inst.executorCount,
      recommended: index === 0 || inst.recommended,
      productCompatible: inst.productCompatible,
      eligibility: inst.eligibility,
      eligibilityNote: inst.eligibilityNote,
      successProbability: inst.successProbability,
    };
    placeholderSelectLifeInstitution(opportunityId, payload);
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType: "workflow",
      title: "Lender institution chosen",
      description: `${payload.lenderName} · next: choose lender contact`,
      actorId: "workspace",
      expandablePayload: {
        lenderRef: payload.lenderRef,
        step: "institution",
        source: "opportunity-workspace-life",
      },
    });
    syncUi();
  };

  const onChooseContact = (
    result: LifeLenderSelectionResult,
    recommended: boolean,
    index: number,
  ) => {
    if (!opportunityId || !lifeState?.institution) return;
    const enrich = placeholderEnrichLifeResult({
      productRefs: result.contact.productRefs ?? lifeState.institution.productRefs,
      targetProductRef: OPPORTUNITY_PRODUCT_REF,
      recommended,
      index,
    });
    placeholderSetLifeDraft(opportunityId, {
      lenderName: lifeState.institution.lenderName,
      executorName: result.contact.contactName,
      branchName: result.branchName,
      reportingManagerName: result.reportingManagerName,
      recommended: recommended || lifeState.institution.recommended,
      successProbability:
        enrich.successProbability ?? lifeState.institution.successProbability,
      contactId: result.contact.id,
      lenderRef: lifeState.institution.lenderRef,
      productRefs: lifeState.institution.productRefs,
      businessMappingRefs: lifeState.institution.businessMappingRefs,
      productCompatible:
        enrich.productCompatible ?? lifeState.institution.productCompatible,
      eligibility: enrich.eligibility ?? lifeState.institution.eligibility,
      eligibilityNote: enrich.eligibilityNote ?? lifeState.institution.eligibilityNote,
    });
    syncUi();
  };

  const onAssign = () => {
    if (!opportunityId) return;
    const saved = placeholderSaveLifeSelection(opportunityId);
    if (!saved) {
      syncUi();
      return;
    }
    setSelectedLender({
      lenderName: saved.lenderName,
      executorName: saved.executorName,
      branchName: saved.branchName,
      reportingManagerName: saved.reportingManagerName,
      recommended: saved.recommended,
      successProbability: saved.successProbability,
      productRefs: saved.productRefs,
      businessMappingRefs: saved.businessMappingRefs,
      productCompatible: saved.productCompatible,
      eligibility: saved.eligibility,
      eligibilityNote: saved.eligibilityNote,
    });
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType: "workflow",
      title: "Lender assigned",
      description: `${saved.executorName} · ${saved.lenderName}${
        saved.branchName ? ` · ${saved.branchName}` : ""
      } · success ${saved.successProbability ?? "—"}%`,
      actorId: "workspace",
      expandablePayload: {
        contactId: saved.contactId,
        lenderRef: saved.lenderRef,
        step: "assign",
        chanakya: getChanakyaLenderAssignmentMessage(saved.lenderName),
        source: "opportunity-workspace-life",
      },
    });
    setAssignConfirmation([
      `${saved.lenderName} assigned successfully.`,
      `Relationship Manager / Contact: ${saved.executorName}.`,
      "Timeline updated.",
      "Opportunity synchronized.",
    ]);
    setProbFlash(true);
    window.setTimeout(() => setProbFlash(false), 1600);
    setCompareOpen(false);
    setReplaceConfirmOpen(false);
    syncUi();
  };

  const onCancel = () => {
    if (!opportunityId) return;
    placeholderCancelLifeSelection(opportunityId);
    setResults([]);
    setAssignConfirmation(null);
    setCompareOpen(false);
    setReplaceConfirmOpen(false);
    syncUi();
  };

  const onReplaceConfirmed = () => {
    if (!opportunityId) return;
    setSelectedLender(null);
    setAssignConfirmation(null);
    placeholderReplaceLifeSelection(opportunityId);
    setReplaceConfirmOpen(false);
    setProbFlash(true);
    window.setTimeout(() => setProbFlash(false), 1600);
    loadInstitutions();
  };

  const draft = lifeState?.draft;
  const institution = lifeState?.institution;
  const display = selectedLender ?? draft;
  const step = lifeState?.step ?? "institution";
  const selectorOpen = Boolean(lifeState?.selectorOpen || results.length > 0);
  const contactChosen = Boolean(draft?.executorName);
  const assigned = Boolean(lifeState?.saved && selectedLender);

  const comparisonRows = useMemo(
    () =>
      buildLifeComparisonRows(
        institutions.map((inst, index) => ({
          lenderRef: inst.lenderRef,
          lenderName: inst.lenderName,
          successProbability: inst.successProbability,
          eligibility: inst.eligibility,
          index,
        })),
      ),
    [institutions],
  );

  const displayedProbability =
    display?.successProbability ??
    institution?.successProbability ??
    successProbability;

  const activeStep: 1 | 2 | 3 = assigned
    ? 3
    : contactChosen
      ? 3
      : step === "executor" && institution
        ? 2
        : 1;

  return (
    <OwGlassPanel className="h-full">
      <OwPanelHeader
        title="LIFE · Lender"
        badge="LIFE"
        description="Assign one lender institution and one contact to this opportunity"
      />

      {/* Case context chips removed (CF-LIFE-001) — engine inputs stay hidden. */}

      {/* Lightweight step indicator */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px]">
        <StepPill n={1} label="Choose Lender Institution" active={activeStep === 1} done={activeStep > 1} />
        <span className="text-muted-foreground">→</span>
        <StepPill n={2} label="Choose Lender Contact" active={activeStep === 2} done={activeStep > 2} />
        <span className="text-muted-foreground">→</span>
        <StepPill n={3} label="Assign" active={activeStep === 3 && !assigned} done={assigned} />
      </div>

      {/* Post-assignment confirmation */}
      {assignConfirmation && assigned && (
        <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Assignment complete
          </p>
          <ul className="space-y-1 text-[11px] text-emerald-800 dark:text-emerald-100">
            {assignConfirmation.map((line) => (
              <li key={line}>✓ {line}</li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">
            What next: continue documents, tasks, or stage progression on this opportunity.
          </p>
        </div>
      )}

      {/* Current assignment summary */}
      <div className="mb-4 grid gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
        <Row label="Selected Lender" value={display?.lenderName ?? institution?.lenderName ?? "Not selected"} />
        <Row label="Recommended" value={display?.recommended || institution?.recommended ? "Yes" : display || institution ? "No" : "—"} />
        <Row label="Lender Contact" value={display?.executorName ?? "—"} />
        <Row label="Reporting Manager" value={display?.reportingManagerName ?? "—"} />
        <Row label="Branch" value={display?.branchName ?? "—"} />
        <div className="flex justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Success Probability</span>
          <span
            key={displayedProbability}
            className={cn(
              "font-semibold tabular-nums transition-all duration-500",
              probFlash
                ? "scale-110 text-teal-600 dark:text-teal-300"
                : "text-foreground",
            )}
          >
            {displayedProbability}%
          </span>
        </div>
        <Row
          label="Status"
          value={
            assigned
              ? "Assigned"
              : contactChosen
                ? "Contact chosen — press Assign Lender"
                : institution
                  ? "Institution chosen — select a contact"
                  : "Not started"
          }
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {!selectorOpen && !assigned && (
          <Button size="sm" onClick={loadInstitutions}>
            Start · Choose Lender Institution
          </Button>
        )}
        {!selectorOpen && assigned && !replaceConfirmOpen && (
          <Button size="sm" variant="secondary" onClick={() => setReplaceConfirmOpen(true)}>
            Replace Lender
          </Button>
        )}
        {selectorOpen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (!opportunityId) return;
              placeholderCloseLifeSelector(opportunityId);
              syncUi();
            }}
          >
            Close
          </Button>
        )}
      </div>

      {/* Replace confirmation */}
      {replaceConfirmOpen && (
        <div className="mb-3 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-[11px] font-medium text-foreground">Replace lender?</p>
          <p className="text-[10px] text-muted-foreground">Changing the lender will:</p>
          <ul className="space-y-0.5 text-[10px] text-muted-foreground">
            <li>• Remove the existing assignment</li>
            <li>• Reset lender-specific recommendations</li>
            <li>• Recalculate success probability</li>
            <li>• Preserve customer information</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onReplaceConfirmed}>
              Confirm Replace
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setReplaceConfirmOpen(false)}
            >
              Keep Current Lender
            </Button>
          </div>
        </div>
      )}

      {selectorOpen && (
        <div className="space-y-3">
          <Input
            value={lifeState?.search ?? ""}
            placeholder={
              step === "executor"
                ? "Search contacts by name or branch…"
                : "Search institutions…"
            }
            className="h-8 text-xs"
            onChange={(e) => {
              if (!opportunityId) return;
              placeholderSetLifeSearch(opportunityId, e.target.value);
              bump((n) => n + 1);
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* STEP 1 — Institutions */}
          {step === "institution" && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium text-foreground">
                    Step 1 — Choose the lender institution for this opportunity
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Review why each lender is recommended, compare if needed, then select one.
                  </p>
                </div>
                {institutions.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setCompareOpen((v) => !v)}
                  >
                    {compareOpen ? "Hide comparison" : "Compare lenders"}
                  </Button>
                )}
              </div>

              {compareOpen && comparisonRows.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-teal-500/20 bg-teal-500/5 p-2">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Comparison · shortlisted institutions
                  </p>
                  <table className="w-full min-w-[28rem] text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-white/10 text-muted-foreground">
                        <th className="py-1 pr-2 font-medium">Metric</th>
                        {comparisonRows.map((r) => (
                          <th key={r.lenderRef} className="py-1 px-1 font-medium">
                            {r.lenderName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ["Interest range", "interestRange"],
                          ["Processing time", "processingTime"],
                          ["Eligibility score", "eligibilityScore"],
                          ["Success probability", "successProbability"],
                          ["Document complexity", "documentComplexity"],
                          ["Processing speed", "processingSpeed"],
                          ["Relationship strength", "relationshipStrength"],
                        ] as const
                      ).map(([label, key]) => (
                        <tr key={key} className="border-b border-white/5">
                          <td className="py-1 pr-2 text-muted-foreground">{label}</td>
                          {comparisonRows.map((r) => (
                            <td key={`${r.lenderRef}-${key}`} className="py-1 px-1 font-medium">
                              {key === "successProbability"
                                ? `${r.successProbability}%`
                                : r[key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {institutions.map((inst, index) => {
                const reasons = getLifeRecommendationReasons({
                  lenderName: inst.lenderName,
                  index,
                  recommended: Boolean(inst.recommended),
                  productCompatible: inst.productCompatible,
                  successProbability: inst.successProbability,
                });
                return (
                  <div
                    key={inst.lenderRef}
                    className="rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-3 dark:border-white/10 dark:bg-zinc-950/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-2">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-teal-500/10 text-[10px] font-bold uppercase text-teal-700 dark:text-teal-200"
                          aria-hidden
                        >
                          {inst.lenderName
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{inst.lenderName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Eligibility: {inst.eligibility ?? "—"}
                            {inst.eligibilityNote ? ` · ${inst.eligibilityNote}` : ""}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Coverage: {inst.cities.join(", ") || "—"} · Branches:{" "}
                            {inst.branchNames.length
                              ? inst.branchNames.slice(0, 3).join(", ")
                              : "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Contacts available: {inst.executorCount}
                          </p>
                          <div className="mt-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5">
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                              Recommended because
                            </p>
                            <ul className="mt-0.5 space-y-0.5 text-[10px] text-foreground">
                              {reasons.map((reason) => (
                                <li key={reason}>✓ {reason}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      {inst.recommended && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                          Recommended
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2 h-7 text-xs"
                      onClick={() => {
                        setProbFlash(true);
                        window.setTimeout(() => setProbFlash(false), 1200);
                        onSelectInstitution(inst, index);
                      }}
                    >
                      Select Institution
                    </Button>
                  </div>
                );
              })}
              {institutions.length === 0 && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs">
                  <p className="font-medium text-foreground">
                    No lender currently satisfies this Opportunity.
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Please modify filters or continue manually. Customer information is preserved.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Contacts for selected institution only */}
          {step === "executor" && institution && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium text-foreground">
                    Step 2 — Choose lender contact at {institution.lenderName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    This lender has the following relationship managers / credit officers.
                    Only contacts from {institution.lenderName} are shown.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (!opportunityId) return;
                    placeholderBackToLifeInstitution(opportunityId);
                    syncUi();
                  }}
                >
                  Change Institution
                </Button>
              </div>

              {contactsForInstitution.map((r, index) => {
                const selected = draft?.contactId === r.contact.id;
                const designation = designationFromRoles(r.contact.roles);
                return (
                  <div
                    key={r.contact.id}
                    className={cn(
                      "rounded-xl border p-3",
                      selected
                        ? "border-teal-500/50 bg-teal-500/10 ring-1 ring-teal-400/40"
                        : "border-zinc-200/70 bg-zinc-50/50 dark:border-white/10 dark:bg-zinc-950/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium">{r.contact.contactName}</p>
                        <p className="text-[10px] text-muted-foreground">{designation}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Branch: {r.branchName ?? "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Reporting Manager: {r.reportingManagerName ?? "—"}
                        </p>
                        {index === 0 && (
                          <p className="text-[10px] font-medium text-teal-700 dark:text-teal-300">
                            Recommended
                          </p>
                        )}
                      </div>
                      {index === 0 && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                          Recommended
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={selected ? "default" : "secondary"}
                      className="mt-2 h-7 text-xs"
                      onClick={() => onChooseContact(r, index === 0, index)}
                    >
                      {selected ? "Selected" : `Choose ${designation}`}
                    </Button>
                  </div>
                );
              })}
              {contactsForInstitution.length === 0 && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs">
                  <p className="font-medium">No lender contacts available for this institution.</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Change institution or continue manually.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Assign (commit only) */}
          <div className="space-y-2 border-t border-white/10 pt-3">
            <p className="text-[11px] font-medium text-foreground">Step 3 — Assign</p>
            <p className="text-[10px] text-muted-foreground">
              {contactChosen
                ? `Ready to assign ${draft?.executorName} at ${draft?.lenderName}. This updates Opportunity Summary, Timeline, and CHANAKYA.`
                : "Choose a lender contact above to enable Assign Lender."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onAssign} disabled={!contactChosen}>
                Assign Lender
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {(lastPlaceholderStatus || assigned) && !assignConfirmation && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {assigned
            ? `Assigned · ${selectedLender?.lenderName} · ${selectedLender?.executorName}`
            : lastPlaceholderStatus}
        </p>
      )}
    </OwGlassPanel>
  );
}

function StepPill({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide",
        done && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        active && !done && "border-teal-500/50 bg-teal-500/15 text-teal-800 dark:text-teal-200",
        !active && !done && "border-border text-muted-foreground",
      )}
    >
      Step {n} · {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
