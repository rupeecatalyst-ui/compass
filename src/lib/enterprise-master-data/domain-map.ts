/**
 * CO-ARCH-001-I5a — Map Tier 1 Reference Master domains to ECM master catalogs.
 */
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import type { EcmMasterDomain } from "@/constants/enterprise-contact-master/masters";

const REFERENCE_TO_ECM: Partial<Record<ReferenceMasterDomainCode, EcmMasterDomain>> = {
  country: "country",
  state: "state",
  city: "city",
  industry: "industry",
  nature_of_business: "nature_of_business",
  constitution: "constitution",
  employment_type: "employment_type",
  occupation: "occupation",
  loan_purpose: "loan_purpose",
  department: "department",
  designation: "designation",
  channel_type: "channel_type",
  partner_category: "partner_category",
  resident_status: "resident_status",
  risk_appetite: "risk_appetite",
  investment_horizon: "investment_horizon",
  specialization: "specialization",
};

export function referenceDomainToEcmDomain(
  domain: ReferenceMasterDomainCode,
): EcmMasterDomain {
  const mapped = REFERENCE_TO_ECM[domain];
  if (!mapped) {
    throw new Error(`Reference domain "${domain}" has no ECM catalog mapping.`);
  }
  return mapped;
}
