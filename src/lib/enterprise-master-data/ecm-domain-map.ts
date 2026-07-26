/**
 * CO-ARCH-001-I6a — Map ECM master domains to Tier 1 Reference Master domains.
 */
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import type { EcmMasterDomain } from "@/constants/enterprise-contact-master/masters";

const ECM_TO_REFERENCE: Partial<Record<EcmMasterDomain, ReferenceMasterDomainCode>> = {
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

/** Tier 1 ECM domains eligible for Reference Master port swap (I6a). */
export const TIER1_ECM_MASTER_DOMAINS = Object.keys(
  ECM_TO_REFERENCE,
) as EcmMasterDomain[];

export function ecmDomainToReferenceDomain(
  domain: EcmMasterDomain,
): ReferenceMasterDomainCode | undefined {
  return ECM_TO_REFERENCE[domain];
}

export function isTier1EcmMasterDomain(domain: EcmMasterDomain): boolean {
  return ECM_TO_REFERENCE[domain] !== undefined;
}
