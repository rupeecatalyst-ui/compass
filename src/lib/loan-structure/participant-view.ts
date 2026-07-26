/**
 * Loan Structure Drawer — read-only participant groups (business summary).
 */

import {
  getLoanStructureRole,
  getLoanStructureRoleLabel,
  listLoanStructureGroups,
  type LoanStructureRoleGroup,
} from "@/constants/loan-structure";
import { getEcmContact } from "@/lib/enterprise-contact-master";
import { getEcmCompany } from "@/lib/enterprise-company-master";
import { formatINR } from "@/lib/format-currency";
import type { LoanFile } from "@/types/catalyst-one";
import type { LoanParticipant, LoanParticipantRole } from "@/types/loan-participant";

export type LoanStructureCardKind =
  | "contact"
  | "company"
  | "property"
  | "lender";

export interface LoanStructureParticipantCard {
  id: string;
  kind: LoanStructureCardKind;
  name: string;
  roleCode: string;
  roleLabel: string;
  subtitle?: string;
  badges: string[];
  entityId?: string;
  participantId?: string;
  propertyIndex?: number;
  lenderCaseId?: string;
}

export interface LoanStructureParticipantGroup {
  group: LoanStructureRoleGroup;
  label: string;
  cards: LoanStructureParticipantCard[];
}

function contactBadges(entityId?: string): string[] {
  if (!entityId) return ["KYC Pending"];
  const contact = getEcmContact(entityId);
  if (!contact) return ["KYC Pending"];
  const badges: string[] = [];
  if (contact.status === "verified" || (contact.pan && contact.aadhaar)) {
    badges.push("KYC Verified");
  } else if (contact.status === "complete" || contact.status === "active") {
    badges.push(contact.pan ? "KYC Complete" : "KYC Pending");
  } else {
    badges.push("KYC Pending");
  }
  if (contact.pan) badges.push("PAN Verified");
  return badges;
}

function companyBadges(participant: LoanParticipant, file: LoanFile): string[] {
  const company = participant.entityId ? getEcmCompany(participant.entityId) : undefined;
  const badges: string[] = [];
  if (company?.gst || file.businessDetails?.gst) badges.push("GST Verified");
  else badges.push("GST Pending");
  if (company?.pan || participant.constitution) badges.push("Registry Linked");
  return badges;
}

function resolveRole(p: LoanParticipant): LoanParticipantRole {
  if (p.role === "payee") return "payee";
  if (p.entityType === "company") return "company";
  if (p.role === "guarantor") return "guarantor";
  if (p.role === "income_contributor") return "income_contributor";
  if (p.role === "authorized_signatory") return "authorized_signatory";
  if (p.role === "primary_applicant") return "primary_applicant";
  if (p.role === "other") return "other";
  return "co_applicant";
}

function groupForRole(role: LoanParticipantRole | "property" | "existing_lender"): LoanStructureRoleGroup {
  return getLoanStructureRole(role)?.group ?? "co_applicants";
}

export function buildLoanStructureParticipantGroups(
  file: LoanFile,
  participants: LoanParticipant[],
): LoanStructureParticipantGroup[] {
  const byGroup = new Map<LoanStructureRoleGroup, LoanStructureParticipantCard[]>();

  const push = (group: LoanStructureRoleGroup, card: LoanStructureParticipantCard) => {
    const list = byGroup.get(group) ?? [];
    list.push(card);
    byGroup.set(group, list);
  };

  // Borrower
  push("borrower", {
    id: `borrower:${file.id}`,
    kind: "contact",
    name: file.customerName || "Borrower",
    roleCode: "primary_applicant",
    roleLabel: getLoanStructureRoleLabel("primary_applicant"),
    subtitle: file.customerMobile || undefined,
    badges: contactBadges(file.customerId),
    entityId: file.customerId || undefined,
  });

  // Payee (SSOT on LoanFile — also mirrored as participant role=payee)
  if (file.payeeEntityId && file.payeeName) {
    const isCompany = file.payeeEntityType === "company";
    push("payee", {
      id: `payee:${file.id}`,
      kind: isCompany ? "company" : "contact",
      name: file.payeeName,
      roleCode: "payee",
      roleLabel: "Payee",
      subtitle: isCompany ? "Company payee" : "Individual payee",
      badges: isCompany
        ? ["Disbursement Recipient", "Company"]
        : ["Disbursement Recipient", ...contactBadges(file.payeeEntityId).slice(0, 1)],
      entityId: file.payeeEntityId,
    });
  }

  for (const p of participants.filter((x) => x.status !== "inactive")) {
    const role = resolveRole(p);
    if (role === "payee") continue; // already rendered from LoanFile SSOT
    const roleDef = getLoanStructureRole(role);
    if (p.entityType === "company" || role === "company") {
      push("companies", {
        id: `participant:${p.id}`,
        kind: "company",
        name: p.name || "Company",
        roleCode: "company",
        roleLabel: p.constitution || roleDef?.label || "Company",
        subtitle: p.constitution,
        badges: companyBadges(p, file),
        entityId: p.entityId || undefined,
        participantId: p.id,
      });
      continue;
    }

    push(groupForRole(role), {
      id: `participant:${p.id}`,
      kind: "contact",
      name: p.name || "Participant",
      roleCode: role,
      roleLabel: getLoanStructureRoleLabel(role),
      subtitle: p.mobile || p.relationship,
      badges: contactBadges(p.entityId),
      entityId: p.entityId || undefined,
      participantId: p.id,
    });
  }

  // Properties
  const propertyOwners = [
    ...(file.primaryPropertyOwner
      ? [{ name: file.customerName || "Primary owner", pct: file.primaryOwnershipPercentage }]
      : []),
    ...participants
      .filter((p) => p.status !== "inactive" && p.isPropertyOwner)
      .map((p) => ({ name: p.name, pct: p.ownershipPercentage })),
  ];
  const hasProperty = Boolean(file.propertyType || file.approxPropertyValue || propertyOwners.length);
  if (hasProperty) {
    const count = Math.max(1, propertyOwners.length || (file.propertyType ? 1 : 0));
    for (let i = 0; i < count; i++) {
      const owner = propertyOwners[i];
      push("properties", {
        id: `property:${file.id}:${i}`,
        kind: "property",
        name:
          count === 1 && file.propertyType
            ? file.propertyType
            : `Property ${i + 1}${file.propertyType && i === 0 ? ` · ${file.propertyType}` : ""}`,
        roleCode: "property",
        roleLabel: "Property",
        subtitle: [
          owner?.name ? `Owner: ${owner.name}` : null,
          file.approxPropertyValue && i === 0 ? formatINR(file.approxPropertyValue) : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Residential / Linked collateral",
        badges: [
          file.propertyType ? String(file.propertyType) : "Linked",
          owner?.pct != null ? `${owner.pct}% ownership` : "Collateral",
        ],
        propertyIndex: i,
      });
    }
  }

  // Existing / active lenders (optional section)
  const lenders = (file.lenders ?? []).filter((l) => l.status === "active");
  for (const lender of lenders) {
    push("existing_lenders", {
      id: `lender:${lender.id}`,
      kind: "lender",
      name: lender.lender || "Lender",
      roleCode: "existing_lender",
      roleLabel: "Active Lender",
      subtitle: lender.product || lender.caseStage,
      badges: [lender.status === "active" ? "Active" : String(lender.status)],
      lenderCaseId: lender.id,
    });
  }

  return listLoanStructureGroups()
    .map((g) => ({
      group: g.group,
      label: g.label,
      cards: byGroup.get(g.group) ?? [],
    }))
    .filter((g) => {
      // Always show borrower; show other groups that have cards OR are core participant groups with empty state
      if (g.group === "borrower") return true;
      if (g.cards.length > 0) return true;
      // Spec: empty sections may show "No records added." for core groups
      return (
        g.group === "co_applicants" ||
        g.group === "guarantors" ||
        g.group === "companies" ||
        g.group === "properties" ||
        g.group === "payee"
      );
    });
}
