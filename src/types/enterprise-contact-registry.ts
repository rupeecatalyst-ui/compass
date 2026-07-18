/**
 * CO-SPRINT-094 — Contact Registry row projection for Enterprise Table Standard.
 */

import type { EcmContact, EcmContactRole, EcmContactStatus } from "@/types/enterprise-contact-master";

export interface ContactRegistryRow {
  id: string;
  contactId: string;
  name: string;
  contactType: string;
  contactTypeRole: EcmContactRole;
  mobile: string;
  email: string;
  city: string;
  state: string;
  assignedRm: string;
  activeOpportunities: number;
  contactScore: number;
  strategicContact: boolean;
  lastInteraction: string;
  lastInteractionAt: string;
  dateCreated: string;
  dateCreatedAt: string;
  status: EcmContactStatus;
  companyName: string;
  source: string;
  panStatus: string;
  aadhaarStatus: string;
  lastModified: string;
  lastModifiedAt: string;
  tags: string;
  loanRequirement: string;
  productInterest: string;
  customerStage: string;
  /** Underlying contact for workspace open / strategic toggle */
  contact: EcmContact;
}

export const CONTACT_REGISTRY_PAGE_SIZES = [20, 50, 100] as const;

export type ContactRegistrySortField =
  | "contactId"
  | "name"
  | "contactType"
  | "mobile"
  | "city"
  | "assignedRm"
  | "activeOpportunities"
  | "contactScore"
  | "strategicContact"
  | "lastInteractionAt"
  | "dateCreatedAt"
  | "status"
  | "email"
  | "companyName"
  | "source"
  | "panStatus"
  | "aadhaarStatus"
  | "lastModifiedAt"
  | "tags"
  | "loanRequirement"
  | "productInterest"
  | "customerStage";

export interface ContactRegistryFilters {
  search: string;
  contactType: "all" | EcmContactRole;
  city: string;
  state: string;
  assignedRm: string;
  status: "all" | EcmContactStatus;
  strategic: "all" | "yes" | "no";
  dateCreatedFrom: string;
  dateCreatedTo: string;
  lastInteractionFrom: string;
  lastInteractionTo: string;
  scoreMin: string;
  scoreMax: string;
  columnName: string;
  columnMobile: string;
}

export const EMPTY_CONTACT_REGISTRY_FILTERS: ContactRegistryFilters = {
  search: "",
  contactType: "all",
  city: "all",
  state: "all",
  assignedRm: "all",
  status: "all",
  strategic: "all",
  dateCreatedFrom: "",
  dateCreatedTo: "",
  lastInteractionFrom: "",
  lastInteractionTo: "",
  scoreMin: "",
  scoreMax: "",
  columnName: "",
  columnMobile: "",
};
