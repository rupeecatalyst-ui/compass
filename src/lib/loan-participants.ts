import type { LoanFile } from "@/types/catalyst-one";
import type { LoanParticipant, LoanParticipantEntityType, ParticipantEntityOption } from "@/types/loan-participant";
import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import { ORGANIZATION_REGISTRY } from "@/data/catalyst-one/organization-registry-seed";
import { MAX_LOAN_PARTICIPANTS } from "@/types/loan-participant";

export function createParticipantId(): string {
  return `lp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Build searchable entity options from customer seed and organization registry. */
export function buildDefaultParticipantEntityOptions(): ParticipantEntityOption[] {
  const individuals: ParticipantEntityOption[] = CUSTOMER_SEED.map((c) => ({
    id: c.id,
    name: c.name,
    mobile: c.mobile,
    email: c.email,
    entityType: "individual" as const,
  }));

  const companies: ParticipantEntityOption[] = ORGANIZATION_REGISTRY.map((o) => ({
    id: o.id,
    name: o.name,
    entityType: "company" as const,
    constitution: o.type.toUpperCase(),
  }));

  return [...individuals, ...companies];
}

export function searchParticipantEntities(
  query: string,
  options: ParticipantEntityOption[],
  entityType?: LoanParticipantEntityType,
): ParticipantEntityOption[] {
  const q = query.trim().toLowerCase();
  return options.filter((option) => {
    if (entityType && option.entityType !== entityType) return false;
    if (!q) return true;
    return (
      option.name.toLowerCase().includes(q) ||
      option.mobile?.toLowerCase().includes(q) ||
      option.email?.toLowerCase().includes(q)
    );
  });
}

export function getParticipantRowLabel(
  participant: LoanParticipant,
  participants: LoanParticipant[],
): string {
  const sameType = participants.filter((p) => p.entityType === participant.entityType);
  const index = sameType.findIndex((p) => p.id === participant.id) + 1;
  return participant.entityType === "company" ? `Company ${index}` : `Co Applicant ${index}`;
}

/** Migrate legacy co-applicant / company fields into participants array. */
export function resolveLoanParticipants(file: LoanFile): LoanParticipant[] {
  if (file.participants?.length) return [...file.participants];

  const migrated: LoanParticipant[] = [];

  if (file.coApplicantId || file.coApplicant) {
    migrated.push({
      id: createParticipantId(),
      entityType: "individual",
      entityId: file.coApplicantId ?? "",
      name: file.coApplicant ?? "",
      role: "co_applicant",
      status: "active",
    });
  }

  if (file.businessDetails?.companyName) {
    migrated.push({
      id: createParticipantId(),
      entityType: "company",
      entityId: file.btInstitutionId ?? createParticipantId(),
      name: file.businessDetails.companyName,
      constitution: file.businessDetails.constitution,
      role: "company",
      status: "active",
    });
  }

  return migrated.slice(0, MAX_LOAN_PARTICIPANTS);
}

/** Keep legacy fields in sync for read-only surfaces (detail sheet, seeds). */
export function syncParticipantLegacyFields(
  participants: LoanParticipant[],
  existing?: LoanFileBusinessLike,
): {
  participants: LoanParticipant[];
  coApplicant?: string;
  coApplicantId?: string;
  guarantor?: undefined;
  guarantorId?: undefined;
  businessDetails?: LoanFileBusinessLike;
} {
  const individuals = participants.filter((p) => p.entityType === "individual");
  const companies = participants.filter((p) => p.entityType === "company");
  const primaryCo = individuals[0];
  const primaryCompany = companies[0];

  const businessDetails = existing
    ? {
        ...existing,
        companyName: primaryCompany?.name,
        constitution: primaryCompany?.constitution,
        gst: undefined,
      }
    : primaryCompany
      ? {
          companyName: primaryCompany.name,
          constitution: primaryCompany.constitution,
        }
      : undefined;

  return {
    participants: participants.slice(0, MAX_LOAN_PARTICIPANTS),
    coApplicant: primaryCo?.name,
    coApplicantId: primaryCo?.entityId || undefined,
    guarantor: undefined,
    guarantorId: undefined,
    businessDetails,
  };
}

interface LoanFileBusinessLike {
  companyName?: string;
  constitution?: string;
  gst?: string;
  annualTurnover?: number;
  businessVintage?: number;
  monthlySalary?: number;
  annualProfit?: number;
  annualGrossReceipts?: number;
  annualProfessionalIncome?: number;
}

export function mapContactOptionsToParticipantEntities(
  contacts: Array<{ id: string; name: string; mobile?: string; email?: string }>,
): ParticipantEntityOption[] {
  const fromContacts = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    mobile: c.mobile,
    email: c.email,
    entityType: "individual" as const,
  }));
  const companyOptions = ORGANIZATION_REGISTRY.map((o) => ({
    id: o.id,
    name: o.name,
    entityType: "company" as const,
    constitution: o.type.toUpperCase(),
  }));
  const seen = new Set<string>();
  return [...fromContacts, ...companyOptions].filter((o) => {
    const key = `${o.entityType}:${o.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
