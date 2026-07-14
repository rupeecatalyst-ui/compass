/**
 * Prompt 012 — Enterprise Company Registry & Company↔Contact relationships.
 * Parallel to ECM Contact Registry (individuals only).
 */

export type EcmCompanyStatus = "active" | "archived";

export type EcmCompanyRelationRole =
  | "director"
  | "promoter"
  | "partner"
  | "authorized_signatory"
  | "cfo"
  | "company_secretary"
  | "proprietor"
  | "shareholder"
  | "other";

export interface EcmCompanyIdentity {
  companyName: string;
  constitution?: string;
  cin?: string;
  pan?: string;
  gst?: string;
  dateOfIncorporation?: string;
  registeredAddress?: string;
}

export interface EcmCompanyBusinessProfile {
  industry?: string;
  natureOfBusiness?: string;
  yearsInBusiness?: string;
  annualTurnover?: string;
  approximateNetProfit?: string;
  employeeStrength?: string;
  website?: string;
}

export interface EcmCompany {
  id: string;
  companyName: string;
  constitution?: string;
  cin?: string;
  pan?: string;
  gst?: string;
  dateOfIncorporation?: string;
  registeredAddress?: string;
  industry?: string;
  natureOfBusiness?: string;
  yearsInBusiness?: string;
  annualTurnover?: string;
  approximateNetProfit?: string;
  employeeStrength?: string;
  website?: string;
  status: EcmCompanyStatus;
  enabled: boolean;
  ownerName?: string;
  ownerId?: string;
  companyScore: number;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EcmCompanyContactLink {
  id: string;
  companyId: string;
  contactId: string;
  relationRole: EcmCompanyRelationRole;
  status: "active" | "inactive";
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EcmCompanyRegisterInput {
  companyName: string;
  constitution?: string;
  cin?: string;
  pan?: string;
  gst?: string;
  dateOfIncorporation?: string;
  registeredAddress?: string;
  industry?: string;
  natureOfBusiness?: string;
  yearsInBusiness?: string;
  annualTurnover?: string;
  approximateNetProfit?: string;
  employeeStrength?: string;
  website?: string;
  status?: EcmCompanyStatus;
  ownerName?: string;
  ownerId?: string;
  createdBy: string;
}

export interface EcmCompanyQuery {
  search?: string;
  status?: EcmCompanyStatus | "all";
  page?: number;
  pageSize?: number;
}

export interface EcmCompanyQueryResult {
  items: EcmCompany[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EcmCompanyReadiness {
  identityPct: number;
  businessPct: number;
  relationshipPct: number;
  overallPct: number;
  identityComplete: boolean;
  businessComplete: boolean;
  relationshipsPresent: boolean;
}

export type DirectoryEntityKind = "contact" | "company";

export interface DirectoryListRow {
  id: string;
  kind: DirectoryEntityKind;
  name: string;
  subtitle: string;
  status: string;
  ownerName?: string;
  score: number;
  modifiedOn: string;
}
