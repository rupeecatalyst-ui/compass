/**
 * Loan Structure — relationship map helpers (display + ownership summary).
 */

import type { LoanFile, LoanFileBusiness } from "@/types/catalyst-one";
import type { LoanParticipant, LoanParticipantRole } from "@/types/loan-participant";
import { LOAN_PARTICIPANT_ROLE_LABELS } from "@/types/loan-participant";
import { getContextAwareVisibility, resolveContextCustomerCategory } from "@/lib/context-aware-data-collection";
import { getEcmContact } from "@/lib/enterprise-contact-master";
import { formatINR } from "@/lib/format-currency";

export type LoanStructureNodeKind = "primary" | "participant";

export interface LoanStructureNode {
  key: string;
  kind: LoanStructureNodeKind;
  participantId?: string;
  name: string;
  role: LoanParticipantRole;
  roleLabel: string;
  entityType: "individual" | "company";
  categoryLabel: string;
  metricLabel: string;
  metricValue: string;
  kycLabel: string;
  kycComplete: boolean;
  isPropertyOwner: boolean;
  ownershipPercentage?: number;
  accent: string;
}

const ROLE_ACCENT: Record<LoanParticipantRole, string> = {
  primary_applicant: "#22C55E",
  co_applicant: "#F59E0B",
  guarantor: "#3B82F6",
  company: "#64748B",
  other: "#94A3B8",
};

function categoryDisplay(employment?: string | null, entityType?: string): string {
  if (entityType === "company") return "Private Limited Company";
  const cat = resolveContextCustomerCategory(employment);
  switch (cat) {
    case "salaried":
    case "nri":
      return "Salaried";
    case "self_employed_professional":
      return "Professional";
    case "self_employed_business":
      return "Business";
    default:
      return employment?.trim() || "Individual";
  }
}

/** Context-aware primary financial metric for structure cards. */
export function resolveFinancialMetric(
  employment?: string | null,
  business?: LoanFileBusiness | null,
  entityType?: "individual" | "company",
): { label: string; value: string } {
  if (entityType === "company") {
    const v = business?.annualTurnover;
    return {
      label: "Annual Turnover",
      value: v ? formatINR(v) : "—",
    };
  }

  const cat = resolveContextCustomerCategory(employment);
  const ctx = getContextAwareVisibility(employment);

  if (ctx.isSalariedFamily) {
    const salary = business?.monthlySalary;
    return {
      label: "Monthly Salary",
      value: salary
        ? `${formatINR(salary)} / mo`
        : salary === 0
          ? "—"
          : "—",
    };
  }

  if (cat === "self_employed_professional") {
    const receipts = business?.annualGrossReceipts ?? business?.annualProfessionalIncome;
    return {
      label: "Annual Gross Receipts",
      value: receipts ? formatINR(receipts) : "—",
    };
  }

  if (ctx.isSelfEmployedFamily) {
    const turnover = business?.annualTurnover;
    return {
      label: "Annual Turnover",
      value: turnover ? formatINR(turnover) : "—",
    };
  }

  return { label: "Income", value: "—" };
}

function kycFromContact(entityId?: string): { complete: boolean; label: string } {
  if (!entityId) return { complete: false, label: "⚠ KYC Pending" };
  const contact = getEcmContact(entityId);
  if (!contact) return { complete: false, label: "⚠ KYC Pending" };
  if (contact.status === "verified" || (contact.pan && contact.aadhaar)) {
    return { complete: true, label: "✔ KYC Complete" };
  }
  if (contact.status === "complete" || contact.status === "active") {
    return { complete: Boolean(contact.pan), label: contact.pan ? "✔ KYC Complete" : "⚠ KYC Pending" };
  }
  return { complete: false, label: "⚠ KYC Pending" };
}

function companyKyc(constitution?: string, business?: LoanFileBusiness | null): { complete: boolean; label: string } {
  if (business?.gst) return { complete: true, label: "✔ GST Verified" };
  if (constitution) return { complete: false, label: "⚠ GST Pending" };
  return { complete: false, label: "⚠ GST Pending" };
}

export function buildLoanStructureNodes(
  file: LoanFile,
  participants: LoanParticipant[],
): LoanStructureNode[] {
  const primaryMetric = resolveFinancialMetric(file.employmentType, file.businessDetails, "individual");
  const primaryKyc = kycFromContact(file.customerId);

  const primary: LoanStructureNode = {
    key: "primary",
    kind: "primary",
    name: file.customerName || "Primary Borrower",
    role: "primary_applicant",
    roleLabel: LOAN_PARTICIPANT_ROLE_LABELS.primary_applicant,
    entityType: "individual",
    categoryLabel: categoryDisplay(file.employmentType),
    metricLabel: primaryMetric.label,
    metricValue: primaryMetric.value,
    kycLabel: primaryKyc.label,
    kycComplete: primaryKyc.complete,
    isPropertyOwner: Boolean(file.primaryPropertyOwner),
    ownershipPercentage: file.primaryOwnershipPercentage,
    accent: ROLE_ACCENT.primary_applicant,
  };

  const others: LoanStructureNode[] = participants
    .filter((p) => p.status !== "inactive")
    .map((p) => {
      const role: LoanParticipantRole =
        p.entityType === "company"
          ? "company"
          : p.role === "guarantor"
            ? "guarantor"
            : p.role === "other"
              ? "other"
              : "co_applicant";

      const contact = p.entityId ? getEcmContact(p.entityId) : undefined;
      const employment = contact?.employmentType;
      const metric =
        p.entityType === "company"
          ? resolveFinancialMetric(undefined, file.businessDetails, "company")
          : resolveFinancialMetric(employment, undefined, "individual");

      const kyc =
        p.entityType === "company"
          ? companyKyc(p.constitution, file.businessDetails)
          : kycFromContact(p.entityId);

      return {
        key: p.id,
        kind: "participant" as const,
        participantId: p.id,
        name: p.name || "Unnamed participant",
        role,
        roleLabel:
          p.entityType === "company"
            ? p.constitution || LOAN_PARTICIPANT_ROLE_LABELS.company
            : LOAN_PARTICIPANT_ROLE_LABELS[role],
        entityType: p.entityType,
        categoryLabel:
          p.entityType === "company"
            ? p.constitution || "Company"
            : categoryDisplay(employment, p.entityType),
        metricLabel: metric.label,
        metricValue: metric.value,
        kycLabel: kyc.label,
        kycComplete: kyc.complete,
        isPropertyOwner: Boolean(p.isPropertyOwner),
        ownershipPercentage: p.ownershipPercentage,
        accent: ROLE_ACCENT[role],
      };
    });

  return [primary, ...others];
}

export function listPropertyOwners(nodes: LoanStructureNode[]): { name: string; pct: number }[] {
  return nodes
    .filter((n) => n.isPropertyOwner)
    .map((n) => ({
      name: n.name,
      pct: Math.max(0, Math.min(100, n.ownershipPercentage ?? 0)),
    }));
}

export function totalParticipantCount(file: LoanFile, participants: LoanParticipant[]): number {
  return 1 + participants.filter((p) => p.status !== "inactive").length;
}
