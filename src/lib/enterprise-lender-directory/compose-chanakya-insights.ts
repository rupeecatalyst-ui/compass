/**
 * CO-LENDER-WORKSPACE-001 — Honest Chanakya insights from Directory SSOTs.
 * No fabricated success %, no Radar formula invention.
 */

import type { EnterpriseLenderDirectoryRow } from "@/types/enterprise-lender-directory-ops";
import type { EldLenderEmployeeRow } from "@/types/enterprise-lender-directory-ops";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type EldLenderChanakyaInsight = {
  id: string;
  headline: string;
  body: string;
  source: "directory" | "programs" | "employees" | "deals";
};

function isMissing(label: string | null | undefined): boolean {
  const v = (label ?? "").trim();
  return !v || v === "Not Specified" || v === "Not available";
}

/** Derive advisory bullets only from observed directory / program / employee facts. */
export function composeEldLenderChanakyaInsights(input: {
  row: EnterpriseLenderDirectoryRow;
  employees: EldLenderEmployeeRow[];
  programs: EnterpriseLenderProgramRecord[];
}): EldLenderChanakyaInsight[] {
  const out: EldLenderChanakyaInsight[] = [];
  const { row, employees, programs } = input;

  if (employees.length === 0) {
    out.push({
      id: "no-employees",
      headline: "Relationship coverage is incomplete",
      body: "No lender employees are linked to this institution in Enterprise Contact Registry. Assign or create employees before relying on hierarchy-driven follow-ups.",
      source: "employees",
    });
  } else {
    const withoutManager = employees.filter(
      (e) => !e.reportingManagerContactId || e.reportingManagerName === "Not Specified",
    ).length;
    if (withoutManager > 0) {
      out.push({
        id: "reports-to-gaps",
        headline: `${withoutManager} employee(s) lack a reporting manager`,
        body: "Hierarchy is derived from reports_to. Set reporting managers so escalation paths stay accurate.",
        source: "employees",
      });
    }
  }

  if (programs.length === 0) {
    out.push({
      id: "no-programs",
      headline: "No published product programmes",
      body: "Configure Product Programs (commercials, FOIR, DBR, policy reference, documents) so Lender Pipeline can resolve eligibility for this institution.",
      source: "programs",
    });
  } else {
    const missingPolicy = programs.filter((p) => !p.creditRiskPolicyRef?.trim()).length;
    if (missingPolicy > 0) {
      out.push({
        id: "policy-gaps",
        headline: `${missingPolicy} programme(s) missing Credit & Risk policy reference`,
        body: "Policy remains authoritative in CRE/EPDE. Map a published policy on each programme before credit resolution is expected.",
        source: "programs",
      });
    }
    const missingFoir = programs.filter((p) => p.maxFoirPercent == null).length;
    if (missingFoir > 0) {
      out.push({
        id: "foir-gaps",
        headline: `${missingFoir} programme(s) without FOIR`,
        body: "FOIR is part of programme commercial / eligibility configuration. Capture Max FOIR % where the lender publishes it.",
        source: "programs",
      });
    }
  }

  if (row.activeDeals === 0 && row.activeOpportunities === 0) {
    out.push({
      id: "no-pipeline",
      headline: "No active Deals or Opportunities linked in Directory metrics",
      body: "Directory counts come from Enterprise Deal Registry projections. Empty here means no current lender-linked pipeline — not a system failure.",
      source: "deals",
    });
  }

  if (isMissing(row.homeLoanRoiLabel) && isMissing(row.balanceTransferRoiLabel)) {
    out.push({
      id: "roi-unavailable",
      headline: "ROI not available from published programmes",
      body: "Home Loan / BT ROI labels remain Not available until programme commercials publish ROI for this lender.",
      source: "directory",
    });
  }

  return out;
}
