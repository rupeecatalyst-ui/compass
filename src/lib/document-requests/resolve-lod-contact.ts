/**
 * CO-CATALYST-ONE-REFINEMENT-002 — LOD contact readiness via Loan Structure.
 * Resolves human communication channels without mutating company records.
 */

import type { EnterpriseBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import type { LoanParticipant, LoanParticipantRole } from "@/types/loan-participant";

export type LodContactSource =
  | "primary_contact"
  | "opportunity_stamp"
  | "contact_registry"
  | "loan_structure"
  | "lead_case_file";

export type LodResolvedContact = {
  name: string;
  mobile: string;
  email: string;
  source: LodContactSource;
  participantId?: string;
  participantRole?: LoanParticipantRole;
};

export type ResolveLodContactInput = {
  borrower?: EnterpriseBorrowerIdentity | null;
  participants?: LoanParticipant[];
  contactRegistry?: {
    mobile?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
  leadCaseFile?: {
    customerMobile?: string | null;
    customerEmail?: string | null;
    customerName?: string | null;
  } | null;
};

export type LodContactReadiness = {
  ready: boolean;
  contact: LodResolvedContact | null;
  missingChannels: ("mobile" | "email")[];
  isCompanyBorrower: boolean;
};

const INELIGIBLE_ROLES = new Set<LoanParticipantRole>(["company", "payee"]);

function trim(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLodMobile(value: string | null | undefined): string {
  const raw = trim(value);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : "";
}

export function normalizeLodEmail(value: string | null | undefined): string {
  const raw = trim(value);
  if (!raw) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : "";
}

function hasValidLodChannels(mobile: string, email: string): boolean {
  return Boolean(normalizeLodMobile(mobile) && normalizeLodEmail(email));
}

function pickContact(
  name: string,
  mobile: string | undefined | null,
  email: string | undefined | null,
  source: LodContactSource,
  extras?: Pick<LodResolvedContact, "participantId" | "participantRole">,
): LodResolvedContact | null {
  const normalizedMobile = normalizeLodMobile(mobile);
  const normalizedEmail = normalizeLodEmail(email);
  if (!normalizedMobile || !normalizedEmail) return null;
  return {
    name: name || "Authorised contact",
    mobile: normalizedMobile,
    email: normalizedEmail,
    source,
    ...extras,
  };
}

function isDirectorLikeRelationship(relationship?: string | null): boolean {
  const value = trim(relationship).toLowerCase();
  if (!value) return false;
  return /director|promoter|partner|proprietor|signatory|authorised|authorized/.test(
    value,
  );
}

function isEligibleHumanParticipant(participant: LoanParticipant): boolean {
  if (participant.status === "inactive") return false;
  if (participant.entityType !== "individual") return false;
  const role = participant.role ?? "other";
  return !INELIGIBLE_ROLES.has(role);
}

function participantPriority(participant: LoanParticipant): number {
  const role = participant.role ?? "other";
  const base: Record<LoanParticipantRole, number> = {
    authorized_signatory: 10,
    primary_applicant: 20,
    income_contributor: 30,
    co_applicant: 40,
    guarantor: 50,
    other: 60,
    payee: 99,
    company: 99,
  };
  const score = base[role] ?? 70;
  return isDirectorLikeRelationship(participant.relationship) ? score - 5 : score;
}

function sortEligibleParticipants(participants: LoanParticipant[]): LoanParticipant[] {
  return participants
    .filter(isEligibleHumanParticipant)
    .slice()
    .sort((a, b) => {
      const priorityDelta = participantPriority(a) - participantPriority(b);
      if (priorityDelta !== 0) return priorityDelta;
      return a.name.localeCompare(b.name);
    });
}

function resolveFromParticipants(
  participants: LoanParticipant[],
): LodResolvedContact | null {
  for (const participant of sortEligibleParticipants(participants)) {
    const resolved = pickContact(
      participant.name,
      participant.mobile,
      participant.email,
      "loan_structure",
      {
        participantId: participant.id,
        participantRole: participant.role,
      },
    );
    if (resolved) return resolved;
  }
  return null;
}

function resolveIndividualBorrowerContact(
  input: ResolveLodContactInput,
): LodResolvedContact | null {
  const borrower = input.borrower;
  const fromBorrower = pickContact(
    borrower?.primaryContactName || borrower?.displayName || "",
    borrower?.primaryContactMobile,
    borrower?.primaryContactEmail,
    borrower?.primaryContactId ? "primary_contact" : "opportunity_stamp",
  );
  if (fromBorrower) return fromBorrower;

  const fromRegistry = pickContact(
    input.contactRegistry?.name || borrower?.displayName || "",
    input.contactRegistry?.mobile,
    input.contactRegistry?.email,
    "contact_registry",
  );
  if (fromRegistry) return fromRegistry;

  const fromLead = pickContact(
    input.leadCaseFile?.customerName || borrower?.displayName || "",
    input.leadCaseFile?.customerMobile,
    input.leadCaseFile?.customerEmail,
    "lead_case_file",
  );
  if (fromLead) return fromLead;

  const participants = input.participants ?? [];
  const primaryApplicant = participants.find(
    (participant) =>
      participant.role === "primary_applicant" && isEligibleHumanParticipant(participant),
  );
  if (primaryApplicant) {
    const resolved = pickContact(
      primaryApplicant.name,
      primaryApplicant.mobile,
      primaryApplicant.email,
      "loan_structure",
      {
        participantId: primaryApplicant.id,
        participantRole: primaryApplicant.role,
      },
    );
    if (resolved) return resolved;
  }

  return resolveFromParticipants(participants);
}

function resolveCompanyBorrowerContact(
  input: ResolveLodContactInput,
): LodResolvedContact | null {
  const borrower = input.borrower;

  if (borrower?.primaryContactId) {
    const fromPrimary = pickContact(
      borrower.primaryContactName || borrower.displayName || "",
      borrower.primaryContactMobile,
      borrower.primaryContactEmail,
      "primary_contact",
    );
    if (fromPrimary) return fromPrimary;
  }

  const fromStamp = pickContact(
    borrower?.primaryContactName || borrower?.displayName || "",
    borrower?.primaryContactMobile,
    borrower?.primaryContactEmail,
    "opportunity_stamp",
  );
  if (fromStamp) return fromStamp;

  const fromStructure = resolveFromParticipants(input.participants ?? []);
  if (fromStructure) return fromStructure;

  return null;
}

/**
 * Resolve the human contact used for LOD communication readiness.
 * Never copies person contact into company records.
 */
export function resolveLodContact(
  input: ResolveLodContactInput,
): LodResolvedContact | null {
  const isCompanyBorrower = input.borrower?.kind === "company";
  if (isCompanyBorrower) {
    return resolveCompanyBorrowerContact(input);
  }
  return resolveIndividualBorrowerContact(input);
}

export function resolveLodContactReadiness(
  input: ResolveLodContactInput,
): LodContactReadiness {
  const isCompanyBorrower = input.borrower?.kind === "company";
  const contact = resolveLodContact(input);
  const missingChannels: ("mobile" | "email")[] = [];

  if (!contact) {
    const probes: Array<{ mobile?: string | null; email?: string | null }> = [];

    if (input.borrower) {
      probes.push({
        mobile: input.borrower.primaryContactMobile,
        email: input.borrower.primaryContactEmail,
      });
    }
    if (input.contactRegistry) {
      probes.push({
        mobile: input.contactRegistry.mobile,
        email: input.contactRegistry.email,
      });
    }
    if (input.leadCaseFile) {
      probes.push({
        mobile: input.leadCaseFile.customerMobile,
        email: input.leadCaseFile.customerEmail,
      });
    }
    for (const participant of sortEligibleParticipants(input.participants ?? [])) {
      probes.push({ mobile: participant.mobile, email: participant.email });
    }

    const hasAnyoneWithBoth = probes.some((probe) =>
      hasValidLodChannels(probe.mobile ?? "", probe.email ?? ""),
    );
    if (!hasAnyoneWithBoth) {
      const hasAnyMobile = probes.some((probe) => normalizeLodMobile(probe.mobile));
      const hasAnyEmail = probes.some((probe) => normalizeLodEmail(probe.email));
      if (!hasAnyMobile) missingChannels.push("mobile");
      if (!hasAnyEmail) missingChannels.push("email");
      if (hasAnyMobile && hasAnyEmail) {
        if (!missingChannels.includes("mobile")) missingChannels.push("mobile");
        if (!missingChannels.includes("email")) missingChannels.push("email");
      }
    }
  }

  return {
    ready: Boolean(contact),
    contact,
    missingChannels,
    isCompanyBorrower,
  };
}

export function buildLodContactGapMessage(isCompanyBorrower: boolean): string {
  if (isCompanyBorrower) {
    return "Add a mobile number and email address for an authorised person in the Loan Structure to enable LOD communication.";
  }
  return "Please complete: Mobile Number, Email Address.";
}
