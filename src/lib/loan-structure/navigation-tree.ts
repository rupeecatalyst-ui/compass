/**
 * Loan Structure navigation tree — hierarchy for the slide-over drawer.
 * Display + navigation targets only; does not invent new workflows.
 */

import type { LoanFile } from "@/types/catalyst-one";
import type { LoanParticipant } from "@/types/loan-participant";
import { formatINR } from "@/lib/format-currency";
import { getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";

export type LoanStructureNavTarget =
  | { type: "borrower" }
  | { type: "borrower_section"; section: "identity" | "contact" | "employment" }
  | { type: "co_applicant"; participantId: string }
  | { type: "guarantor"; participantId: string }
  | { type: "property"; index: number }
  | { type: "income" }
  | { type: "banking" }
  | { type: "lender"; lenderCaseId?: string }
  | { type: "documents" }
  | { type: "timeline" }
  | { type: "add"; entity: "property" | "co_applicant" | "guarantor" | "lender" };

export interface LoanStructureTreeNode {
  id: string;
  label: string;
  /** Optional secondary line. */
  hint?: string;
  children?: LoanStructureTreeNode[];
  /** When set, node navigates on click. Group headers may omit. */
  target?: LoanStructureNavTarget;
  /** Show [+] on this group. */
  addAction?: LoanStructureNavTarget;
  /** Default expanded when first opened. */
  defaultExpanded?: boolean;
}

export interface LoanStructureSummary {
  borrowerName: string;
  product: string;
  amountLabel: string;
  stageLabel: string;
  activeLenderCount: number;
  propertyCount: number;
  coApplicantCount: number;
  guarantorCount: number;
}

function activeLenders(file: LoanFile) {
  return (file.lenders ?? []).filter((l) => l.status === "active");
}

function coApplicants(participants: LoanParticipant[]) {
  return participants.filter(
    (p) => p.status !== "inactive" && (p.role === "co_applicant" || (!p.role && p.entityType === "individual")),
  );
}

function guarantors(participants: LoanParticipant[]) {
  return participants.filter((p) => p.status !== "inactive" && p.role === "guarantor");
}

function propertyCount(file: LoanFile, participants: LoanParticipant[]): number {
  const owners = [
    file.primaryPropertyOwner ? 1 : 0,
    ...participants.filter((p) => p.status !== "inactive" && p.isPropertyOwner).map(() => 1),
  ].reduce((a, b) => a + b, 0);
  if (owners > 0) return owners;
  return file.propertyType || file.approxPropertyValue ? 1 : 0;
}

export function buildLoanStructureSummary(
  file: LoanFile,
  participants: LoanParticipant[],
): LoanStructureSummary {
  const cos = coApplicants(participants);
  const guars = guarantors(participants);
  return {
    borrowerName: file.customerName || "Borrower",
    product: file.loanProduct || "—",
    amountLabel: formatINR(file.requiredAmount || file.loanAmount || 0),
    stageLabel: getJourneyStageDisplayLabel(file.stage) || file.stage || "—",
    activeLenderCount: activeLenders(file).length,
    propertyCount: propertyCount(file, participants),
    coApplicantCount: cos.length,
    guarantorCount: guars.length,
  };
}

export function buildLoanStructureNavigationTree(
  file: LoanFile,
  participants: LoanParticipant[],
): LoanStructureTreeNode[] {
  const cos = coApplicants(participants);
  const guars = guarantors(participants);
  const lenders = activeLenders(file);
  const props = propertyCount(file, participants);

  const propertyChildren: LoanStructureTreeNode[] =
    props > 0
      ? Array.from({ length: props }, (_, i) => ({
          id: `property-${i}`,
          label: props === 1 && file.propertyType ? file.propertyType : `Property ${i + 1}`,
          hint: file.approxPropertyValue && i === 0 ? formatINR(file.approxPropertyValue) : undefined,
          target: { type: "property", index: i },
        }))
      : [];

  return [
    {
      id: "borrower",
      label: "Borrower",
      hint: file.customerName,
      defaultExpanded: true,
      target: { type: "borrower" },
      children: [
        {
          id: "borrower-identity",
          label: "Identity",
          target: { type: "borrower_section", section: "identity" },
        },
        {
          id: "borrower-contact",
          label: "Contact",
          target: { type: "borrower_section", section: "contact" },
        },
        {
          id: "borrower-employment",
          label: "Employment",
          target: { type: "borrower_section", section: "employment" },
        },
      ],
    },
    {
      id: "co-applicants",
      label: "Co-Applicants",
      hint: cos.length ? `${cos.length}` : "None",
      defaultExpanded: cos.length > 0,
      addAction: { type: "add", entity: "co_applicant" },
      children: cos.map((p, i) => ({
        id: `co-${p.id}`,
        label: p.name || `Applicant ${i + 1}`,
        hint: p.relationship,
        target: { type: "co_applicant", participantId: p.id },
      })),
    },
    {
      id: "guarantors",
      label: "Guarantors",
      hint: guars.length ? `${guars.length}` : "None",
      defaultExpanded: guars.length > 0,
      addAction: { type: "add", entity: "guarantor" },
      children: guars.map((p, i) => ({
        id: `guar-${p.id}`,
        label: p.name || `Guarantor ${i + 1}`,
        target: { type: "guarantor", participantId: p.id },
      })),
    },
    {
      id: "properties",
      label: "Properties",
      hint: props ? `${props}` : "None",
      defaultExpanded: props > 0,
      addAction: { type: "add", entity: "property" },
      children: propertyChildren,
    },
    {
      id: "income",
      label: "Income Sources",
      target: { type: "income" },
    },
    {
      id: "banking",
      label: "Banking Relationships",
      target: { type: "banking" },
    },
    {
      id: "lenders",
      label: "Active Lenders",
      hint: lenders.length ? `${lenders.length}` : "None",
      defaultExpanded: true,
      addAction: { type: "add", entity: "lender" },
      children: lenders.map((l) => ({
        id: `lender-${l.id}`,
        label: l.lender || "Lender",
        hint: l.caseStage?.replace(/_/g, " "),
        target: { type: "lender", lenderCaseId: l.id },
      })),
    },
    {
      id: "documents",
      label: "Documents",
      target: { type: "documents" },
    },
    {
      id: "timeline",
      label: "Timeline",
      target: { type: "timeline" },
    },
  ];
}

/** Instant client-side filter — keeps ancestors of matching leaves. */
export function filterLoanStructureTree(
  nodes: LoanStructureTreeNode[],
  query: string,
): LoanStructureTreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const walk = (node: LoanStructureTreeNode): LoanStructureTreeNode | null => {
    const selfMatch =
      node.label.toLowerCase().includes(q) ||
      (node.hint?.toLowerCase().includes(q) ?? false);
    const kids = (node.children ?? [])
      .map(walk)
      .filter(Boolean) as LoanStructureTreeNode[];
    if (selfMatch || kids.length > 0) {
      return { ...node, children: kids.length ? kids : node.children };
    }
    return null;
  };

  return nodes.map(walk).filter(Boolean) as LoanStructureTreeNode[];
}
